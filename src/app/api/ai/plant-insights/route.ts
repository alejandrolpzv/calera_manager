import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getSession } from "@/lib/auth";
import { getReportData } from "@/server/services/factory";

const requestSchema = z.object({
  from: z.string().min(8),
  to: z.string().min(8),
});

const plantInsightsSchema = z.object({
  executiveSummary: z.string(),
  financialOpinion: z.string(),
  costOpinion: z.string(),
  operationalOpinion: z.string(),
  risks: z.array(z.string()),
  opportunities: z.array(z.string()),
  recommendedActions: z.array(z.string()),
});

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Configura OPENAI_API_KEY para usar el analisis ejecutivo con IA.");
  }

  return new OpenAI({ apiKey });
}

function sumBy<T>(records: T[], getKey: (record: T) => string, getValue: (record: T) => number) {
  return Object.values(
    records.reduce<Record<string, { name: string; value: number }>>((acc, record) => {
      const name = getKey(record) || "Sin clasificar";
      const key = name.trim().toLowerCase();

      if (!acc[key]) {
        acc[key] = { name, value: 0 };
      }

      acc[key].value += getValue(record);
      return acc;
    }, {}),
  ).sort((a, b) => b.value - a.value);
}

export async function POST(request: Request) {
  const session = await getSession();

  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const parsed = requestSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json({ error: "Rango de fechas invalido." }, { status: 400 });
    }

    const report = await getReportData(parsed.data.from, parsed.data.to);
    const totalSales = report.summary.totalSales;
    const totalCollected = report.summary.totalIncome;
    const pendingTotal = report.income.reduce((sum, item) => sum + (item.balanceDue || 0), 0);
    const collectionRate = totalSales > 0 ? (totalCollected / totalSales) * 100 : 0;
    const expensesByCategory = sumBy(report.expenses, (item) => item.category, (item) => item.amount);
    const productionByProduct = sumBy(report.production, (item) => item.productName, (item) => item.quantity);
    const lowStock = report.inventory
      .filter((item) => item.quantity <= 10)
      .map((item) => ({
        product: item.productName,
        quantity: item.quantity,
        unitType: item.unitType,
      }));

    const client = getOpenAIClient();
    const model = process.env.OPENAI_ANALYST_MODEL || "gpt-4.1-mini";

    const response = await client.responses.parse({
      model,
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text:
                "Eres un analista financiero y operativo externo para una planta pequena de carbonato de calcio en Honduras. Da opiniones practicas, prudentes y accionables. No inventes datos. Distingue claramente ventas facturadas de dinero cobrado. Habla en espanol claro para un dueno/gerente.",
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: JSON.stringify({
                rango: { desde: report.from, hasta: report.to },
                resumen: {
                  ventasFacturadas: totalSales,
                  cobrado: totalCollected,
                  pendienteCobro: pendingTotal,
                  porcentajeCobranza: collectionRate,
                  gastos: report.summary.totalExpenses,
                  utilidadCaja: report.summary.profit,
                  produccion: report.summary.totalProduction,
                  costoPorUnidad: report.summary.costPerUnit,
                },
                gastosPorCategoria: expensesByCategory.slice(0, 8),
                produccionPorProducto: productionByProduct.slice(0, 8),
                cuentasPendientes: report.income
                  .filter((item) => (item.balanceDue || 0) > 0)
                  .slice(0, 8)
                  .map((item) => ({
                    cliente: item.clientName,
                    factura: item.invoiceNumber || item.referenceCode || "Sin referencia",
                    total: item.total,
                    pagado: item.amountPaid || 0,
                    saldo: item.balanceDue || 0,
                  })),
                stockBajo: lowStock.slice(0, 8),
              }),
            },
          ],
        },
      ],
      text: {
        format: zodTextFormat(plantInsightsSchema, "plant_insights"),
      },
    });

    return NextResponse.json({ result: response.output_parsed });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo generar el analisis ejecutivo con IA.",
      },
      { status: 500 },
    );
  }
}
