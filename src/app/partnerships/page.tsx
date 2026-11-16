import Link from "next/link";
import { ArrowRight, Building2, Handshake, ShieldCheck, Sparkles, Truck } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { PartnershipForm } from "@/components/partnership-form";

export default function PartnershipsPage() {
  return (
    <main className="storefront-glass min-h-screen pb-20 text-[#21382b]">
      <SiteHeader />
      <section className="ec-partnership-hero relative isolate overflow-hidden px-5 py-16 text-white sm:py-24">
        <div className="ec-partnership-hero__orb ec-partnership-hero__orb--one pointer-events-none absolute -right-16 -top-28 h-80 w-80 rounded-full" />
        <div className="ec-partnership-hero__orb ec-partnership-hero__orb--two pointer-events-none absolute -bottom-36 left-[15%] h-80 w-80 rounded-full" />
        <div className="relative mx-auto max-w-6xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-[10px] font-black uppercase tracking-[.2em] text-[#f4dfaa]"><Handshake size={14}/> Grow with eCuisine</span>
          <h1 className="mt-6 max-w-4xl text-4xl font-black leading-[1.03] tracking-[-.05em] sm:text-6xl">Good partnerships build better possibilities.</h1>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-white/75 sm:text-base">We welcome conversations with distributors, retailers, organisations and creative partners who share our interest in thoughtful food choices and better living.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#partnership-enquiry" className="inline-flex items-center gap-2 rounded-xl bg-[#f3d78c] px-5 py-3.5 text-xs font-black text-[#173c2b] shadow-lg hover:bg-[#ffe6a7]">Share an opportunity <ArrowRight size={15}/></a>
            <Link href="/about" className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 py-3.5 text-xs font-bold text-white hover:bg-white/15">Discover our story</Link>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-8 px-5 py-10 sm:py-14 lg:grid-cols-[.78fr_1.22fr] lg:items-start">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#9a7832]">Ways to work together</p>
          <h2 className="mt-3 text-3xl font-black leading-tight tracking-tight text-[#183d2b]">Let’s explore a fit.</h2>
          <p className="mt-3 text-sm leading-7 text-[#718174]">Every good relationship starts with a conversation. Tell us what you have in mind and our team will review it.</p>
          <div className="mt-7 space-y-3">
            {[
              {icon:Truck,title:"Distribution & stockists",text:"Retail, wholesale and regional distribution opportunities"},
              {icon:Building2,title:"Corporate & institutional",text:"Supply conversations with organisations and institutions"},
              {icon:Sparkles,title:"Brand collaborations",text:"Campaigns, events, content and complementary brand partnerships"},
              {icon:ShieldCheck,title:"Strategic opportunities",text:"Longer-term business relationships and investment discussions"}
            ].map(item=><article key={item.title} className="ec-partnership-path flex items-start gap-4 rounded-2xl border p-4"><span className="ec-partnership-path__icon grid h-11 w-11 shrink-0 place-items-center rounded-xl"><item.icon size={19}/></span><span><b className="block text-sm text-[#294a35]">{item.title}</b><small className="mt-1 block text-xs leading-5 text-[#829080]">{item.text}</small></span></article>)}
          </div>
          <div className="mt-6 rounded-2xl border border-[#e7e5d8] bg-[#fbf8ee] p-5">
            <p className="text-xs font-extrabold text-[#4a5c4b]">Prefer email?</p>
            <a href="mailto:ecuisinefoods@gmail.com?subject=eCuisine%20partnership%20enquiry" className="mt-2 inline-flex items-center gap-2 text-sm font-bold text-[#146348]">ecuisinefoods@gmail.com <ArrowRight size={14}/></a>
          </div>
        </div>
        <div id="partnership-enquiry" className="scroll-mt-24">
          <PartnershipForm />
        </div>
      </section>
    </main>
  );
}
