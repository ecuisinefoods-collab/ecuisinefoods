import { NextRequest, NextResponse } from "next/server";
import { readDriveSession, requireActiveOwner, setEncryptedCookie, GOOGLE_DRIVE_COOKIE } from "@/lib/google-drive-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const datasets = [
  "orders","order_items","products","product_variants","promotional_banners","financial_transactions",
  "finance_accounts","pickup_locations","delivery_zones","site_settings","coupons","inventory_movements",
  "customer_profiles","customer_reviews","partnership_inquiries","affiliate_applications","partner_profiles",
  "partner_tasks","partner_task_submissions","partner_referral_clicks","admin_profiles","admin_audit_logs",
  "assistant_conversations","assistant_messages","assistant_rate_limits","assistant_knowledge",
  "assistant_knowledge_config","assistant_knowledge_documents",
];

async function driveFetch(url: string, accessToken: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Authorization", "Bearer " + accessToken);
  return fetch(url, { ...init, headers, cache: "no-store" });
}

export async function POST(request: NextRequest) {
  const owner = await requireActiveOwner(request);
  if (!owner) return NextResponse.json({ error: "Only the active owner can create a Google Drive backup." }, { status: 403 });
  const saved = readDriveSession(request);
  if (!saved?.refreshToken) return NextResponse.json({ error: "Connect Google Drive before starting a backup." }, { status: 409 });

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return NextResponse.json({ error: "Google OAuth credentials are not configured." }, { status: 503 });

  try {
    const refreshResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId, client_secret: clientSecret,
        refresh_token: saved.refreshToken, grant_type: "refresh_token",
      }),
      cache: "no-store",
    });
    const refreshed = await refreshResponse.json();
    if (!refreshResponse.ok || !refreshed.access_token) {
      return NextResponse.json({ error: "Google Drive authorization has expired. Reconnect Google Drive, then retry." }, { status: 401 });
    }
    const accessToken = refreshed.access_token;

    let folderId = saved.folderId;
    if (!folderId) {
      const folderResponse = await driveFetch(
        "https://www.googleapis.com/drive/v3/files?fields=id,name",
        accessToken,
        {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "eCuisinefoods Backups", mimeType: "application/vnd.google-apps.folder" }),
        },
      );
      const folder = await folderResponse.json();
      if (!folderResponse.ok || !folder.id) throw new Error("Could not create the private backup folder in Google Drive.");
      folderId = folder.id;
    }

    const backup: Record<string, unknown[]> = {};
    for (const table of datasets) {
      const rows: unknown[] = [];
      for (let offset = 0; ; offset += 1000) {
        const { data, error } = await owner.client.from(table).select("*").range(offset, offset + 999);
        if (error) throw new Error("Backup stopped at " + table + ": " + error.message);
        rows.push(...(data || []));
        if (!data || data.length < 1000) break;
      }
      backup[table] = rows;
    }

    const createdAt = new Date().toISOString();
    const fileName = "ecuisinefoods-full-backup-" + createdAt.slice(0, 10) + ".json";
    const document = JSON.stringify({ product: "eCuisinefoods", format_version: 1, created_at: createdAt, tables: backup });
    const form = new FormData();
    form.append("metadata", new Blob([JSON.stringify({
      name: fileName, mimeType: "application/json", parents: [folderId],
    })], { type: "application/json" }));
    form.append("file", new Blob([document], { type: "application/json" }), fileName);

    const uploadResponse = await driveFetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink",
      accessToken,
      { method: "POST", body: form },
    );
    const uploaded = await uploadResponse.json();
    if (!uploadResponse.ok || !uploaded.id) throw new Error("Google Drive could not store the backup file.");

    const response = NextResponse.json({
      success: true, fileName: uploaded.name || fileName, webViewLink: uploaded.webViewLink || null,
      createdAt, recordCount: Object.values(backup).reduce((sum, rows) => sum + rows.length, 0),
    });
    setEncryptedCookie(response, GOOGLE_DRIVE_COOKIE, {
      refreshToken: refreshed.refresh_token || saved.refreshToken, folderId,
    }, 60 * 60 * 24 * 180);
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Google Drive backup failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
