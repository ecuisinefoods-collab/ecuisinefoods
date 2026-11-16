import { NextRequest, NextResponse } from "next/server";
import { readDriveSession, requireActiveOwner } from "@/lib/google-drive-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!(await requireActiveOwner(request))) return NextResponse.json({ error: "Owner access required." }, { status: 403 });
  return NextResponse.json({ connected: Boolean(readDriveSession(request)?.refreshToken) });
}
