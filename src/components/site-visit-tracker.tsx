"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";

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
    if (!supabase || !pathname || pathname === lastRecordedPath.current) return;
    if (pathname === "/admin" || pathname.startsWith("/admin/") || pathname.startsWith("/api/")) return;
    if (pathname.startsWith("/_next/")) return;

    lastRecordedPath.current = pathname;
    const visitorId = getVisitorId();
    let referrerHost: string | null = null;
    try {
      const referrer = document.referrer ? new URL(document.referrer) : null;
      if (referrer && referrer.origin !== window.location.origin) referrerHost = referrer.hostname.slice(0, 180);
    } catch {
      referrerHost = null;
    }
    const params = new URLSearchParams(window.location.search);
    const campaignSource = (params.get("utm_source") || "").trim().slice(0, 100) || null;

    void supabase.from("site_visit_events").insert({
      visitor_id: visitorId,
      page_path: pathname.slice(0, 240),
      referrer_host: referrerHost,
      campaign_source: campaignSource,
    });
  }, [pathname]);

  return null;
}
