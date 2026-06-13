import { endOfDay, format, startOfWeek } from "date-fns";
import { NextResponse } from "next/server";

import { formatCurrency, formatNumber } from "@/lib/utils";
import { getReportData } from "@/server/services/factory";

export const runtime = "nodejs";

function inputDate(value: Date) {
  return format(value, "yyyy-MM-dd");
}

function escapeHtml(value: string | number | null | undefined) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function metricCard(label: string, value: string, tone = "#0f766e") {
  return `
    <td style="padding:10px;width:50%;">
      <div style="border:1px solid #e2e8f0;border-radius:18px;padding:16px;background:#ffffff;">
        <p style="margin:0 0 8px;color:#64748b;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">${escapeHtml(label)}</p>
        <p style="margin:0;color:${tone};font-size:24px;font-weight:900;">${escapeHtml(value)}</p>
      </div>
    </td>
  `;
}

function tableRows(rows: string[][]) {
  return rows
    .map(
      (row) => `
        <tr>
          ${row.map((cell) => `<td style="border-top:1px solid #e2e8f0;padding:9px;font-size:13px;color:#334155;">${escapeHtml(cell)}</td>`).join("")}
        </tr>
      `,
    )
    .join("");
}

function buildEmailHtml(report: Awaited<ReturnType<typeof getReportData>>) {
  const pendingTotal = report.income.reduce((sum, item) => sum + (item.balanceDue || 0), 0);
  const collectionRate = report.summary.totalSales > 0
    ? (report.summary.totalIncome / report.summary.totalSales) * 100
    : 0;
  const topExpenses = report.expenses.slice(0, 12);
  const topIncome = report.income.slice(0, 10);
  const rawMaterialLines = report.expenses.flatMap((expense) =>
    (expense.rawMaterialLines || []).map((line) => ({
      expense,
      line,
    })),
  );

  return `
    <div style="background:#f8fafc;padding:24px;font-family:Arial,sans-serif;color:#0f172a;">
      <div style="max-width:760px;margin:0 auto;">
        <div style="border-radius:26px;background:#083b36;color:white;padding:24px;">
          <p style="margin:0 0 8px;color:#5eead4;font-size:12px;font-weight:800;letter-spacing:3px;text-transform:uppercase;">Estado semanal de planta</p>
          <h1 style="margin:0;font-size:28px;line-height:1.1;">Reporte semanal automatico</h1>
          <p style="margin:12px 0 0;color:#ccfbf1;">Rango: ${escapeHtml(report.from)} a ${escapeHtml(report.to)}</p>
        </div>

        <table role="presentation" style="border-collapse:collapse;width:100%;margin-top:14px;">
          <tr>
            ${metricCard("Ventas facturadas", formatCurrency(report.summary.totalSales))}
            ${metricCard("Cobrado", formatCurrency(report.summary.totalIncome))}
          </tr>
          <tr>
            ${metricCard("Pendiente", formatCurrency(pendingTotal), "#b45309")}
            ${metricCard("Gastos", formatCurrency(report.summary.totalExpenses), "#b45309")}
          </tr>
          <tr>
            ${metricCard("Utilidad caja", formatCurrency(report.summary.profit), report.summary.profit >= 0 ? "#0f766e" : "#be123c")}
            ${metricCard("Produccion", `${formatNumber(report.summary.totalProduction)} sacos`)}
          </tr>
          <tr>
            ${metricCard("Costo / unidad", formatCurrency(report.summary.costPerUnit))}
            ${metricCard("Cobranza", `${formatNumber(collectionRate)}%`)}
          </tr>
        </table>

        <div style="border:1px solid #fde68a;border-radius:22px;background:#fffbeb;padding:18px;margin-top:16px;">
          <p style="margin:0 0 10px;color:#92400e;font-size:12px;font-weight:800;letter-spacing:2px;text-transform:uppercase;">Materia prima</p>
          <p style="margin:0;color:#78350f;font-size:15px;">
            Piedra registrada: <strong>${formatNumber(report.summary.rawMaterialTrips || 0)} viajes</strong>,
            <strong>${formatNumber(report.summary.rawMaterialPounds || 0)} lb</strong>.
            Produccion esperada: <strong>${formatNumber(report.summary.expectedProductionFromStone || 0)} sacos</strong>.
            Diferencia: <strong>${formatNumber(report.summary.productionVarianceFromStone || 0)} sacos</strong>.
          </p>
        </div>

        <div style="border-radius:22px;background:white;border:1px solid #e2e8f0;padding:18px;margin-top:16px;">
          <h2 style="margin:0 0 10px;font-size:18px;">Gastos principales</h2>
          <table style="border-collapse:collapse;width:100%;">
            <thead>
              <tr>
                <th style="text-align:left;padding:9px;font-size:12px;color:#64748b;">Categoria</th>
                <th style="text-align:left;padding:9px;font-size:12px;color:#64748b;">Descripcion</th>
                <th style="text-align:right;padding:9px;font-size:12px;color:#64748b;">Monto</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows(topExpenses.map((item) => [item.category, item.description, formatCurrency(item.amount)]))}
            </tbody>
          </table>
        </div>

        <div style="border-radius:22px;background:white;border:1px solid #e2e8f0;padding:18px;margin-top:16px;">
          <h2 style="margin:0 0 10px;font-size:18px;">Ventas principales</h2>
          <table style="border-collapse:collapse;width:100%;">
            <thead>
              <tr>
                <th style="text-align:left;padding:9px;font-size:12px;color:#64748b;">Cliente</th>
                <th style="text-align:left;padding:9px;font-size:12px;color:#64748b;">Producto</th>
                <th style="text-align:right;padding:9px;font-size:12px;color:#64748b;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows(topIncome.map((item) => [item.clientName, item.productName, formatCurrency(item.total)]))}
            </tbody>
          </table>
        </div>

        ${rawMaterialLines.length ? `
          <div style="border-radius:22px;background:white;border:1px solid #e2e8f0;padding:18px;margin-top:16px;">
            <h2 style="margin:0 0 10px;font-size:18px;">Piedra consumida</h2>
            <table style="border-collapse:collapse;width:100%;">
              <thead>
                <tr>
                  <th style="text-align:left;padding:9px;font-size:12px;color:#64748b;">Gasto</th>
                  <th style="text-align:right;padding:9px;font-size:12px;color:#64748b;">Viajes</th>
                  <th style="text-align:right;padding:9px;font-size:12px;color:#64748b;">Lb total</th>
                  <th style="text-align:right;padding:9px;font-size:12px;color:#64748b;">Esperado</th>
                </tr>
              </thead>
              <tbody>
                ${tableRows(rawMaterialLines.map(({ expense, line }) => [
                  expense.description,
                  formatNumber(line.trips),
                  formatNumber(line.totalPounds),
                  `${formatNumber(line.expectedProductionUnits)} sacos`,
                ]))}
              </tbody>
            </table>
          </div>
        ` : ""}

        <p style="margin:18px 0 0;color:#64748b;font-size:12px;">
          Este reporte es automatico. Para ver el detalle completo, entra al sistema y abre Reportes.
        </p>
      </div>
    </div>
  `;
}

async function sendEmail({ subject, html }: { subject: string; html: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.WEEKLY_REPORT_EMAIL || "alejandrolpzv@gmail.com";
  const from = process.env.REPORT_FROM_EMAIL || "Sistema de Fabrica <onboarding@resend.dev>";

  if (!apiKey) {
    throw new Error("Falta RESEND_API_KEY.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Resend rechazo el correo: ${errorText}`);
  }
}

export async function POST(request: Request) {
  const expectedSecret = process.env.CRON_SECRET;
  const receivedSecret = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (!expectedSecret || receivedSecret !== expectedSecret) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const now = new Date();
    const from = inputDate(startOfWeek(now, { weekStartsOn: 1 }));
    const to = inputDate(endOfDay(now));
    const report = await getReportData(from, to, { reportType: "all" });

    await sendEmail({
      subject: `Reporte semanal de planta | ${from} a ${to}`,
      html: buildEmailHtml(report),
    });

    return NextResponse.json({
      success: true,
      from,
      to,
      sentTo: process.env.WEEKLY_REPORT_EMAIL || "alejandrolpzv@gmail.com",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo enviar el reporte." },
      { status: 500 },
    );
  }
}
