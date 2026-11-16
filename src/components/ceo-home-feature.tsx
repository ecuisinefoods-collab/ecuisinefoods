"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Quote, Sparkles, UserRound } from "lucide-react";
import { supabase } from "@/lib/supabase";

type CEOStory = { ceo_name?: string; ceo_role?: string; ceo_image?: string; ceo_message?: string; ceo_eyebrow?: string };
const fallback: CEOStory = {
  ceo_name: "",
  ceo_role: "Chief Executive Officer · eCuisinefoods",
  ceo_eyebrow: "A message from our leadership",
  ceo_message: "Every meaningful brand is built through trust, consistency and the people it serves. At eCuisinefoods, we are committed to making thoughtful food choices easier to discover and enjoy. Thank you for being part of our journey."
};

export function CEOHomeFeature() {
  const [story, setStory] = useState<CEOStory>(fallback);
  useEffect(() => {
    if (!supabase) return;
    let active = true;
    supabase.from("site_settings").select("setting_value").eq("setting_key", "about_page_config").maybeSingle().then(({ data }) => {
      if (!active || !data?.setting_value) return;
      try { setStory({ ...fallback, ...JSON.parse(data.setting_value) }); } catch { /* retain safe copy */ }
    });
    return () => { active = false; };
  }, []);
  const message = (story.ceo_message || fallback.ceo_message || "").split(/\n\s*\n/).map((p) => p.trim()).filter((p) => p.length > 25)[0] || fallback.ceo_message;
  return (
    <section className="ec-home-ceo relative overflow-hidden py-14 sm:py-20">
      <div className="mx-auto grid max-w-7xl items-center gap-9 px-5 md:grid-cols-[.72fr_1.28fr] md:gap-16">
        <div className="ec-home-ceo__portrait-wrap relative mx-auto w-full max-w-[330px]">
          <div className="ec-home-ceo__portrait relative aspect-[4/4.4] overflow-hidden rounded-[2rem]">
            {story.ceo_image ? <img src={story.ceo_image} alt={story.ceo_name || "eCuisinefoods Chief Executive Officer"} className="h-full w-full object-cover object-center" /> : <div className="grid h-full place-items-center bg-[radial-gradient(circle_at_35%_25%,#d8e8c9,#9fbd9b_55%,#285b3d)] text-[#f5e6b6]"><span className="grid h-28 w-28 place-items-center rounded-full border border-white/40 bg-white/10"><UserRound size={54}/></span></div>}
          </div>
          <span className="ec-home-ceo__seal"><Sparkles size={17}/> eCuisinefoods</span>
        </div>
        <div className="max-w-3xl">
          <p className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[.22em] text-[#a47c26]"><Quote size={15}/>{story.ceo_eyebrow || "A message from our leadership"}</p>
          <h2 className="mt-4 text-3xl font-black leading-tight tracking-[-.045em] text-[#173d2b] sm:text-5xl">A personal word from our CEO.</h2>
          <p className="mt-6 max-w-2xl text-base leading-8 text-[#637468] sm:text-lg sm:leading-9">{message}</p>
          <div className="mt-7 border-t border-[#dce5d8] pt-5">
            <p className="text-lg font-black text-[#204b33]">{story.ceo_name || "Chief Executive Officer"}</p>
            <p className="mt-1 text-xs font-bold text-[#a47c26]">{story.ceo_role || fallback.ceo_role}</p>
          </div>
          <Link href="/about#ceo-message" className="mt-7 inline-flex items-center gap-2 rounded-full bg-[#17583a] px-6 py-3.5 text-xs font-extrabold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-[#10452e]">Read our full story <ArrowRight size={15}/></Link>
        </div>
      </div>
    </section>
  );
}
