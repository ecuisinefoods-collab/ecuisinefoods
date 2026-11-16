import { NextRequest, NextResponse } from "next/server";
import { clearDriveCookies, requireActiveOwner } from "@/lib/google-drive-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!(await requireActiveOwner(request))) return NextResponse.json({ error: "Owner access required." }, { status: 403 });
  const response = NextResponse.json({ disconnected: true });
  clearDriveCookies(response);
  return response;
}
