"use client";

import Link from "next/link";

export function DiscountMascot() {
  return (
    <Link
      href="/#promotions"
      aria-label="Discover eCuisinefoods discounts and special offers"
      title="Tap to discover discounts and special offers"
      className="discount-mascot fixed bottom-5 left-3 z-[70] flex items-center gap-2 rounded-full border border-[#ead7a0] bg-[#fffdf5] px-3 py-2 shadow-[0_12px_34px_rgba(31,61,39,.22)] transition hover:scale-105 hover:shadow-xl focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[#c49a39] sm:bottom-7 sm:left-6"
    >
      <span className="discount-mascot-runner" aria-hidden="true">🏃🏾‍♂️</span>
      <span className="flex flex-col text-left leading-tight">
        <span className="text-[9px] font-black uppercase tracking-[.16em] text-[#9a7022]">Special deals</span>
        <span className="text-[11px] font-extrabold text-[#214b32]">Catch a discount!</span>
      </span>
      <span className="grid h-7 w-7 place-items-center rounded-full bg-[#245b42] text-sm font-black text-white" aria-hidden="true">%</span>
    </Link>
  );
}
