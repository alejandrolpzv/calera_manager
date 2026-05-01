import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";

import { authenticateUser, createSession } from "@/lib/auth";
import { loginSchema } from "@/lib/validators";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Credenciales invalidas." }, { status: 400 });
    }

    const user = await authenticateUser(parsed.data.email, parsed.data.password);

    if (!user) {
      return NextResponse.json({ error: "Correo o contrasena incorrectos." }, { status: 401 });
    }

    await createSession(user);

    return NextResponse.json({
      success: true,
      redirectTo: user.role === UserRole.ADMIN ? "/dashboard" : "/expenses",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo iniciar sesion." },
      { status: 500 },
    );
  }
}
