import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { productSchema } from "@/lib/validators";
import { deleteProduct, updateProduct } from "@/server/services/factory";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();

  if (!session || session.role !== UserRole.ADMIN) {
    return NextResponse.json({ error: "Se requiere acceso de administrador." }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = productSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Datos de producto invalidos." }, { status: 400 });
    }

    await updateProduct(id, parsed.data);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo actualizar el producto." },
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
    await deleteProduct(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo eliminar el producto." },
      { status: 500 },
    );
  }
}
