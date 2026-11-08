import Link from "next/link";
import { ArrowLeft, Mail, MessageCircle } from "lucide-react";

export default function ContactPage() {
  return <main className="min-h-screen bg-[#f7f4ec] px-5 py-12">
    <div className="mx-auto max-w-3xl">
      <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-[#245b42]"><ArrowLeft size={15}/> Back to home</Link>
      <div className="mt-8 rounded-3xl border border-[#e4e7dd] bg-white p-7 sm:p-10">
        <p className="text-xs font-bold uppercase tracking-[.18em] text-[#78906b]">We are here to help</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#173e2d] sm:text-4xl">Contact eCuisinefoods</h1>
        <p className="mt-4 max-w-xl leading-7 text-[#68766b]">Questions about our products, pickup locations or an order? Reach out and our team will help you.</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <a href="mailto:ecuisinefoods@gmail.com" className="flex items-center gap-3 rounded-2xl border border-[#e7e9e1] p-4 transition hover:bg-[#fbfaf7]"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#edf3e9] text-[#245b42]"><Mail size={18}/></span><span><span className="block text-xs text-[#8a9689]">Email</span><span className="mt-1 block text-sm font-bold text-[#203329]">ecuisinefoods@gmail.com</span></span></a>
          <a href="https://wa.me/2348080942328" className="flex items-center gap-3 rounded-2xl border border-[#e7e9e1] p-4 transition hover:bg-[#fbfaf7]"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#edf3e9] text-[#245b42]"><MessageCircle size={18}/></span><span><span className="block text-xs text-[#8a9689]">WhatsApp</span><span className="mt-1 block text-sm font-bold text-[#203329]">+234 808 094 2328</span></span></a>
        </div>
        <p className="mt-8 rounded-xl bg-[#f7f4ec] p-4 text-sm leading-6 text-[#68766b]">For pickup orders, please wait for your order confirmation before visiting your selected location.</p>
      </div>
    </div>
  </main>;
}
