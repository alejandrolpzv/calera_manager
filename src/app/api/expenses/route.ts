import { NextResponse } from "next/server";

import { canCreateRecords } from "@/lib/permissions";
import { getSession } from "@/lib/auth";
import { expenseSchema } from "@/lib/validators";
import { createExpense } from "@/server/services/factory";

export async function POST(request: Request) {
  const session = await getSession();

  if (!session || !canCreateRecords(session.role)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = expenseSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Datos de gasto invalidos." }, { status: 400 });
    }

    await createExpense({
      ...parsed.data,
      createdById: session.userId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo guardar el gasto." },
      { status: 500 },
    );
  }
}
