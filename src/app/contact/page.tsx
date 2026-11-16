import Link from "next/link";
import { ClipboardList, Mail, MapPin, MessageCircle, PackageCheck } from "lucide-react";
import { SiteHeader } from "@/components/site-header";

const supportMessage = encodeURIComponent("Hello eCuisine, I need help with an order. Please assist me.");
const whatsappUrl = "https://wa.me/2348080942328?text=" + supportMessage;

export default function ContactPage() {
  return (
    <main className="storefront-glass min-h-screen bg-[#fbfaf7]">
      <div className="bg-[#173e2d] px-4 py-2 text-center text-xs text-white">Good food, better living</div>
      <SiteHeader />
      <section className="px-5 py-12 sm:py-16">
        <div className="mx-auto max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-[.18em] text-[#78906b]">We are here to help</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-[#173e2d]">Contact eCuisine</h1>
          <p className="mt-4 max-w-2xl leading-7 text-[#68766b]">
            Need help with an order, payment verification, a product or a pickup location? Choose the support route that works best for you.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-2xl border border-[#d5e5d4] bg-[#edf5ea] p-5 transition hover:border-[#a9c8aa]">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#16834a] text-white"><MessageCircle size={19} /></span>
              <span><span className="block text-xs font-semibold text-[#68806b]">Fastest support</span><span className="mt-1 block text-base font-bold text-[#244b34]">Chat on WhatsApp</span><span className="mt-1 block text-xs text-[#718071]">+234 808 094 2328</span></span>
            </a>
            <a href="mailto:ecuisinefoods@gmail.com" className="flex items-center gap-3 rounded-2xl border border-[#e7e9e1] bg-white p-5 transition hover:bg-[#fbfaf7]">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#edf3e9] text-[#245b42]"><Mail size={19} /></span>
              <span><span className="block text-xs text-[#8a9689]">Email</span><span className="mt-1 block text-base font-bold text-[#203329]">ecuisinefoods@gmail.com</span><span className="mt-1 block text-xs text-[#879286]">For general questions and enquiries</span></span>
            </a>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <Link href="/track" className="rounded-2xl border border-[#e7e9e1] bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-lg">
              <PackageCheck size={21} className="text-[#245b42}" />
              <h2 className="mt-4 font-bold text-[#203329]">Track an order</h2>
              <p className="mt-2 text-sm leading-6 text-[#718071]">Check the latest status with your private tracking code.</p>
              <span className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-[#245b42]">Open order tracking <ClipboardList size={14} /></span>
            </Link>
            <Link href="/faq" className="rounded-2xl border border-[#e7e9e1] bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-lg">
              <ClipboardList size={21} className="text-[#245b42]" />
              <h2 className="mt-4 font-bold text-[#203329]">Help and FAQs</h2>
              <p className="mt-2 text-sm leading-6 text-[#718071]">Find guidance about checkout, bank transfer, receipts and pickup.</p>
              <span className="mt-4 inline-flex text-xs font-bold text-[#245b42]">Visit help centre</span>
            </Link>
            <div className="rounded-2xl border border-[#e7e9e1] bg-white p-5">
              <MapPin size={21} className="text-[#245b42}" />
              <h2 className="mt-4 font-bold text-[#203329]">Pickup locations</h2>
              <p className="mt-2 text-sm leading-6 text-[#718071]">Choose an active Jos or Bauchi pickup point during checkout. Wait for order confirmation before visiting.</p>
              <span className="mt-4 inline-flex text-xs font-bold text-[#245b42]">Jos · Bauchi</span>
            </div>
          </div>

          <p className="mt-8 rounded-xl bg-[#f7f4ec] p-4 text-sm leading-6 text-[#68766b]">
            For payment verification, include your order number in your message. A transfer screenshot alone does not mark an order as paid; our team confirms payment only after checking the business account.
          </p>
        </div>
      </section>
    </main>
  );
}
