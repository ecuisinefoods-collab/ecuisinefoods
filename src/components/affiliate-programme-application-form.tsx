"use client";

import { useState, type FormEvent } from "react";
import { CheckCircle2, LoaderCircle, Send } from "lucide-react";
import { supabase } from "@/lib/supabase";

export function AffiliateProgrammeApplicationForm() {
  const [fullName,setFullName]=useState("");
  const [email,setEmail]=useState("");
  const [phone,setPhone]=useState("");
  const [location,setLocation]=useState("");
  const [model,setModel]=useState<"reseller"|"commission">("reseller");
  const [note,setNote]=useState("");
  const [website,setWebsite]=useState("");
  const [busy,setBusy]=useState(false);
  const [success,setSuccess]=useState(false);
  const [error,setError]=useState("");

  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (website.trim()) { setSuccess(true); return; }
    if (!supabase) { setError("Applications are temporarily unavailable. Please email ecuisinefoods@gmail.com."); return; }
    setBusy(true);
    const {error:submitError}=await supabase.from("affiliate_program_applications").insert({
      full_name:fullName.trim(),
      email:email.trim().toLowerCase(),
      phone:phone.trim(),
      location:location.trim() || null,
      requested_model:model,
      experience_note:note.trim() || null
    });
    setBusy(false);
    if(submitError){setError("We could not submit your application. Please try again or email ecuisinefoods@gmail.com.");return;}
    setSuccess(true);
    setFullName("");setEmail("");setPhone("");setLocation("");setNote("");
  }

  if(success) return <div role="status" className="rounded-3xl border border-[#dce9dc] bg-white p-7 shadow-xl shadow-[#163b28]/[.06] sm:p-9">
    <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[#e7f3e8] text-[#176044]"><CheckCircle2 size={27}/></span>
    <h2 className="mt-5 text-2xl font-black text-[#173c2b]">Your application has been received.</h2>
    <p className="mt-3 text-sm leading-7 text-[#66796c]">Thank you for your interest in the eCuisinefoods Affiliate Programme. Our team will review your details and contact you about the next steps. Submission does not mean automatic approval.</p>
    <button type="button" onClick={()=>setSuccess(false)} className="mt-6 rounded-xl border border-[#dce5db] px-4 py-3 text-xs font-bold text-[#315b43]">Submit another application</button>
  </div>;

  return <form onSubmit={submit} className="rounded-3xl border border-[#e1e9df] bg-white p-6 shadow-xl shadow-[#163b28]/[.06] sm:p-8">
    <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#9a7832]">Application</p>
    <h2 className="mt-2 text-2xl font-black tracking-tight text-[#173c2b]">Tell us how you would like to participate</h2>
    <p className="mt-2 text-xs leading-6 text-[#748277]">Choose the model that best describes your interest. Final terms are confirmed individually after review.</p>
    <fieldset className="mt-6 grid gap-3 sm:grid-cols-2">
      <legend className="mb-3 text-xs font-bold text-[#405648]">Preferred affiliate model</legend>
      <label className={`cursor-pointer rounded-2xl border p-4 ${model==="reseller"?"border-[#2f7650] bg-[#f0f6ee]":"border-[#dce5db] bg-white"}`}>
        <input type="radio" name="affiliate-model" value="reseller" checked={model==="reseller"} onChange={()=>setModel("reseller")} className="mr-2 accent-[#0b6849]"/>
        <span className="text-sm font-extrabold text-[#294232]">Reseller</span>
        <span className="mt-2 block text-xs leading-5 text-[#718174]">Purchase or collect stock through an authorised source and earn from the difference between your acquisition price and selling price.</span>
      </label>
      <label className={`cursor-pointer rounded-2xl border p-4 ${model==="commission"?"border-[#2f7650] bg-[#f0f6ee]":"border-[#dce5db] bg-white"}`}>
        <input type="radio" name="affiliate-model" value="commission" checked={model==="commission"} onChange={()=>setModel("commission")} className="mr-2 accent-[#0b6849]"/>
        <span className="text-sm font-extrabold text-[#294232]">Commission-based</span>
        <span className="mt-2 block text-xs leading-5 text-[#718174]">Generate customer sales and earn commission on eligible sales after payment and management verification, subject to agreed terms.</span>
      </label>
    </fieldset>
    <div className="mt-5 grid gap-4 sm:grid-cols-2">
      <label className="text-xs font-bold text-[#405648]">Full name *
        <input required minLength={2} maxLength={160} autoComplete="name" value={fullName} onChange={e=>setFullName(e.target.value)} className="mt-2 w-full rounded-xl border border-[#dce5db] bg-[#fbfcfa] px-4 py-3 text-sm font-normal text-[#203b2b] outline-none focus:border-[#4c805b]" placeholder="Your full name"/>
      </label>
      <label className="text-xs font-bold text-[#405648]">Email address *
        <input required type="email" maxLength={254} autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} className="mt-2 w-full rounded-xl border border-[#dce5db] bg-[#fbfcfa] px-4 py-3 text-sm font-normal text-[#203b2b] outline-none focus:border-[#4c805b]" placeholder="you@example.com"/>
      </label>
      <label className="text-xs font-bold text-[#405648]">Phone / WhatsApp *
        <input required type="tel" maxLength={40} autoComplete="tel" value={phone} onChange={e=>setPhone(e.target.value)} className="mt-2 w-full rounded-xl border border-[#dce5db] bg-[#fbfcfa] px-4 py-3 text-sm font-normal text-[#203b2b] outline-none focus:border-[#4c805b]" placeholder="+234 ..."/>
      </label>
      <label className="text-xs font-bold text-[#405648]">Town / State
        <input maxLength={160} value={location} onChange={e=>setLocation(e.target.value)} className="mt-2 w-full rounded-xl border border-[#dce5db] bg-[#fbfcfa] px-4 py-3 text-sm font-normal text-[#203b2b] outline-none focus:border-[#4c805b]" placeholder="e.g. Jos, Plateau"/>
      </label>
    </div>
    <label className="mt-4 block text-xs font-bold text-[#405648]">Relevant experience or a short introduction
      <textarea rows={4} maxLength={1200} value={note} onChange={e=>setNote(e.target.value)} placeholder="Tell us briefly about your sales experience, customer network or how you plan to reach customers." className="mt-2 w-full rounded-xl border border-[#dce5db] bg-[#fbfcfa] px-4 py-3 text-sm font-normal leading-6 text-[#203b2b] outline-none focus:border-[#4c805b]"/>
    </label>
    <div className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden" aria-hidden="true"><label>Leave empty<input tabIndex={-1} autoComplete="off" value={website} onChange={e=>setWebsite(e.target.value)}/></label></div>
    {error?<p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">{error}</p>:null}
    <button type="submit" disabled={busy} className="mt-5 inline-flex w-full items-center justify-center gap-3 rounded-xl bg-[#0b6849] px-5 py-4 text-sm font-extrabold text-white transition hover:bg-[#084f39] disabled:opacity-60 sm:w-auto">
      {busy?<><LoaderCircle size={16} className="animate-spin"/> Submitting…</>:<>Submit application <Send size={15}/></>}
    </button>
    <p className="mt-4 text-[10px] leading-5 text-[#8c998d]">We collect only the information needed to review your application. Bank details are not requested on this public form. All applications are subject to management approval.</p>
  </form>;
}
