import Link from "next/link";
import { ArrowRight, BadgeCheck, HeartHandshake, Link2, Share2, ShieldCheck, Sparkles, Users } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { AffiliateApplicationForm } from "@/components/affiliate-application-form";

const steps = [
  { icon: Share2, title: "Tell us about your audience", text: "Share your main platform, audience size and how you create or share content." },
  { icon: ShieldCheck, title: "Our team reviews your application", text: "We look at fit, audience and how you would represent the eCuisine brand." },
  { icon: Link2, title: "Receive your affiliate details", text: "Approved partners receive their referral arrangements, tracking information and commercial terms before promotion begins." },
];

export default function AffiliatesPage() {
  return (
    <main className="min-h-screen bg-[#f6f8f3] pb-24 text-[#203b2b]">
      <SiteHeader />
      <section className="relative isolate overflow-hidden bg-[#102b20] px-5 py-16 text-white sm:py-24">
        <div className="pointer-events-none absolute -right-24 -top-28 h-96 w-96 rounded-full border border-white/10" />
        <div className="pointer-events-none absolute -bottom-36 left-[12%] h-80 w-80 rounded-full border border-[#e3c66f]/20" />
        <div className="relative mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1.1fr_.9fr] lg:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#e5c978]/25 bg-white/5 px-4 py-2 text-[10px] font-black uppercase tracking-[.2em] text-[#f0d98c]"><HeartHandshake size={14}/> eCuisine Partner Programme</span>
            <h1 className="mt-6 max-w-3xl text-4xl font-black leading-[1.04] tracking-[-.05em] sm:text-6xl">Good food travels further when we share it.</h1>
            <p className="mt-5 max-w-xl text-sm leading-7 text-[#d4e0d5] sm:text-base">Join a working partnership with eCuisine. Partners may promote products, support social media activity, create content, participate in campaigns and help us serve our community—with clear briefs, responsibilities, deadlines and work reviews.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#affiliate-application" className="inline-flex items-center gap-2 rounded-xl bg-[#e7c96e] px-5 py-3.5 text-xs font-black text-[#173b2b] shadow-lg transition hover:-translate-y-0.5 hover:bg-[#f4da89]">Apply for partnership <ArrowRight size={15}/></a>
              <Link href="/about" className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-5 py-3.5 text-xs font-bold text-white transition hover:bg-white/10">Meet eCuisine</Link><Link href="/partner" className="inline-flex items-center gap-2 rounded-xl border border-[#e7c96e]/40 bg-[#e7c96e]/10 px-5 py-3.5 text-xs font-bold text-[#f0d98c] transition hover:bg-[#e7c96e]/20">Partner login <ArrowRight size={14}/></Link>
            </div>
            <p className="mt-5 text-[11px] leading-5 text-[#a9bcae]">No payment is required to submit an application. Commercial terms are shared with accepted affiliates before any promotion starts.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <article className="rounded-3xl border border-white/10 bg-white/[.06] p-5 backdrop-blur">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#e7c96e]/15 text-[#f0d98c]"><Users size={20}/></span>
              <h2 className="mt-4 text-base font-extrabold text-white">Creators & communities</h2>
              <p className="mt-2 text-xs leading-6 text-[#c5d4c7]">For content creators, community builders and people with trusted audiences.</p>
            </article>
            <article className="rounded-3xl border border-white/10 bg-white/[.06] p-5 backdrop-blur sm:translate-y-8">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#e7c96e]/15 text-[#f0d98c]"><BadgeCheck size={20}/></span>
              <h2 className="mt-4 text-base font-extrabold text-white">Clear partner terms</h2>
              <p className="mt-2 text-xs leading-6 text-[#c5d4c7]">Referral links, commission details and payout arrangements are confirmed before launch.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-12 sm:py-16">
        <div className="max-w-2xl">
          <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#9a7832]">How it works</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-[#173c2b] sm:text-4xl">A clear, accountable partnership.</h2>
          <p className="mt-3 text-sm leading-7 text-[#718174]">We start with a conversation, then confirm the practical details with approved partners.</p>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {steps.map((step,index)=><article key={step.title} className="rounded-3xl border border-[#e1e9df] bg-white p-6 shadow-[0_12px_35px_rgba(23,61,39,.045)]">
            <div className="flex items-center justify-between"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#edf4e9] text-[#356344]"><step.icon size={21}/></span><span className="text-xs font-black tracking-[.16em] text-[#b28b3d]">0{index+1}</span></div>
            <h3 className="mt-5 text-base font-extrabold text-[#244331]">{step.title}</h3>
            <p className="mt-2 text-sm leading-6 text-[#778579]">{step.text}</p>
          </article>)}
        </div>
      </section>

      <section id="affiliate-application" className="mx-auto grid max-w-6xl scroll-mt-24 gap-8 px-5 pb-14 lg:grid-cols-[.72fr_1.28fr] lg:items-start">
        <div className="lg:sticky lg:top-28">
          <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#9a7832]">Your next step</p>
          <h2 className="mt-3 text-3xl font-black leading-tight tracking-tight text-[#173c2b]">Let’s grow something good.</h2>
          <p className="mt-4 text-sm leading-7 text-[#718174]">Complete the application and tell us about your strengths, experience, availability and the kind of work you can reliably deliver. Approved partners receive access to a dashboard with assigned activities and deadlines.</p>
          <div className="mt-6 rounded-2xl border border-[#e2eadf] bg-[#edf4e9] p-5">
            <div className="flex items-center gap-2 text-sm font-extrabold text-[#315b3e]"><Sparkles size={16}/> A clear process</div>
            <p className="mt-2 text-xs leading-6 text-[#6e806f]">An application is not automatic approval. We will contact you with the next steps and agreed terms if your profile is a fit.</p>
          </div>
          <p className="mt-5 text-xs leading-6 text-[#879487]">Questions first? <a className="font-bold text-[#236448] underline underline-offset-2" href="mailto:ecuisinefoods@gmail.com?subject=Affiliate%20programme%20question">Email the eCuisine team</a>.</p>
        </div>
        <AffiliateApplicationForm />
      </section>
    </main>
  );
}
