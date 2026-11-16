import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { NextRequest, NextResponse } from "next/server";

export const GOOGLE_DRIVE_COOKIE = "ecuisine_google_drive";
export const GOOGLE_DRIVE_STATE_COOKIE = "ecuisine_google_drive_state";
export const GOOGLE_DRIVE_COOKIE_PATH = "/api/admin/google-drive";
export const GOOGLE_DRIVE_CALLBACK = "https://ecuisinefoods.onrender.com/api/admin/google-drive/callback";

type DriveSession = { refreshToken: string; folderId?: string };
type OAuthState = { state: string; userId: string; issuedAt: number };

function encryptionKey() {
  const encoded = process.env.GOOGLE_DRIVE_TOKEN_ENCRYPTION_KEY;
  if (!encoded) throw new Error("Google Drive encryption is not configured on the server.");
  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32) throw new Error("Google Drive encryption key must be 32 bytes encoded as base64.");
  return key;
}

export function encryptSecret(value: unknown) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString("base64url")).join(".");
}

export function decryptSecret<T>(value: string): T {
  const [ivText, tagText, encryptedText] = value.split(".");
  if (!ivText || !tagText || !encryptedText) throw new Error("Stored Google Drive connection is invalid.");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivText, "base64url"));
  decipher.setAuthTag(Buffer.from(tagText, "base64url"));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(encryptedText, "base64url")), decipher.final()]);
  return JSON.parse(decrypted.toString("utf8")) as T;
}

export function setEncryptedCookie(response: NextResponse, name: string, value: unknown, maxAge: number) {
  response.cookies.set(name, encryptSecret(value), {
    httpOnly: true, secure: true, sameSite: "lax", path: GOOGLE_DRIVE_COOKIE_PATH,
    maxAge, priority: "high",
  });
}

export function clearDriveCookies(response: NextResponse) {
  for (const name of [GOOGLE_DRIVE_COOKIE, GOOGLE_DRIVE_STATE_COOKIE]) {
    response.cookies.set(name, "", { httpOnly: true, secure: true, sameSite: "lax", path: GOOGLE_DRIVE_COOKIE_PATH, maxAge: 0 });
  }
}

export async function requireActiveOwner(request: NextRequest): Promise<{ client: SupabaseClient; userId: string } | null> {
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!token || !url || !key) return null;

  const client = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    global: { headers: { Authorization: "Bearer " + token } },
  });
  const { data: { user }, error: authError } = await client.auth.getUser(token);
  if (authError || !user) return null;
  const { data: profile, error: profileError } = await client
    .from("admin_profiles").select("role,is_active").eq("user_id", user.id).maybeSingle();
  if (profileError || !profile?.is_active || profile.role !== "owner") return null;
  return { client, userId: user.id };
}

export function readDriveSession(request: NextRequest): DriveSession | null {
  const value = request.cookies.get(GOOGLE_DRIVE_COOKIE)?.value;
  if (!value) return null;
  try { return decryptSecret<DriveSession>(value); } catch { return null; }
}

export function readOAuthState(request: NextRequest): OAuthState | null {
  const value = request.cookies.get(GOOGLE_DRIVE_STATE_COOKIE)?.value;
  if (!value) return null;
  try { return decryptSecret<OAuthState>(value); } catch { return null; }
}
