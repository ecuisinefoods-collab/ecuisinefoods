"use client";

import { useEffect, useState } from "react";

const JOURNEY_NOTES = [
  "Good food. Better everyday choices.",
  "Every order helps shape our next chapter.",
  "Made with care. Shared with purpose.",
  "New finds and special offers await.",
  "Growing through every customer story."
];

export function SalesCounter({ total, manualTotal = null }: { total: number; manualTotal?: number | null }) {
  const [count, setCount] = useState(0);
  const [activeNote, setActiveNote] = useState(0);
  const websiteSales = Math.max(0, Math.floor(Number.isFinite(total) ? total : 0));
  const allTimeSales = manualTotal === null || manualTotal === undefined ? websiteSales : Math.max(0, Math.floor(Number.isFinite(manualTotal) ? manualTotal : 0));
  const display = new Intl.NumberFormat("en-NG").format(count);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setCount(allTimeSales);
      return;
    }

    let frame = 0;
    let start = 0;
    const duration = 3200;
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

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => {
      setActiveNote(current => (current + 1) % JOURNEY_NOTES.length);
    }, 5600);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className="ec-journey-quiet" aria-label="eCuisine products sold milestone">
      <div className="ec-journey-quiet__story">
        <span className="ec-journey-quiet__eyebrow">The eCuisine journey</span>
        <span className="ec-journey-quiet__title">Every order is part of our story.</span>
        <span className="ec-journey-quiet__ticker" key={activeNote} aria-live="polite">
          {JOURNEY_NOTES[activeNote]}
        </span>
      </div>

      <div className="ec-journey-quiet__stats" role="group" aria-label="Products sold">
        <div className="ec-journey-quiet__stat" aria-label={`${display} plus products sold`}>
          <span className="ec-journey-quiet__number">{display}<span className="ec-journey-quiet__plus">+</span></span>
          <span className="ec-journey-quiet__sold-label">PRODUCTS SOLD</span>
        </div>
      </div>
    </section>
  );
}
