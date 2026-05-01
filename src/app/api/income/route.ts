import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { canCreateRecords } from "@/lib/permissions";
import { revalidateIncomeAffectedPaths } from "@/lib/revalidate";
import { incomeSchema } from "@/lib/validators";
import { createIncome } from "@/server/services/factory";

export async function POST(request: Request) {
  const session = await getSession();

  if (!session || !canCreateRecords(session.role)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = incomeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Datos de venta invalidos." }, { status: 400 });
    }

    await createIncome({
      ...parsed.data,
      createdById: session.userId,
    });
    revalidateIncomeAffectedPaths();

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo guardar la venta." },
      { status: 500 },
    );
  }
}
