"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown, CircleHelp, Search, ShieldCheck, Truck, Wallet } from "lucide-react";
import { SiteHeader } from "@/components/site-header";

const faqs = [
  { category: "Orders", question: "How do I place an order?", answer: "Visit Shop, choose a product and pack size, add it to your cart, then complete checkout with your contact details and preferred pickup or delivery option." },
  { category: "Pickup", question: "Where can I collect my order?", answer: "Choose one of the available eCuisine pickup points in Jos or Bauchi during checkout. Please wait for the team to confirm that your order is ready before visiting the location." },
  { category: "Payments", question: "How does bank transfer work?", answer: "When bank transfer is available and selected, submit your checkout details first. Your confirmation page will display the bank name, account name, account number, exact amount and a unique transfer narration/reference. Enter that reference exactly in your banking app." },
  { category: "Payments", question: "How do I send my transfer receipt?", answer: "After making the transfer, return to your order confirmation page and select “I have made the transfer — send screenshot on WhatsApp”. WhatsApp opens with your order details. Attach the transfer receipt screenshot from your phone and send it to eCuisine." },
  { category: "Payments", question: "When is my bank transfer confirmed?", answer: "A transfer is not confirmed just because an order was submitted or a screenshot was sent. Your order stays pending until the eCuisine team checks the business account and manually verifies that the funds have arrived." },
  { category: "Payments", question: "Can I pay when I collect or receive my order?", answer: "Cash on pickup or cash on delivery will appear at checkout when that option is enabled for the selected fulfilment method. Follow the payment options shown for your order." },
  { category: "Orders", question: "How do I track my order?", answer: "Use the private tracking code shown after checkout. Open Track an order, paste the code and view the latest status, fulfilment details and items. A tracking link is also provided after checkout." },
  { category: "Delivery", question: "Is home delivery available everywhere?", answer: "Delivery is offered only in areas configured by eCuisine. If no delivery area is available for your address, choose one of the pickup points shown at checkout." },
  { category: "Products", question: "How do I know a product's price or pack size?", answer: "Available pack sizes and current prices are displayed on each product page and in your cart before you place the order." },
  { category: "Products", question: "Can I ask about ingredients or nutrition?", answer: "Product information is displayed when verified details have been provided. Contact our team if you need help with a product question." },
];

const categories = ["All topics", "Orders", "Payments", "Pickup", "Delivery", "Products"];

export default function FAQPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All topics");
  const visibleFaqs = useMemo(() => faqs.filter(item => {
    const matchesCategory = category === "All topics" || item.category === category;
    const term = search.trim().toLowerCase();
    const matchesSearch = !term || (item.question + " " + item.answer).toLowerCase().includes(term);
    return matchesCategory && matchesSearch;
  }), [category, search]);

  return (
    <main className="min-h-screen bg-[#f5f7f2] pb-24">
      <SiteHeader />
      <section className="relative overflow-hidden bg-gradient-to-br from-[#173e2d] via-[#20553c] to-[#2d6749] px-5 py-14 text-white sm:py-20">
        <div className="pointer-events-none absolute -right-10 -top-28 h-72 w-72 rounded-full border border-white/10" />
        <div className="pointer-events-none absolute right-16 top-12 h-36 w-36 rounded-full border border-white/10" />
        <div className="relative mx-auto max-w-5xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.18em] text-[#dcebd9]"><CircleHelp size={13} /> eCuisine help centre</span>
          <h1 className="mt-5 max-w-2xl text-4xl font-semibold tracking-tight sm:text-6xl">Good answers. Less guesswork.</h1>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-[#e1ecdf] sm:text-base">Helpful information about ordering, bank transfers, receipts, pickup and getting your food to you.</p>
          <div className="mt-8 max-w-xl rounded-2xl bg-white p-2 shadow-xl shadow-black/10">
            <label htmlFor="faq-search" className="sr-only">Search help topics</label>
            <div className="flex items-center gap-3 px-3">
              <Search size={18} className="shrink-0 text-[#6e856e]" />
              <input id="faq-search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search a question or topic…" className="min-w-0 flex-1 bg-transparent py-3 text-sm text-[#203329] outline-none placeholder:text-[#9ba69a]" />
              {search && <button type="button" onClick={() => setSearch("")} className="text-xs font-bold text-[#245b42]">Clear</button>}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-8 px-5 py-10 lg:grid-cols-[220px_1fr] lg:py-14">
        <aside>
          <p className="text-[10px] font-black uppercase tracking-[.17em] text-[#8a9787]">Browse by topic</p>
          <div className="mt-4 flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible">
            {categories.map(item => (
              <button key={item} type="button" onClick={() => setCategory(item)} className={"shrink-0 rounded-full px-4 py-2.5 text-xs font-bold transition lg:w-full lg:rounded-xl lg:text-left " + (category === item ? "bg-[#245b42] text-white shadow-lg shadow-[#245b42]/10" : "bg-white text-[#667564] ring-1 ring-[#e6ece3] hover:bg-[#edf4e9]")}>
                {item}
              </button>
            ))}
          </div>
          <div className="mt-7 hidden rounded-2xl bg-[#eaf1e6] p-4 lg:block">
            <ShieldCheck size={20} className="text-[#46744e]" />
            <p className="mt-3 text-sm font-bold text-[#2c4e34]">Payment safety</p>
            <p className="mt-2 text-xs leading-5 text-[#71806e]">We only mark bank transfers as paid after the funds are verified in our account.</p>
          </div>
        </aside>

        <div>
          <div className="mb-5 flex items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.16em] text-[#8a9787]">{category}</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight text-[#1c3c29]">How can we help?</h2>
            </div>
            <span className="text-xs font-semibold text-[#8a9787]">{visibleFaqs.length} {visibleFaqs.length === 1 ? "answer" : "answers"}</span>
          </div>
          {visibleFaqs.length ? (
            <div className="space-y-3">
              {visibleFaqs.map((item, index) => (
                <details key={item.question} className="group rounded-2xl border border-[#e7ece4] bg-white p-5 shadow-[0_5px_24px_rgba(26,62,39,.035)] open:border-[#bcd1b8] open:shadow-[0_12px_35px_rgba(26,62,39,.07)] sm:p-6">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-bold leading-6 text-[#294432] marker:hidden">
                    <span><span className="mr-3 text-[10px] font-black text-[#9aa996]">{String(index + 1).padStart(2, "0")}</span>{item.question}</span>
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#f1f5ee] text-[#527357] transition group-open:rotate-180"><ChevronDown size={16} /></span>
                  </summary>
                  <p className="mt-4 max-w-3xl border-t border-[#edf1ea] pt-4 text-sm leading-7 text-[#718071]">{item.answer}</p>
                </details>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-[#cedacb] bg-white p-8 text-center">
              <Search size={24} className="mx-auto text-[#8b9b88]" />
              <p className="mt-3 font-bold text-[#38543d]">No matching answers</p>
              <p className="mt-1 text-sm text-[#819080]">Try another search term or choose a different topic.</p>
              <button type="button" onClick={() => { setSearch(""); setCategory("All topics"); }} className="mt-4 text-sm font-bold text-[#245b42]">Clear filters</button>
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 pb-10">
        <div className="grid gap-5 overflow-hidden rounded-[28px] bg-[#e9f0e5] p-6 sm:grid-cols-[1fr_auto] sm:items-center sm:p-8">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.16em] text-[#698368]">Still need a hand?</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#1f402b]">Our team is happy to help.</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[#73816f]">Get help with order progress, payment checks, product questions and pickup information.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/track" className="inline-flex items-center gap-2 rounded-full bg-[#245b42] px-5 py-3 text-sm font-bold text-white">Track order <Truck size={15} /></Link>
            <Link href="/contact" className="inline-flex items-center gap-2 rounded-full border border-[#cbd9c7] bg-white px-5 py-3 text-sm font-bold text-[#245b42]">Contact us <ArrowRight size={15} /></Link>
          </div>
        </div>
      </section>
    </main>
  );
}
