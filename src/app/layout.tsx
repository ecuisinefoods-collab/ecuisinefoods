import type { Metadata } from "next";
import "./globals.css";
import { DiscountMascot } from "@/components/discount-mascot";

export const metadata: Metadata = {
  title: "eCuisinefoods | Good food, better living",
  description: "Wholesome food products from eCuisinefoods. Quality, nutrition and trust in every pack.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}<DiscountMascot /></body></html>;
}
