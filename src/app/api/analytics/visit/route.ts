import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type VisitPayload = {
  visitorId?: unknown;
  pagePath?: unknown;
  referrerHost?: unknown;
  campaignSource?: unknown;
};

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const requestUrl = new URL(request.url);
  if (origin && new URL(origin).origin !== requestUrl.origin) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  let body: VisitPayload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid visit payload." }, { status: 400 });
  }

  const visitorId = typeof body.visitorId === "string" ? body.visitorId : "";
  const pagePath = typeof body.pagePath === "string" ? body.pagePath : "";
  const referrerHost = typeof body.referrerHost === "string" ? body.referrerHost : null;
  const campaignSource = typeof body.campaignSource === "string" ? body.campaignSource : null;

  if (!/^[0-9a-f-]{36}$/i.test(visitorId)) {
    return NextResponse.json({ error: "Invalid visitor identifier." }, { status: 400 });
  }
  if (!pagePath.startsWith("/") || pagePath.length > 240 || /[?#]/.test(pagePath)) {
    return NextResponse.json({ error: "Invalid page path." }, { status: 400 });
  }
  if (referrerHost && (referrerHost.length > 180 || /[/?#]/.test(referrerHost))) {
    return NextResponse.json({ error: "Invalid referrer." }, { status: 400 });
  }
  if (campaignSource && campaignSource.length > 100) {
    return NextResponse.json({ error: "Invalid campaign source." }, { status: 400 });
  }
  if (!supabase) {
    return NextResponse.json({ error: "Analytics database is not configured." }, { status: 503 });
  }

  const { error } = await supabase.from("site_visit_events").insert({
    visitor_id: visitorId,
    page_path: pagePath,
    referrer_host: referrerHost,
    campaign_source: campaignSource,
  });

  if (error) {
    console.error("[eCuisine analytics] Database insert failed:", error.message);
    return NextResponse.json({ error: "The visit could not be saved." }, { status: 500 });
  }

  return NextResponse.json({ recorded: true }, { status: 201 });
}
