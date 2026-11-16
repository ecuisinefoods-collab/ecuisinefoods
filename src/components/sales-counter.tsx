"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";

const LIFETIME_SALES_MILESTONE = 1000;
const JOURNEY_NOTES = [
  { eyebrow: "Growing together", title: "Rooted in Jos. Growing with Bauchi.", detail: "We are building a food experience that stays close to the communities we serve." },
  { eyebrow: "Thoughtful choices", title: "Good food. Better everyday choices.", detail: "Discover useful food products with clear details to help you shop with confidence." },
  { eyebrow: "Pickup made simple", title: "Five local pickup points. More convenience.", detail: "Choose from Terminus, Faringada, Lamingo, Yelwa or Old G-R-A at checkout." },
  { eyebrow: "Care in every order", title: "Every order helps shape our next chapter.", detail: "Your support inspires us to keep listening, improving and serving with care." },
  { eyebrow: "Always something to discover", title: "New finds and special offers await.", detail: "Visit the shop to explore available products, fresh arrivals and current offers." }
];

export function SalesCounter({ total }: { total: number }) {
  const [count, setCount] = useState(0);
  const [activeNote, setActiveNote] = useState(0);
  const websiteSales = Math.max(0, Math.floor(Number.isFinite(total) ? total : 0));
  const allTimeSales = Math.max(LIFETIME_SALES_MILESTONE, websiteSales);
  const reachedMilestone = count >= LIFETIME_SALES_MILESTONE;
  const display = new Intl.NumberFormat("en-NG").format(count);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setCount(allTimeSales);
      return;
    }
    let frame = 0;
    let start = 0;
    const duration = 4200;
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
    if (!reachedMilestone || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setActiveNote(current => (current + 1) % JOURNEY_NOTES.length), 6200);
    return () => window.clearInterval(timer);
  }, [reachedMilestone]);

  const moveNote = (direction: number) => setActiveNote(current => (current + direction + JOURNEY_NOTES.length) % JOURNEY_NOTES.length);
  const note = JOURNEY_NOTES[activeNote];

  return (
    <section className="ec-sales-editorial" aria-label="eCuisine journey and lifetime product sales">
      <div className="ec-sales-editorial__shine" aria-hidden="true" />
      <div className="ec-sales-editorial__body">
        <div className="ec-sales-editorial__copy">
          <p className="ec-sales-editorial__eyebrow"><Sparkles size={13} /> The eCuisine journey</p>
          <h2>Every order is part of our story.</h2>
          <p className="ec-sales-editorial__description">Thank you for bringing eCuisine to your table. Every purchase is another reason to keep growing with care.</p>
          <div className="ec-sales-editorial__ticker" aria-live="polite" aria-atomic="true">
            <div className="ec-sales-editorial__ticker-copy" key={activeNote}>
              <span>{reachedMilestone ? note.eyebrow : "Our next chapter"}</span>
              <strong>{reachedMilestone ? note.title : "We are growing, one thoughtful order at a time."}</strong>
              <p>{reachedMilestone ? note.detail : "Thank you for being part of the eCuisinefoods journey."}</p>
            </div>
            {reachedMilestone && <div className="ec-sales-editorial__controls" aria-label="Journey updates">
              <button type="button" onClick={() => moveNote(-1)} aria-label="Previous journey update"><ArrowLeft size={15}/></button>
              <div className="ec-sales-editorial__dots">{JOURNEY_NOTES.map((item,index)=><button key={item.eyebrow} type="button" onClick={()=>setActiveNote(index)} className={index===activeNote?"is-active":""} aria-label={`Show update ${index+1}`} aria-current={index===activeNote?"true":undefined}/>)}</div>
              <button type="button" onClick={() => moveNote(1)} aria-label="Next journey update"><ArrowRight size={15}/></button>
            </div>}
          </div>
        </div>
        <div className="ec-sales-editorial__figure">
          <p className="ec-sales-editorial__label">Products sold</p>
          <p className="ec-sales-editorial__number" aria-label={`${display} products sold`}>{display}<span>{reachedMilestone ? "+" : ""}</span></p>
          <p className="ec-sales-editorial__caption">{reachedMilestone ? "A thousand thanks — and counting" : "Our story keeps growing"}</p>
        </div>
      </div>
    </section>
  );
}
