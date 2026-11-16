"use client";

import { useEffect, useState } from "react";
import { PackageCheck, Sparkles } from "lucide-react";

// The owner confirmed that pre-website sales put lifetime volume beyond this milestone.
// Website-completed quantities continue to raise the counter once they pass the floor.
const LIFETIME_SALES_MILESTONE = 1000;

export function SalesCounter({ total }: { total: number }) {
  const [count, setCount] = useState(0);
  const websiteSales = Math.max(0, Math.floor(Number.isFinite(total) ? total : 0));
  const allTimeSales = Math.max(LIFETIME_SALES_MILESTONE, websiteSales);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setCount(allTimeSales);
      return;
    }
    let frame = 0;
    let start = 0;
    const duration = 1700;
    const animate = (now: number) => {
      if (!start) start = now;
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 4);
      setCount(Math.round(allTimeSales * eased));
      if (progress < 1) frame = window.requestAnimationFrame(animate);
    };
    frame = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(frame);
  }, [allTimeSales]);

  const reachedMilestone = count >= LIFETIME_SALES_MILESTONE;
  const display = new Intl.NumberFormat("en-NG").format(count);

  return (
    <div className="ec-sales-story relative overflow-hidden rounded-[1.7rem] border px-6 py-6 sm:px-9 sm:py-7">
      <div className="ec-sales-story__orb ec-sales-story__orb--one pointer-events-none absolute -right-8 -top-20 h-56 w-56 rounded-full border-[22px]" />
      <div className="ec-sales-story__orb ec-sales-story__orb--two pointer-events-none absolute -bottom-24 left-[36%] h-44 w-44 rounded-full border-[16px]" />
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-2xl">
          <span className="ec-sales-story__eyebrow inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[.15em]">
            <Sparkles size={13}/> A growing eCuisine story
          </span>
          <h2 className="mt-3 text-2xl font-black tracking-tight text-[#1d432d] sm:text-3xl">Every order is part of our story.</h2>
          <p className="mt-2 max-w-xl text-xs leading-6 text-[#718174] sm:text-sm">
            More than a thousand products sold across our journey, from our early days to every online order.
          </p>
        </div>
        <div className="ec-sales-story__stat min-w-[190px] rounded-2xl border px-6 py-4">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.12em] text-[#829082]"><PackageCheck size={14}/> Products sold</div>
          <p className="mt-1 text-4xl font-black tabular-nums tracking-tight text-[#176044] sm:text-5xl">{display}{reachedMilestone ? "+" : ""}</p>
        </div>
      </div>
    </div>
  );
}
