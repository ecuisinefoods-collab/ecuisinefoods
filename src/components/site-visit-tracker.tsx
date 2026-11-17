"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const VISITOR_KEY = "ecuisine_analytics_visitor_v1";

function getVisitorId() {
  try {
    const existing = window.localStorage.getItem(VISITOR_KEY);
    if (existing && /^[0-9a-f-]{36}$/i.test(existing)) return existing;
    const created = window.crypto.randomUUID();
    window.localStorage.setItem(VISITOR_KEY, created);
    return created;
  } catch {
    return window.crypto.randomUUID();
  }
}

export function SiteVisitTracker() {
  const pathname = usePathname();
  const lastRecordedPath = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || pathname === lastRecordedPath.current) return;
    if (pathname.startsWith("/api/") || pathname.startsWith("/_next/")) return;
    // Keep internal admin activity out of the public storefront audience figures.
    if (pathname === "/admin" || pathname.startsWith("/admin/")) return;

    let cancelled = false;
    const visitorId = getVisitorId();
    let referrerHost: string | null = null;
    try {
      const referrer = document.referrer ? new URL(document.referrer) : null;
      if (referrer && referrer.origin !== window.location.origin) {
        referrerHost = referrer.hostname.slice(0, 180);
      }
    } catch {
      referrerHost = null;
    }
    const params = new URLSearchParams(window.location.search);
    const campaignSource = (params.get("utm_source") || "").trim().slice(0, 100) || null;

    // Use the same-origin endpoint so the browser can report failures and the
    // server can reliably persist events even when client auth state is changing.
    void fetch("/api/analytics/visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitorId,
        pagePath: pathname.slice(0, 240),
        referrerHost,
        campaignSource,
      }),
      keepalive: true,
      credentials: "same-origin",
    }).then(async (response) => {
      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(result?.error || `Visit tracking failed (${response.status})`);
      }
      if (!cancelled) lastRecordedPath.current = pathname;
    }).catch((error) => {
      console.warn("[eCuisine analytics] Could not record this visit:", error);
    });

    return () => { cancelled = true; };
  }, [pathname]);

  return null;
}
