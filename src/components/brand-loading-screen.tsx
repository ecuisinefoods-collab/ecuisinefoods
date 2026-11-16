"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

function LoadingVisual({ logoUrl }: { logoUrl?: string | null }) {
  return (
    <div className="ec-brand-loader" role="status" aria-live="polite" aria-label="Loading eCuisinefoods">
      <div className="ec-brand-loader__glass">
        <div className="ec-brand-loader__aura ec-brand-loader__aura--one" />
        <div className="ec-brand-loader__aura ec-brand-loader__aura--two" />
        <div className="ec-brand-loader__logo-wrap">
          {logoUrl ? (
            <img src={logoUrl} alt="eCuisinefoods" className="ec-brand-loader__logo" />
          ) : (
            <div className="ec-brand-loader__fallback">
              <span className="ec-brand-loader__emblem">e</span>
              <span className="ec-brand-loader__wordmark">
                <strong>eCuisine</strong>
                <small>Good food · Better living</small>
              </span>
            </div>
          )}
        </div>
        <div className="ec-brand-loader__liquid-track" aria-hidden="true">
          <span /><span /><span />
        </div>
        <p className="ec-brand-loader__caption">A better food experience is loading</p>
      </div>
    </div>
  );
}

export function BrandLoadingFallback({ logoUrl }: { logoUrl?: string | null }) {
  return <LoadingVisual logoUrl={logoUrl} />;
}

export function BrandLoadingScreen({ initialLogoUrl }: { initialLogoUrl?: string | null }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeKey = pathname + "?" + searchParams.toString();
  const currentRoute = useRef(routeKey);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [visible, setVisible] = useState(true);
  const [logoUrl, setLogoUrl] = useState<string | null>(initialLogoUrl ?? null);

  useEffect(() => {
    let active = true;
    if (initialLogoUrl || !supabase) return;
    supabase
      .from("site_settings")
      .select("setting_value")
      .eq("setting_key", "store_logo_url")
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active || error) return;
        const value = data?.setting_value;
        if (typeof value === "string" && /^https?:\/\//i.test(value)) setLogoUrl(value);
      })
      .catch(() => {
        // Keep the built-in eCuisine wordmark when the custom logo is unavailable.
      });
    return () => {
      active = false;
    };
  }, [initialLogoUrl]);

  useEffect(() => {
    const startedAt = Date.now();
    let finishTimer: ReturnType<typeof setTimeout> | undefined;
    const finishInitialLoad = () => {
      const remaining = Math.max(0, 620 - (Date.now() - startedAt));
      finishTimer = setTimeout(() => setVisible(false), remaining);
    };

    if (document.readyState === "complete") finishInitialLoad();
    else window.addEventListener("load", finishInitialLoad, { once: true });

    const safetyTimer = setTimeout(() => setVisible(false), 9000);
    return () => {
      window.removeEventListener("load", finishInitialLoad);
      if (finishTimer) clearTimeout(finishTimer);
      clearTimeout(safetyTimer);
    };
  }, []);

  useEffect(() => {
    if (currentRoute.current === routeKey) return;
    currentRoute.current = routeKey;
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setVisible(false), 460);
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [routeKey]);

  useEffect(() => {
    const showForNavigation = () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      setVisible(true);
      hideTimer.current = setTimeout(() => setVisible(false), 7500);
    };

    const handleClick = (event: MouseEvent) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (!(event.target instanceof Element)) return;
      const anchor = event.target.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const destination = new URL(anchor.href, window.location.href);
      if (destination.origin !== window.location.origin) return;
      if (destination.pathname === window.location.pathname && destination.search === window.location.search) return;
      showForNavigation();
    };

    const handleSearchSubmit = (event: SubmitEvent) => {
      const form = event.target;
      if (form instanceof HTMLFormElement && form.getAttribute("role") === "search") showForNavigation();
    };

    document.addEventListener("click", handleClick, true);
    document.addEventListener("submit", handleSearchSubmit);
    return () => {
      document.removeEventListener("click", handleClick, true);
      document.removeEventListener("submit", handleSearchSubmit);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  return visible ? <LoadingVisual logoUrl={logoUrl} /> : null;
}
