import Link from "next/link";
import { ArrowRight, BadgeCheck, Boxes, ChartNoAxesCombined, ShieldCheck, Users } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { AffiliateProgrammeApplicationForm } from "@/components/affiliate-programme-application-form";

export default function AffiliatesPage() {
  return (
    <main className="min-h-screen bg-[#f6f8f3] pb-24 text-[#203b2b]">
      <SiteHeader />
      <section className="relative isolate overflow-hidden bg-[#102b20] px-5 py-16 text-white sm:py-24">
        <div className="pointer-events-none absolute -right-24 -top-28 h-96 w-96 rounded-full border border-white/10" />
        <div className="pointer-events-none absolute -bottom-36 left-[12%] h-80 w-80 rounded-full border border-[#e3c66f]/20" />
        <div className="relative mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1.1fr_.9fr] lg:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#e5c978]/25 bg-white/5 px-4 py-2 text-[10px] font-black uppercase tracking-[.2em] text-[#f0d98c]"><Users size={14}/> eCuisinefoods Affiliate Programme</span>
            <h1 className="mt-6 max-w-3xl text-4xl font-black leading-[1.04] tracking-[-.05em] sm:text-6xl">Grow through trusted relationships. Build sales together.</h1>
            <p className="mt-5 max-w-xl text-sm leading-7 text-[#d4e0d5] sm:text-base">Join a structured sales community built around real customer relationships, reliable product distribution, verified sales and shared growth.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#affiliate-application" className="inline-flex items-center gap-2 rounded-xl bg-[#e7c96e] px-5 py-3.5 text-xs font-black text-[#173b2b] shadow-lg transition hover:-translate-y-0.5 hover:bg-[#f4da89]">Apply to join <ArrowRight size={15}/></a>
              <Link href="/about" className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-5 py-3.5 text-xs font-bold text-white transition hover:bg-white/10">Discover eCuisinefoods</Link>
            </div>
            <p className="mt-5 text-[11px] leading-5 text-[#a9bcae]">Every application is reviewed. Programme terms and access are confirmed by management before participation begins.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <article className="rounded-3xl border border-white/10 bg-white/[.06] p-5 backdrop-blur">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#e7c96e]/15 text-[#f0d98c]"><Boxes size={20}/></span>
              <h2 className="mt-4 text-base font-extrabold text-white">Reseller model</h2>
              <p className="mt-2 text-xs leading-6 text-[#c5d4c7]">Work with authorised stock sources, serve customers and earn through the difference between your approved stock acquisition price and selling price.</p>
            </article>
            <article className="rounded-3xl border border-white/10 bg-white/[.06] p-5 backdrop-blur sm:translate-y-8">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#e7c96e]/15 text-[#f0d98c]"><ChartNoAxesCombined size={20}/></span>
              <h2 className="mt-4 text-base font-extrabold text-white">Commission model</h2>
              <p className="mt-2 text-xs leading-6 text-[#c5d4c7]">Generate customer sales and earn commission on eligible sales after payment and management verification, under agreed programme terms.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-12 sm:py-16">
        <div className="max-w-2xl">
          <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#9a7832]">Built for sustainable growth</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-[#173c2b] sm:text-4xl">A clear system. Shared progress.</h2>
          <p className="mt-3 text-sm leading-7 text-[#718174]">The programme is designed to help affiliates understand their responsibilities, record customer sales and follow their progress with confidence.</p>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            {icon:ShieldCheck,title:"Verified sales",text:"Sales are submitted through the portal and reviewed by management. Only eligible approved sales count towards programme performance."},
            {icon:BadgeCheck,title:"Clear progression",text:"Beginner, Intermediate and Advanced levels provide a structured path for performance and development. Targets and terms are communicated after approval."},
            {icon:Users,title:"A supported community",text:"Training, announcements, team engagement and regular progress reviews help affiliates stay informed and active."}
          ].map((item,index)=><article key={item.title} className="rounded-3xl border border-[#e1e9df] bg-white p-6 shadow-[0_12px_35px_rgba(23,61,39,.045)]">
            <div className="flex items-center justify-between"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#edf4e9] text-[#356344]"><item.icon size={21}/></span><span className="text-xs font-black tracking-[.16em] text-[#b28b3d]">0{index+1}</span></div>
            <h3 className="mt-5 text-base font-extrabold text-[#244331]">{item.title}</h3>
            <p className="mt-2 text-sm leading-6 text-[#778579]">{item.text}</p>
          </article>)}
        </div>
      </section>

      <section id="affiliate-application" className="mx-auto grid max-w-6xl scroll-mt-24 gap-8 px-5 pb-14 lg:grid-cols-[.72fr_1.28fr] lg:items-start">
        <div className="lg:sticky lg:top-28">
          <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#9a7832]">Start here</p>
          <h2 className="mt-3 text-3xl font-black leading-tight tracking-tight text-[#173c2b]">Let’s build meaningful growth together.</h2>
          <p className="mt-4 text-sm leading-7 text-[#718174]">Choose the affiliate model that best suits you and send us your details. Our team will review your application and contact you about the next steps.</p>
          <div className="mt-6 rounded-2xl border border-[#e2eadf] bg-[#edf4e9] p-5">
            <div className="flex items-center gap-2 text-sm font-extrabold text-[#315b3e]"><ShieldCheck size={16}/> Your information stays protected</div>
            <p className="mt-2 text-xs leading-6 text-[#6e806f]">Bank details are not collected on this public form. They are requested separately only when needed through an authorised process.</p>
          </div>
          <p className="mt-5 text-xs leading-6 text-[#879487]">Questions? <a className="font-bold text-[#236448] underline underline-offset-2" href="mailto:ecuisinefoods@gmail.com?subject=Affiliate%20programme%20question">Email the eCuisinefoods team</a>.</p>
        </div>
        <AffiliateProgrammeApplicationForm />
      </section>
    </main>
  );
}
