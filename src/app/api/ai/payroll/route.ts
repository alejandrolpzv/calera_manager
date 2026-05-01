import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getSession } from "@/lib/auth";
import { canCreateRecords } from "@/lib/permissions";

const payrollImageResultSchema = z.object({
  summary: z.string(),
  warnings: z.array(z.string()),
  payrollLines: z.array(
    z.object({
      employeeName: z.string(),
      amount: z.number().nonnegative(),
      notes: z.string(),
    }),
  ),
});

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Configura OPENAI_API_KEY para usar la lectura inteligente de planilla.");
  }

  return new OpenAI({ apiKey });
}

function toDataUrl(buffer: ArrayBuffer, mimeType: string) {
  return `data:${mimeType};base64,${Buffer.from(buffer).toString("base64")}`;
}

export async function POST(request: Request) {
  const session = await getSession();

  if (!session || !canCreateRecords(session.role)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const image = formData.get("image");
    const context = String(formData.get("context") || "").trim();

    if (!(image instanceof File)) {
      return NextResponse.json({ error: "Sube una imagen valida." }, { status: 400 });
    }

    if (!image.type.startsWith("image/")) {
      return NextResponse.json({ error: "El archivo debe ser una imagen." }, { status: 400 });
    }

    if (image.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "La imagen es demasiado grande. Usa una foto de hasta 10 MB." },
        { status: 400 },
      );
    }

    const client = getOpenAIClient();
    const imageUrl = toDataUrl(await image.arrayBuffer(), image.type);
    const model = process.env.OPENAI_PAYROLL_MODEL || "gpt-4.1-mini";

    const response = await client.responses.parse({
      model,
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text:
                "Eres un asistente de extraccion de planillas para una fabrica de carbonato de calcio en Honduras. Lee imagenes de planillas escritas a mano. Extrae una lista por empleado con nombre, monto en lempiras y notas. Si algo no es legible, menciónalo en warnings. No inventes empleados ni montos. Devuelve montos numericos.",
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: context
                ? `Contexto adicional del usuario: ${context}`
                : "Analiza esta foto de planilla y arma el desglose.",
            },
            {
              type: "input_image",
              image_url: imageUrl,
              detail: "high",
            },
          ],
        },
      ],
      text: {
        format: zodTextFormat(payrollImageResultSchema, "payroll_breakdown"),
      },
    });

    const result = response.output_parsed;

    if (!result || result.payrollLines.length === 0) {
      return NextResponse.json(
        { error: "La IA no pudo detectar un desglose claro en la imagen. Prueba con una foto mas nítida." },
        { status: 422 },
      );
    }

    return NextResponse.json({ result });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo analizar la planilla con IA.",
      },
      { status: 500 },
    );
  }
}
