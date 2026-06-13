import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { reportRangeSchema } from "@/lib/validators";
import { getDefaultReportRange, getReportData } from "@/server/services/factory";

export async function GET(request: Request) {
  const session = await getSession();

  if (!session || session.role !== UserRole.ADMIN) {
    return NextResponse.json({ error: "Se requiere acceso de administrador." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const defaults = getDefaultReportRange();
  const parsed = reportRangeSchema.safeParse({
    from: searchParams.get("from") || defaults.from,
    to: searchParams.get("to") || defaults.to,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Rango de fechas invalido." }, { status: 400 });
  }

  const data = await getReportData(parsed.data.from, parsed.data.to, {
    reportType: searchParams.get("reportType") || "",
    expenseCategory: searchParams.get("expenseCategory") || "",
    productId: searchParams.get("productId") || "",
    paymentStatus: searchParams.get("paymentStatus") || "",
    q: searchParams.get("q") || "",
  });
  return NextResponse.json(data);
}
