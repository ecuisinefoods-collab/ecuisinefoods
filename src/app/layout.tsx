import type { Metadata } from "next";
import { Suspense } from "react";
import Script from "next/script";
import "./globals.css";
import { DiscountMascot } from "@/components/discount-mascot";
import { MobileStoreNav } from "@/components/mobile-store-nav";
import { FloatingWhatsApp } from "@/components/floating-whatsapp";
import { AssistantWidget } from "@/components/assistant-widget";
import { BrandLoadingFallback, BrandLoadingScreen } from "@/components/brand-loading-screen";
import { supabase } from "@/lib/supabase";
import { ThemeProvider } from "@/components/theme-provider";
import { ReferralTracker } from "@/components/referral-tracker";
import { SiteVisitTracker } from "@/components/site-visit-tracker";

export const metadata: Metadata = {
  title: "eCuisine | Good food, better living",
  description: "Wholesome food products from eCuisine. Quality, nutrition and trust in every pack.",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  let showDiscountMascot = false;
  let brandLogoUrl: string | null = null;
  if (supabase) {
    const { data } = await supabase
      .from("site_settings")
      .select("setting_key,setting_value")
      .in("setting_key", ["discount_mascot_enabled", "store_logo_url"]);
    showDiscountMascot = data?.find((row) => row.setting_key === "discount_mascot_enabled")?.setting_value === "true";
    const logo = data?.find((row) => row.setting_key === "store_logo_url")?.setting_value;
    if (typeof logo === "string" && /^https?:\/\//i.test(logo)) brandLogoUrl = logo;
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(function(){document.documentElement.dataset.theme="light";document.documentElement.style.colorScheme="light";try{localStorage.setItem("ecuisine-theme","light");}catch(e){}})();` }} />
      </head>
      <body>
        <ThemeProvider>
        {process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN ? (
          <Script
            id="posthog-analytics"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `!function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=e[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init capture identify reset".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);posthog.init(${JSON.stringify(process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN)}, {api_host:"https://us.i.posthog.com",defaults:"2026-08-30",capture_pageview:true,capture_pageleave:true,autocapture:false,disable_session_recording:true});`,
            }}
          />
        ) : null}
        <Suspense fallback={<BrandLoadingFallback logoUrl={brandLogoUrl} />}>
          <BrandLoadingScreen initialLogoUrl={brandLogoUrl} />
        </Suspense>
        <ReferralTracker />
        <SiteVisitTracker />
        {children}
        <MobileStoreNav />
        <FloatingWhatsApp />
        <AssistantWidget />
        {showDiscountMascot ? <DiscountMascot /> : null}
        </ThemeProvider>
      </body>
    </html>
  );
}
