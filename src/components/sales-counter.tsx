"use client";

import { useEffect, useState } from "react";
import { PackageCheck, Sparkles } from "lucide-react";

export function SalesCounter({ total }: { total: number }) {
  const [count, setCount] = useState(0);
  const safeTotal = Math.max(0, Math.floor(Number.isFinite(total) ? total : 0));

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setCount(safeTotal);
      return;
    }
    let frame = 0;
    let start = 0;
    const duration = 1500;
    const animate = (now: number) => {
      if (!start) start = now;
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 4);
      setCount(Math.round(safeTotal * eased));
      if (progress < 1) frame = window.requestAnimationFrame(animate);
    };
    frame = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(frame);
  }, [safeTotal]);

  const reachedMilestone = safeTotal >= 1800 && count >= 1800;
  const display = new Intl.NumberFormat("en-NG").format(count);

  return (
    <div className="relative overflow-hidden rounded-[1.7rem] border border-[#e5eee5] bg-gradient-to-r from-[#f0f7ef] via-white to-[#fff8e9] px-6 py-7 shadow-sm sm:px-9 sm:py-8">
      <div className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full border-[24px] border-[#e5f0e4]/70" />
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-xl">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/85 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[.15em] text-[#47734f]"><Sparkles size={13}/> Growing together</span>
          <h2 className="mt-3 text-2xl font-black tracking-tight text-[#1d432d] sm:text-3xl">Every order is part of our story.</h2>
          <p className="mt-2 text-xs leading-6 text-[#718174] sm:text-sm">A real-time milestone, counted from products in completed customer orders.</p>
        </div>
        <div className="min-w-[190px] rounded-2xl border border-white/90 bg-white/85 px-6 py-4 shadow-sm">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.12em] text-[#829082]"><PackageCheck size={14}/> Products sold</div>
          <p className="mt-1 text-4xl font-black tabular-nums tracking-tight text-[#176044] sm:text-5xl">{display}{reachedMilestone ? "+" : ""}</p>
          <p className="mt-1 text-[10px] font-medium text-[#91a092]">{reachedMilestone ? "And counting" : "Completed order quantities"}</p>
        </div>
      </div>
    </div>
  );
}
