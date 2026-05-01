import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { revalidateIncomeAffectedPaths } from "@/lib/revalidate";
import { incomeSchema } from "@/lib/validators";
import { deleteIncome, updateIncome } from "@/server/services/factory";

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
    const parsed = incomeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Datos de venta invalidos." }, { status: 400 });
    }

    const { id } = await params;
    await updateIncome(id, parsed.data);
    revalidateIncomeAffectedPaths();

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo actualizar la venta." },
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
    await deleteIncome(id);
    revalidateIncomeAffectedPaths();
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo eliminar la venta." },
      { status: 500 },
    );
  }
}
