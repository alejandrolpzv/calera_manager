import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { getDashboardData } from "@/server/services/factory";

export async function GET() {
  const session = await getSession();

  if (!session || session.role !== UserRole.ADMIN) {
    return NextResponse.json({ error: "Se requiere acceso de administrador." }, { status: 403 });
  }

  const data = await getDashboardData();
  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}
