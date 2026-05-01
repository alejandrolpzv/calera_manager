import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { clientSchema } from "@/lib/validators";
import { updateClient } from "@/server/services/factory";

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
    const parsed = clientSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Datos de cliente invalidos." }, { status: 400 });
    }

    const { id } = await params;
    await updateClient(id, parsed.data);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo actualizar el cliente." },
      { status: 500 },
    );
  }
}
