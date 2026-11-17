"use client";

import { useEffect, useState } from "react";

const LIFETIME_SALES_MILESTONE = 2500;
const AFFILIATE_MILESTONE = 30;
const CUSTOMER_MILESTONE = 550;
const JOURNEY_NOTES = [
  "Good food. Better everyday choices.",
  "Every order helps shape our next chapter.",
  "Made with care. Shared with purpose.",
  "New finds and special offers await.",
  "Growing through every customer story."
];

type MilestoneCounts = {
  affiliates: number;
  products: number;
  customers: number;
};

export function SalesCounter({ total }: { total: number }) {
  const [counts, setCounts] = useState<MilestoneCounts>({
    affiliates: 0,
    products: 0,
    customers: 0
  });
  const [activeNote, setActiveNote] = useState(0);
  const websiteSales = Math.max(0, Math.floor(Number.isFinite(total) ? total : 0));
  const targets: MilestoneCounts = {
    affiliates: AFFILIATE_MILESTONE,
    products: Math.max(LIFETIME_SALES_MILESTONE, websiteSales),
    customers: CUSTOMER_MILESTONE
  };
  const format = (value: number) => new Intl.NumberFormat("en-NG").format(value);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      setCounts(targets);
      return;
    }

    let frame = 0;
    let start = 0;
    const duration = 3200;
    const animate = (now: number) => {
      if (!start) start = now;
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 4);
      setCounts({
        affiliates: Math.round(targets.affiliates * eased),
        products: Math.round(targets.products * eased),
        customers: Math.round(targets.customers * eased)
      });
      if (progress < 1) frame = window.requestAnimationFrame(animate);
    };

    frame = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(frame);
  }, [targets.affiliates, targets.products, targets.customers]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => {
      setActiveNote(current => (current + 1) % JOURNEY_NOTES.length);
    }, 5600);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className="ec-journey-quiet" aria-label="eCuisine community milestones">
      <div className="ec-journey-quiet__story">
        <span className="ec-journey-quiet__eyebrow">The eCuisine journey</span>
        <span className="ec-journey-quiet__title">Every order is part of our story.</span>
        <span className="ec-journey-quiet__ticker" key={activeNote} aria-live="polite">
          {JOURNEY_NOTES[activeNote]}
        </span>
      </div>

      <div className="ec-journey-quiet__stats" role="group" aria-label="eCuisine milestones">
        <div className="ec-journey-quiet__stat" aria-label={`${format(counts.affiliates)} plus affiliates`}>
          <span className="ec-journey-quiet__number">{format(counts.affiliates)}<span className="ec-journey-quiet__plus">+</span></span>
          <span className="ec-journey-quiet__sold-label">AFFILIATES</span>
        </div>
        <div className="ec-journey-quiet__stat" aria-label={`${format(counts.products)} plus products sold`}>
          <span className="ec-journey-quiet__number">{format(counts.products)}<span className="ec-journey-quiet__plus">+</span></span>
          <span className="ec-journey-quiet__sold-label">PRODUCTS SOLD</span>
        </div>
        <div className="ec-journey-quiet__stat" aria-label={`${format(counts.customers)} plus customers`}>
          <span className="ec-journey-quiet__number">{format(counts.customers)}<span className="ec-journey-quiet__plus">+</span></span>
          <span className="ec-journey-quiet__sold-label">CUSTOMERS</span>
        </div>
      </div>
    </section>
  );
}
