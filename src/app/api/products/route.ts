import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { productSchema } from "@/lib/validators";
import { createProduct, getProducts } from "@/server/services/factory";

export async function GET() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const products = await getProducts();
  return NextResponse.json(products);
}

export async function POST(request: Request) {
  const session = await getSession();

  if (!session || session.role !== UserRole.ADMIN) {
    return NextResponse.json({ error: "Se requiere acceso de administrador." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = productSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Datos de producto invalidos." }, { status: 400 });
    }

    const product = await createProduct(parsed.data);
    return NextResponse.json({ success: true, productId: product.id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo crear el producto." },
      { status: 500 },
    );
  }
}
