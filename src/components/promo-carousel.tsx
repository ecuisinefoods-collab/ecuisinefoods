"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, BadgePercent, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Banner = {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string | null;
  media_type?: "image" | "video";
  target_url: string | null;
  animation_effect: "fade" | "slide" | "zoom";
  slide_duration_ms: number;
  transition_duration_ms: number;
  show_cta: boolean;
};

const fallback: Banner[] = [{
  id: "welcome",
  title: "Good things are coming!",
  subtitle: "Watch this space for our first special offer.",
  image_url: null,
  media_type: "image",
  target_url: "/shop",
  animation_effect: "fade",
  slide_duration_ms: 5000,
  transition_duration_ms: 600,
  show_cta: true,
}];

export function PromoCarousel() {
  const [banners, setBanners] = useState<Banner[]>(fallback);
  const [active, setActive] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      if (!supabase) { setLoaded(true); return; }
      const { data } = await supabase
        .from("promotional_banners")
        .select("id,title,subtitle,image_url,media_type,target_url,animation_effect,slide_duration_ms,transition_duration_ms,show_cta")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (alive && data?.length) setBanners(data as Banner[]);
      if (alive) setLoaded(true);
    };
    void load();
    return () => { alive = false; };
  }, []);

  const current = banners[active] ?? banners[0];
  useEffect(() => {
    if (banners.length < 2) return;
    const timer = window.setInterval(() => setActive((index) => (index + 1) % banners.length), current?.slide_duration_ms ?? 5000);
    return () => window.clearInterval(timer);
  }, [banners, current?.slide_duration_ms]);

  const move = (direction: number) => setActive((index) => (index + direction + banners.length) % banners.length);
  const effect = current?.animation_effect ?? "fade";

  return (
    <section id="promotions" className="mx-auto max-w-7xl scroll-mt-28 px-5 pb-8">
      <div key={current?.id ?? "promo"} className={`promo-stage promo-${effect} relative isolate overflow-hidden rounded-[1.6rem] bg-gradient-to-r from-[#153b2b] via-[#245b42] to-[#315f43] px-6 py-7 text-white shadow-lg sm:px-10 sm:py-9`} style={{ transitionDuration: `${current?.transition_duration_ms ?? 600}ms` }}>
        {current?.image_url && (current.media_type === "video" ? <video src={current.image_url} autoPlay muted loop playsInline className="absolute inset-0 z-0 h-full w-full object-cover opacity-35" /> : <div className="absolute inset-0 z-0 bg-cover bg-center opacity-25" style={{ backgroundImage: `url("${current.image_url}")` }} />)}
        <div className="absolute inset-0 z-0 bg-gradient-to-r from-[#153b2b]/75 via-[#245b42]/60 to-[#315f43]/65" />
        <div className="absolute -right-8 -top-16 z-10 h-56 w-56 rounded-full border-[24px] border-white/5" />
        <div className="absolute right-1/4 top-4 z-10 text-[#d5bd75]/70"><Sparkles size={22}/></div>
        <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4"><div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white/10 text-[#f3d98e]"><BadgePercent size={31}/></div><div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#d6e2d1]">eCuisinefoods special</p><h2 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">{current?.title}</h2><p className="mt-1 text-sm text-[#e0e9dc]">{current?.subtitle}</p></div></div>
          {current?.show_cta && <Link href={current.target_url || "/shop"} className="inline-flex items-center justify-center gap-2 self-start rounded-full bg-[#f5e7bd] px-5 py-3 text-xs font-extrabold text-[#254632] transition hover:bg-white">Explore offer <ArrowRight size={15}/></Link>}
        </div>
        {banners.length > 1 && <div className="relative mt-5 flex items-center justify-between"><div className="flex gap-1.5">{banners.map((banner, index) => <button key={banner.id} aria-label={`Show promotion ${index + 1}`} onClick={() => setActive(index)} className={`h-1.5 rounded-full transition-all ${index === active ? "w-8 bg-white" : "w-3 bg-white/35"}`}/>)}</div><div className="flex gap-2"><button onClick={() => move(-1)} aria-label="Previous promotion" className="rounded-full border border-white/30 p-2 hover:bg-white/10"><ChevronLeft size={16}/></button><button onClick={() => move(1)} aria-label="Next promotion" className="rounded-full border border-white/30 p-2 hover:bg-white/10"><ChevronRight size={16}/></button></div></div>}
      </div>
      {!loaded && <span className="sr-only">Loading promotions</span>}
    </section>
  );
}
