"use client";

import Link from "next/link";

export function DiscountMascot() {
  return (
    <Link
      href="/#promotions"
      aria-label="Discover eCuisinefoods discounts and special offers"
      title="Tap to discover discounts and special offers"
      className="discount-mascot fixed bottom-5 left-3 z-[70] flex items-center gap-2 rounded-[1.4rem] border border-[#ead7a0] bg-[#fffdf5] p-2 shadow-[0_12px_34px_rgba(31,61,39,.22)] transition hover:scale-105 hover:shadow-xl focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[#c49a39] sm:bottom-7 sm:left-6"
    >
      <span className="discount-mascot-runner" aria-hidden="true">
        <img src="/images/discount-mascot.webp" alt="" width="72" height="92" className="block h-[92px] w-[72px] rounded-xl object-cover" />
      </span>
      <span className="flex flex-col text-left leading-tight pr-2">
        <span className="text-[9px] font-black uppercase tracking-[.16em] text-[#9a7022]">Special deals</span>
        <span className="mt-1 text-[12px] font-extrabold text-[#214b32]">Catch a discount!</span>
        <span className="mt-2 inline-flex w-fit rounded-full bg-[#5d3b91] px-3 py-1 text-[10px] font-bold text-white">Tap to shop</span>
      </span>
    </Link>
  );
}
