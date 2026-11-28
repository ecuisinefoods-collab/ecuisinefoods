"use client";

import { useState, type FormEvent } from "react";
import { CheckCircle2, LoaderCircle, Send, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";

const RESPONSIBILITIES_VERSION = "2026-11-v1";
const responsibilities = [
  ["Social media engagement", "Engage meaningfully with official eCuisinefoods content through appropriate likes, comments, shares and approved promotional activity."],
  ["WhatsApp status participation", "Take part in designated status-sharing activities using approved brand content and campaign materials."],
  ["Affiliate community participation", "Stay connected to the official affiliate WhatsApp community, respond to important programme communications and work respectfully with the team."],
  ["Training and campaigns", "Participate in assigned product training, team activities and approved promotional campaigns."],
  ["Product knowledge", "Learn current, approved product information and communicate it accurately. Do not make unsupported nutrition or health claims."],
  ["Customer engagement", "Treat prospective and existing customers professionally, respond helpfully and refer order or product issues through the approved channels."],
  ["Sales and reporting", "Make genuine efforts to generate sales, follow the correct referral or reseller process and submit accurate records when required."],
  ["Brand representation", "Follow eCuisinefoods brand guidelines, protect customer information and represent the business respectfully and honestly."]
] as const;

export function AffiliateProgrammeApplicationForm() {
  const [fullName,setFullName]=useState("");
  const [email,setEmail]=useState("");
  const [phone,setPhone]=useState("");
  const [location,setLocation]=useState("");
  const [model,setModel]=useState<"reseller"|"commission">("reseller");
  const [note,setNote]=useState("");
  const [website,setWebsite]=useState("");
  const [accepted,setAccepted]=useState(false);
  const [busy,setBusy]=useState(false);
  const [success,setSuccess]=useState(false);
  const [error,setError]=useState("");

  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (website.trim()) { setSuccess(true); return; }
    if (!accepted) { setError("Please read and accept the Affiliate Responsibilities & Commitment before submitting."); return; }
    if (!supabase) { setError("Applications are temporarily unavailable. Please email ecuisinefoods@gmail.com."); return; }
    setBusy(true);
    const {error:submitError}=await supabase.from("affiliate_program_applications").insert({
      full_name:fullName.trim(),
      email:email.trim().toLowerCase(),
      phone:phone.trim(),
      location:location.trim() || null,
      requested_model:model,
      experience_note:note.trim() || null,
      responsibilities_accepted:true,
      responsibilities_version:RESPONSIBILITIES_VERSION,
      responsibilities_accepted_at:new Date().toISOString()
    });
    setBusy(false);
    if(submitError){setError("We could not submit your application. Please try again or email ecuisinefoods@gmail.com. If this continues, the programme team may need to finish enabling the updated application form.");return;}
    setSuccess(true);
    setFullName("");setEmail("");setPhone("");setLocation("");setNote("");setAccepted(false);
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
    <p className="mt-2 text-xs leading-6 text-[#748277]">Choose the model that best describes your interest. Final commercial terms are confirmed individually after review.</p>
    <fieldset className="mt-6 grid gap-3 sm:grid-cols-2">
      <legend className="mb-3 text-xs font-bold text-[#405648]">Preferred affiliate model</legend>
      <label className={`cursor-pointer rounded-2xl border p-4 ${model==="reseller"?"border-[#2f7650] bg-[#f0f6ee]":"border-[#dce5db] bg-white"}`}>
        <input type="radio" name="affiliate-model" value="reseller" checked={model==="reseller"} onChange={()=>setModel("reseller")} className="mr-2 accent-[#0b6849]"/>
        <span className="text-sm font-extrabold text-[#294232]">Reseller</span>
        <span className="mt-2 block text-xs leading-5 text-[#718174]">Acquire stock through an authorised source and earn from the difference between your acquisition price and selling price.</span>
      </label>
      <label className={`cursor-pointer rounded-2xl border p-4 ${model==="commission"?"border-[#2f7650] bg-[#f0f6ee]":"border-[#dce5db] bg-white"}`}>
        <input type="radio" name="affiliate-model" value="commission" checked={model==="commission"} onChange={()=>setModel("commission")} className="mr-2 accent-[#0b6849]"/>
        <span className="text-sm font-extrabold text-[#294232]">Commission-based</span>
        <span className="mt-2 block text-xs leading-5 text-[#718174]">Promote products, refer customers and earn commission on eligible sales after payment and management verification, subject to agreed terms.</span>
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

    <section className="mt-7 rounded-2xl border border-[#dfe9dd] bg-[#f8faf6] p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <ShieldCheck className="mt-0.5 shrink-0 text-[#477554]" size={22}/>
        <div><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#9a7832]">Required before applying</p><h3 className="mt-1 text-lg font-black text-[#173c2b]">Affiliate Responsibilities & Commitment</h3><p className="mt-2 text-xs leading-6 text-[#718174]">Being an eCuisinefoods affiliate means contributing to the brand and its community, not only making sales. Please read the expectations below. Specific activity schedules and campaign instructions will be communicated by the programme team.</p></div>
      </div>
      <div className="mt-5 space-y-4">
        {responsibilities.map(([title,description],index)=><div key={title} className="flex gap-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#e7f0e4] text-[10px] font-black text-[#315b43]">{index+1}</span><div><p className="text-xs font-extrabold text-[#294232]">{title}</p><p className="mt-1 text-xs leading-5 text-[#718174]">{description}</p></div></div>)}
      </div>
      <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-xl border border-[#dce5db] bg-white p-4">
        <input required type="checkbox" checked={accepted} onChange={e=>setAccepted(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-[#0b6849]"/>
        <span className="text-xs font-semibold leading-6 text-[#405648]">I confirm that I have read, understood and agree to fulfil these affiliate responsibilities, follow programme instructions and uphold eCuisinefoods' brand standards. I understand that repeated failure to participate may lead to reminders, follow-up, a formal warning and eventual inactivation after a fair review.</span>
      </label>
      <p className="mt-3 text-[10px] leading-5 text-[#8c998d]">Acceptance is recorded with the version and date of this commitment. You will also be able to review these responsibilities from your affiliate dashboard.</p>
    </section>

    <div className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden" aria-hidden="true"><label>Leave empty<input tabIndex={-1} autoComplete="off" value={website} onChange={e=>setWebsite(e.target.value)}/></label></div>
    {error?<p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">{error}</p>:null}
    <button type="submit" disabled={busy||!accepted} className="mt-5 inline-flex w-full items-center justify-center gap-3 rounded-xl bg-[#0b6849] px-5 py-4 text-sm font-extrabold text-white transition hover:bg-[#084f39] disabled:opacity-50 sm:w-auto">
      {busy?<><LoaderCircle size={16} className="animate-spin"/> Submitting…</>:<>Submit application <Send size={15}/></>}
    </button>
    <p className="mt-4 text-[10px] leading-5 text-[#8c998d]">We collect only the information needed to review your application. Bank details are not requested on this public form. All applications are subject to management approval.</p>
  </form>;
}
