import type { Metadata } from "next";
import "./globals.css";
import { DiscountMascot } from "@/components/discount-mascot";
import { supabase } from "@/lib/supabase";

export const metadata: Metadata = {
  title: "eCuisinefoods | Good food, better living",
  description: "Wholesome food products from eCuisinefoods. Quality, nutrition and trust in every pack.",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  let showDiscountMascot = false;
  if (supabase) {
    const { data } = await supabase
      .from("site_settings")
      .select("setting_value")
      .eq("setting_key", "discount_mascot_enabled")
      .maybeSingle();
    showDiscountMascot = data?.setting_value === "true";
  }
  return <html lang="en"><body>{children}{showDiscountMascot ? <DiscountMascot /> : null}</body></html>;
}
