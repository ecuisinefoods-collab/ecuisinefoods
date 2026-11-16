import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import { DiscountMascot } from "@/components/discount-mascot";
import { MobileStoreNav } from "@/components/mobile-store-nav";
import { FloatingWhatsApp } from "@/components/floating-whatsapp";
import { AssistantWidget } from "@/components/assistant-widget";
import { BrandLoadingFallback, BrandLoadingScreen } from "@/components/brand-loading-screen";
import { supabase } from "@/lib/supabase";
import { ThemeProvider } from "@/components/theme-provider";
import { ReferralTracker } from "@/components/referral-tracker";

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
        <Suspense fallback={<BrandLoadingFallback logoUrl={brandLogoUrl} />}>
          <BrandLoadingScreen initialLogoUrl={brandLogoUrl} />
        </Suspense>
        <ReferralTracker />
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
