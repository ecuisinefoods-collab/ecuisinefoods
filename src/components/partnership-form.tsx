"use client";

import { FormEvent, useState } from "react";
import { ArrowUpRight, CheckCircle2, LoaderCircle, Send } from "lucide-react";
import { supabase } from "@/lib/supabase";

const interests = [
  "Retail distribution / stockist",
  "Wholesale supply",
  "Corporate & institutional supply",
  "Brand collaboration / marketing",
  "Strategic partnership / investment",
  "Other",
];

export function PartnershipForm() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [organization, setOrganization] = useState("");
  const [interest, setInterest] = useState(interests[0]);
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState("");
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (website.trim()) {
      setSuccess(true);
      return;
    }
    if (!supabase) {
      setError("The enquiry form is temporarily unavailable. Please email ecuisinefoods@gmail.com.");
      return;
    }
    setBusy(true);
    const { error: submitError } = await supabase.from("partnership_inquiries").insert({
      full_name: fullName.trim(),
      email: email.trim(),
      phone: phone.trim() || null,
      organization: organization.trim() || null,
      interest,
      message: message.trim(),
    });
    setBusy(false);
    if (submitError) {
      setError("We could not send your enquiry just now. Please try again, or email ecuisinefoods@gmail.com.");
      return;
    }
    setSuccess(true);
    setFullName("");
    setEmail("");
    setPhone("");
    setOrganization("");
    setInterest(interests[0]);
    setMessage("");
  }

  if (success) {
    return (
      <div className="ec-partnership-success rounded-[1.6rem] border p-8 sm:p-10" role="status">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[#e2f2e6] text-[#176044]"><CheckCircle2 size={27}/></span>
        <h2 className="mt-5 text-2xl font-black text-[#173c2b]">Thank you for your interest.</h2>
        <p className="mt-3 max-w-lg text-sm leading-7 text-[#66796c]">Your partnership enquiry has been sent to the eCuisine team. We’ll review the details and contact you using the information you provided.</p>
        <button type="button" onClick={() => setSuccess(false)} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#0b6849] px-5 py-3 text-xs font-extrabold text-white">Send another enquiry <ArrowUpRight size={14}/></button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="ec-partnership-form rounded-[1.7rem] border p-6 sm:p-8" noValidate={false}>
      <div className="mb-6">
        <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#9a7832]">Tell us a little about it</p>
        <h2 className="mt-2 text-2xl font-black tracking-tight text-[#173c2b]">Start a conversation</h2>
        <p className="mt-2 text-xs leading-6 text-[#748277]">Share a few details so the right person on our team can follow up.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-xs font-bold text-[#405648]">Full name <span className="text-[#b27636]">*</span>
          <input required minLength={2} maxLength={120} autoComplete="name" value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="Your name" className="mt-2 w-full rounded-xl border px-4 py-3 text-sm outline-none"/>
        </label>
        <label className="block text-xs font-bold text-[#405648]">Work email <span className="text-[#b27636]">*</span>
          <input required type="email" maxLength={254} autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@company.com" className="mt-2 w-full rounded-xl border px-4 py-3 text-sm outline-none"/>
        </label>
        <label className="block text-xs font-bold text-[#405648]">Phone / WhatsApp
          <input type="tel" maxLength={40} autoComplete="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+234 ..." className="mt-2 w-full rounded-xl border px-4 py-3 text-sm outline-none"/>
        </label>
        <label className="block text-xs font-bold text-[#405648]">Company / organisation
          <input maxLength={160} autoComplete="organization" value={organization} onChange={e=>setOrganization(e.target.value)} placeholder="Business or organisation name" className="mt-2 w-full rounded-xl border px-4 py-3 text-sm outline-none"/>
        </label>
      </div>
      <label className="mt-4 block text-xs font-bold text-[#405648]">What would you like to explore? <span className="text-[#b27636]">*</span>
        <select required value={interest} onChange={e=>setInterest(e.target.value)} className="mt-2 w-full rounded-xl border px-4 py-3 text-sm outline-none">
          {interests.map(value=><option key={value} value={value}>{value}</option>)}
        </select>
      </label>
      <label className="mt-4 block text-xs font-bold text-[#405648]">Tell us a little about your idea <span className="text-[#b27636]">*</span>
        <textarea required minLength={20} maxLength={3000} rows={5} value={message} onChange={e=>setMessage(e.target.value)} placeholder="What opportunity do you have in mind, and how do you see us working together?" className="mt-2 w-full resize-y rounded-xl border px-4 py-3 text-sm leading-6 outline-none"/>
        <span className="mt-1 block text-right text-[10px] font-medium text-[#98a398]">{message.length}/3000</span>
      </label>
      <div className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
        <label>Leave this field empty<input tabIndex={-1} autoComplete="off" value={website} onChange={e=>setWebsite(e.target.value)}/></label>
      </div>
      {error ? <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs leading-5 text-red-700" role="alert">{error}</p> : null}
      <button type="submit" disabled={busy} className="mt-5 inline-flex w-full items-center justify-center gap-3 rounded-xl bg-[#0b6849] px-5 py-4 text-sm font-extrabold text-white shadow-lg shadow-[#0b6849]/15 transition hover:-translate-y-0.5 hover:bg-[#084f39] disabled:cursor-wait disabled:opacity-65 sm:w-auto">
        {busy ? <><LoaderCircle size={16} className="animate-spin"/> Sending enquiry…</> : <>Send partnership enquiry <Send size={15}/></>}
      </button>
      <p className="mt-4 text-[10px] leading-5 text-[#8c998d]">Your details will only be used by eCuisine to respond to this partnership enquiry. Please do not include passwords, payment card details or other sensitive information.</p>
    </form>
  );
}
