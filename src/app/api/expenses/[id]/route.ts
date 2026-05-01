import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { expenseSchema } from "@/lib/validators";
import { deleteExpense, updateExpense } from "@/server/services/factory";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();

  if (!session || session.role !== UserRole.ADMIN) {
    return NextResponse.json({ error: "Se requiere acceso de administrador." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = expenseSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Datos de gasto invalidos." }, { status: 400 });
    }

    const { id } = await params;
    await updateExpense(id, parsed.data);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo actualizar el gasto." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();

  if (!session || session.role !== UserRole.ADMIN) {
    return NextResponse.json({ error: "Se requiere acceso de administrador." }, { status: 403 });
  }

  try {
    const { id } = await params;
    await deleteExpense(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo eliminar el gasto." },
      { status: 500 },
    );
  }
}
