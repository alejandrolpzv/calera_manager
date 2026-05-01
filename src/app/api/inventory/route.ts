import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { getInventorySnapshot } from "@/server/services/factory";

export async function GET() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const inventory = await getInventorySnapshot();
  return NextResponse.json(inventory);
}
