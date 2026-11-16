"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

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
    <section className="ec-sales-editorial relative mx-auto max-w-7xl" aria-label="eCuisine lifetime product sales">
      <div className="ec-sales-editorial__top-rule" aria-hidden="true" />
      <div className="ec-sales-editorial__body">
        <div className="ec-sales-editorial__copy">
          <p className="ec-sales-editorial__eyebrow"><Sparkles size={13} /> The eCuisine journey</p>
          <h2>Every order is part of our story.</h2>
          <p className="ec-sales-editorial__description">
            Thank you for bringing eCuisine to your table. Every purchase is another reason to keep growing with care.
          </p>
        </div>
        <div className="ec-sales-editorial__figure">
          <p className="ec-sales-editorial__label">Products sold</p>
          <p className="ec-sales-editorial__number" aria-label={`${display} products sold`}>
            {display}<span>{reachedMilestone ? "+" : ""}</span>
          </p>
          <p className="ec-sales-editorial__caption">And our story keeps growing</p>
        </div>
      </div>
      <div className="ec-sales-editorial__bottom-rule" aria-hidden="true" />
    </section>
  );
}
