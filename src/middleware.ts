import { NextFetchEvent, NextRequest, NextResponse } from "next/server";

const VISITOR_COOKIE = "ecuisine_analytics_visitor_v2";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isTrackablePageRequest(request: NextRequest) {
  if (request.method !== "GET") return false;

  const pathname = request.nextUrl.pathname;
  if (
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname === "/api" ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml"
  ) {
    return false;
  }

  // Ignore router prefetches; count full document loads and real App Router
  // navigations (RSC requests) only.
  if (
    request.headers.has("next-router-prefetch") ||
    request.headers.get("purpose") === "prefetch"
  ) {
    return false;
  }

  return (
    request.headers.get("sec-fetch-dest") === "document" ||
    request.headers.get("rsc") === "1" ||
    (request.headers.get("accept") || "").includes("text/html")
  );
}

export function middleware(request: NextRequest, event: NextFetchEvent) {
  const response = NextResponse.next();

  if (!isTrackablePageRequest(request)) return response;

  const storedVisitorId = request.cookies.get(VISITOR_COOKIE)?.value || "";
  const visitorId = UUID_PATTERN.test(storedVisitorId)
    ? storedVisitorId
    : crypto.randomUUID();

  if (visitorId !== storedVisitorId) {
    response.cookies.set(VISITOR_COOKIE, visitorId, {
      httpOnly: true,
      secure: request.nextUrl.protocol === "https:",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !publishableKey) {
    console.error("[eCuisine analytics] Supabase URL or publishable key is missing.");
    return response;
  }

  let referrerHost: string | null = null;
  const referer = request.headers.get("referer");
  if (referer) {
    try {
      const parsed = new URL(referer);
      if (parsed.origin !== request.nextUrl.origin) {
        referrerHost = parsed.hostname.slice(0, 180);
      }
    } catch {
      referrerHost = null;
    }
  }

  const campaignSource =
    request.nextUrl.searchParams.get("utm_source")?.trim().slice(0, 100) || null;

  const insert = fetch(
    `${supabaseUrl.replace(/\\/$/, "")}/rest/v1/site_visit_events`,
    {
      method: "POST",
      headers: {
        apikey: publishableKey,
        Authorization: `Bearer ${publishableKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        visitor_id: visitorId,
        page_path: request.nextUrl.pathname.slice(0, 240),
        referrer_host: referrerHost,
        campaign_source: campaignSource,
      }),
      cache: "no-store",
    },
  ).then(async (result) => {
    if (!result.ok) {
      const detail = (await result.text()).slice(0, 500);
      console.error(
        `[eCuisine analytics] Visit insert failed (${result.status}): ${detail}`,
      );
    }
  }).catch((error: unknown) => {
    console.error("[eCuisine analytics] Visit insert request failed:", error);
  });

  event.waitUntil(insert);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
