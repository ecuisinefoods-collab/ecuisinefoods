"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, BadgeCheck, Sparkles } from "lucide-react";

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
    const duration = 6800;
    const animate = (now: number) => {
      if (!start) start = now;
      const progress = Math.min(1, (now - start) / duration);
      const eased = progress < .5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;
      setCount(Math.round(allTimeSales * eased));
      if (progress < 1) frame = window.requestAnimationFrame(animate);
    };
    frame = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(frame);
  }, [allTimeSales]);

  const reachedMilestone = count >= LIFETIME_SALES_MILESTONE;
  const display = new Intl.NumberFormat("en-NG").format(count);

  return (
    <section className="ec-sales-story relative isolate overflow-hidden rounded-[2rem] px-6 py-7 sm:px-10 sm:py-9" aria-label="eCuisine lifetime product sales">
      <div className="ec-sales-story__glow ec-sales-story__glow--one pointer-events-none absolute -right-20 -top-32 h-80 w-80 rounded-full" />
      <div className="ec-sales-story__glow ec-sales-story__glow--two pointer-events-none absolute -bottom-40 left-[34%] h-80 w-80 rounded-full" />
      <div className="ec-sales-story__ring ec-sales-story__ring--one pointer-events-none absolute right-[18%] top-[-58%] h-[360px] w-[360px] rounded-full" />
      <div className="ec-sales-story__ring ec-sales-story__ring--two pointer-events-none absolute right-[16%] top-[-64%] h-[410px] w-[410px] rounded-full" />

      <div className="relative z-10 grid gap-7 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="max-w-2xl">
          <span className="ec-sales-story__eyebrow inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-[9px] font-black uppercase tracking-[.2em]">
            <Sparkles size={13}/> A legacy of good food
          </span>
          <h2 className="mt-4 max-w-2xl text-3xl font-black leading-[1.04] tracking-[-.045em] sm:text-4xl lg:text-[2.8rem]">
            Every order is part of our story.
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-7 sm:text-base">
            From our earliest customers to every online order today, thank you for making eCuisine part of your table.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <span className="ec-sales-story__proof inline-flex items-center gap-2 rounded-full px-3 py-2 text-[10px] font-bold"><BadgeCheck size={14}/> Built on trust</span>
            <span className="ec-sales-story__proof inline-flex items-center gap-2 rounded-full px-3 py-2 text-[10px] font-bold"><ArrowUpRight size={14}/> Growing together</span>
          </div>
        </div>

        <div className="ec-sales-story__display relative mx-auto w-full max-w-[330px] rounded-[1.65rem] px-6 py-6 text-center sm:px-8 sm:py-7 lg:mx-0">
          <span className="ec-sales-story__display-kicker block text-[9px] font-black uppercase tracking-[.23em]">Lifetime milestone</span>
          <span className="ec-sales-story__label mt-2 block text-sm font-extrabold uppercase tracking-[.14em]">Products sold</span>
          <p className="ec-sales-story__number mt-1 text-[4.4rem] font-black leading-none tracking-[-.07em] tabular-nums sm:text-[5.2rem]">
            {display}<span className="ec-sales-story__plus">{reachedMilestone ? "+" : ""}</span>
          </p>
          <span className="ec-sales-story__base mt-4 block text-[9px] font-bold uppercase tracking-[.18em]">
            {reachedMilestone ? "And our story keeps growing" : "Celebrating every customer"}
          </span>
        </div>
      </div>
      <div className="ec-sales-story__edge pointer-events-none absolute inset-x-8 bottom-0 h-px" />
    </section>
  );
}
