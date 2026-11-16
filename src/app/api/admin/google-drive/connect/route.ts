import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { encryptSecret, GOOGLE_DRIVE_CALLBACK, GOOGLE_DRIVE_STATE_COOKIE, GOOGLE_DRIVE_COOKIE_PATH, requireActiveOwner } from "@/lib/google-drive-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const owner = await requireActiveOwner(request);
  if (!owner) return NextResponse.json({ error: "Only the signed-in active owner can connect Google Drive." }, { status: 403 });
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId || !process.env.GOOGLE_CLIENT_SECRET) {
    return NextResponse.json({ error: "Google OAuth credentials are missing from the Render service." }, { status: 503 });
  }
  try {
    const state = randomBytes(32).toString("base64url");
    const stateCookie = encryptSecret({ state, userId: owner.userId, issuedAt: Date.now() });
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: GOOGLE_DRIVE_CALLBACK,
      response_type: "code",
      scope: "https://www.googleapis.com/auth/drive.file",
      access_type: "offline",
      prompt: "consent",
      state,
    });
    const response = NextResponse.json({ authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth?" + params.toString() });
    response.cookies.set(GOOGLE_DRIVE_STATE_COOKIE, stateCookie, {
      httpOnly: true, secure: true, sameSite: "lax", path: GOOGLE_DRIVE_COOKIE_PATH,
      maxAge: 600, priority: "high",
    });
    return response;
  } catch {
    return NextResponse.json({ error: "Google Drive security configuration is incomplete. Please contact the site owner." }, { status: 503 });
  }
}
