import { NextResponse } from "next/server";
import { getAllTenants } from "@/lib/db/queries";

export async function GET(): Promise<NextResponse> {
  try {
    const tenants = await getAllTenants();
    return NextResponse.json({ tenants });
  } catch (error) {
    console.error("GET /api/tenants failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
