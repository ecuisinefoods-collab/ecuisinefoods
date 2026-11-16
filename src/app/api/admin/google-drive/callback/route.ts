import { NextRequest, NextResponse } from "next/server";
import {
  GOOGLE_DRIVE_CALLBACK, GOOGLE_DRIVE_COOKIE, GOOGLE_DRIVE_COOKIE_PATH,
  GOOGLE_DRIVE_STATE_COOKIE, readDriveSession, readOAuthState, setEncryptedCookie,
} from "@/lib/google-drive-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const errorPage = new URL("/admin/exports?google_drive=error", request.url);
  const oauthError = request.nextUrl.searchParams.get("error");
  const code = request.nextUrl.searchParams.get("code");
  const suppliedState = request.nextUrl.searchParams.get("state");
  const savedState = readOAuthState(request);
  if (oauthError || !code || !suppliedState || !savedState || suppliedState !== savedState.state ||
      Date.now() - savedState.issuedAt > 10 * 60 * 1000) {
    const response = NextResponse.redirect(errorPage);
    response.cookies.set(GOOGLE_DRIVE_STATE_COOKIE, "", { httpOnly: true, secure: true, sameSite: "lax", path: GOOGLE_DRIVE_COOKIE_PATH, maxAge: 0 });
    return response;
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return NextResponse.redirect(errorPage);

  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code, client_id: clientId, client_secret: clientSecret,
        redirect_uri: GOOGLE_DRIVE_CALLBACK, grant_type: "authorization_code",
      }),
      cache: "no-store",
    });
    const tokens = await tokenResponse.json();
    if (!tokenResponse.ok || !tokens.access_token) throw new Error("Google token exchange failed.");
    const previous = readDriveSession(request);
    const refreshToken = tokens.refresh_token || previous?.refreshToken;
    if (!refreshToken) throw new Error("Google did not return a refresh token.");
    const response = NextResponse.redirect(new URL("/admin/exports?google_drive=connected", request.url));
    setEncryptedCookie(response, GOOGLE_DRIVE_COOKIE, {
      refreshToken, folderId: previous?.folderId,
    }, 60 * 60 * 24 * 180);
    response.cookies.set(GOOGLE_DRIVE_STATE_COOKIE, "", { httpOnly: true, secure: true, sameSite: "lax", path: GOOGLE_DRIVE_COOKIE_PATH, maxAge: 0 });
    return response;
  } catch {
    const response = NextResponse.redirect(errorPage);
    response.cookies.set(GOOGLE_DRIVE_STATE_COOKIE, "", { httpOnly: true, secure: true, sameSite: "lax", path: GOOGLE_DRIVE_COOKIE_PATH, maxAge: 0 });
    return response;
  }
}
