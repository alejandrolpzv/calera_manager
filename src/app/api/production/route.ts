import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { canCreateRecords } from "@/lib/permissions";
import { productionSchema } from "@/lib/validators";
import { createProduction } from "@/server/services/factory";

export async function POST(request: Request) {
  const session = await getSession();

  if (!session || !canCreateRecords(session.role)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = productionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Datos de produccion invalidos." }, { status: 400 });
    }

    await createProduction({
      ...parsed.data,
      createdById: session.userId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo guardar la produccion." },
      { status: 500 },
    );
  }
}
