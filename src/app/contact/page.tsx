import Link from "next/link";
import { ArrowUpRight, ClipboardList, Handshake, Mail, MapPin, MessageCircle, PackageCheck, ShieldCheck } from "lucide-react";
import { SiteHeader } from "@/components/site-header";

const supportText = encodeURIComponent("Hello eCuisine, I need help. Please assist me.");
const whatsappUrl = "https://wa.me/2348080942328?text=" + supportText;

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-[#f5f7f2] pb-24">
      <SiteHeader />
      <section className="relative overflow-hidden bg-gradient-to-br from-[#173e2d] via-[#20553c] to-[#2d6749] px-5 py-14 text-white sm:py-20">
        <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full border border-white/10" />
        <div className="relative mx-auto max-w-5xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.18em] text-[#dcebd9]"><MessageCircle size={13} /> Real people, ready to help</span>
          <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight sm:text-6xl">We’re here for your next good thing.</h1>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-[#e1ecdf] sm:text-base">Questions about an order, payment, product or pickup? Reach out and our team will help you find the right answer.</p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-10 sm:py-14">
        <div className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="group flex min-h-[240px] flex-col justify-between rounded-[28px] bg-[#1d8b50] p-7 text-white shadow-[0_20px_55px_rgba(29,139,80,.18)] transition hover:-translate-y-1 hover:bg-[#177642] sm:p-9">
            <div className="flex items-start justify-between gap-4">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white/15"><MessageCircle size={26} /></span>
              <ArrowUpRight size={20} className="text-white/70 transition group-hover:-translate-y-1 group-hover:translate-x-1" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.18em] text-white/70">Fastest support</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">Chat with eCuisine</h2>
              <p className="mt-2 text-sm text-white/80">WhatsApp · +234 808 094 2328</p>
            </div>
          </a>

          <a href="mailto:ecuisinefoods@gmail.com" className="group flex min-h-[240px] flex-col justify-between rounded-[28px] border border-[#e4ebe1] bg-white p-7 shadow-[0_15px_45px_rgba(24,57,37,.045)] transition hover:-translate-y-1 hover:shadow-[0_20px_55px_rgba(24,57,37,.08)] sm:p-9">
            <div className="flex items-start justify-between gap-4">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[#edf4e9] text-[#356344]"><Mail size={25} /></span>
              <ArrowUpRight size={20} className="text-[#a1ad9e] transition group-hover:-translate-y-1 group-hover:translate-x-1" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#91a08e]">Email</p>
              <h2 className="mt-2 break-all text-xl font-semibold tracking-tight text-[#25432f]">ecuisinefoods@gmail.com</h2>
              <p className="mt-2 text-sm text-[#829080]">For general questions and enquiries</p>
            </div>
          </a>
        </div>

        <div className="mt-9">
          <p className="text-[10px] font-black uppercase tracking-[.17em] text-[#8a9787]">Quick help</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#1c3c29]">Go straight to what you need</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Link href="/track" className="group rounded-2xl border border-[#e6ece3] bg-white p-5 transition hover:-translate-y-1 hover:shadow-lg hover:shadow-[#1a3e27]/5">
              <PackageCheck size={22} className="text-[#3e704b]" />
              <h3 className="mt-4 font-bold text-[#2a4732]">Track an order</h3>
              <p className="mt-2 text-sm leading-6 text-[#829080]">Check the latest status with your private tracking code.</p>
              <span className="mt-5 inline-flex items-center gap-2 text-xs font-bold text-[#356344]">Track my order <ArrowUpRight size={14} className="transition group-hover:translate-x-1 group-hover:-translate-y-1" /></span>
            </Link>
            <Link href="/faq" className="group rounded-2xl border border-[#e6ece3] bg-white p-5 transition hover:-translate-y-1 hover:shadow-lg hover:shadow-[#1a3e27]/5">
              <ClipboardList size={22} className="text-[#3e704b]" />
              <h3 className="mt-4 font-bold text-[#2a4732]">Help centre</h3>
              <p className="mt-2 text-sm leading-6 text-[#829080]">Find answers about checkout, bank transfers, receipts and pickup.</p>
              <span className="mt-5 inline-flex items-center gap-2 text-xs font-bold text-[#356344]">Read FAQs <ArrowUpRight size={14} className="transition group-hover:translate-x-1 group-hover:-translate-y-1" /></span>
            </Link>
            <div className="rounded-2xl border border-[#e6ece3] bg-white p-5">
              <MapPin size={22} className="text-[#3e704b]" />
              <h3 className="mt-4 font-bold text-[#2a4732]">Pickup points</h3>
              <p className="mt-2 text-sm leading-6 text-[#829080]">Choose an active Jos or Bauchi pickup location at checkout. Wait for confirmation before visiting.</p>
              <span className="mt-5 inline-flex text-xs font-bold text-[#356344]">Jos · Bauchi</span>
            </div>
            <Link href="/partnerships" className="group rounded-2xl border border-[#e6ece3] bg-white p-5 transition hover:-translate-y-1 hover:shadow-lg hover:shadow-[#1a3e27]/5">
              <Handshake size={22} className="text-[#3e704b]" />
              <h3 className="mt-4 font-bold text-[#2a4732]">Partner with eCuisine</h3>
              <p className="mt-2 text-sm leading-6 text-[#829080]">Explore distribution, corporate supply, brand collaborations and strategic opportunities.</p>
              <span className="mt-5 inline-flex items-center gap-2 text-xs font-bold text-[#356344]">Partnership enquiries <ArrowUpRight size={14} className="transition group-hover:translate-x-1 group-hover:-translate-y-1"/></span>
            </Link>
          </div>
        </div>

        <div className="mt-9 flex items-start gap-3 rounded-2xl border border-[#e3ebde] bg-[#edf4e9] p-5">
          <ShieldCheck size={20} className="mt-0.5 shrink-0 text-[#47744d]" />
          <div>
            <h3 className="text-sm font-bold text-[#2b4a33]">A note about payment confirmations</h3>
            <p className="mt-1 text-sm leading-6 text-[#758373]">A transfer screenshot alone does not mark an order as paid. Our team confirms payment only after checking that the funds have arrived in the business account. Please include your order number when contacting support.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
