"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, CheckCircle2, LoaderCircle, Send } from "lucide-react";
import { supabase } from "@/lib/supabase";

const platforms = ["Instagram", "TikTok", "YouTube", "Facebook", "X", "Blog / website", "WhatsApp community", "Other"];
const audienceOptions = ["Under 1,000", "1,000–5,000", "5,001–10,000", "10,001–50,000", "More than 50,000"];

export function AffiliateApplicationForm() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [socialHandle, setSocialHandle] = useState("");
  const [primaryPlatform, setPrimaryPlatform] = useState(platforms[0]);
  const [audienceSize, setAudienceSize] = useState(audienceOptions[0]);
  const [promotionChannels, setPromotionChannels] = useState("");
  const [motivation, setMotivation] = useState("");
  const [skills, setSkills] = useState("");
  const [availability, setAvailability] = useState("5–10 hours per week");
  const [preferredActivities, setPreferredActivities] = useState<string[]>(["Product promotion"]);
  const [deadlineCommitment, setDeadlineCommitment] = useState(false);
  const [website, setWebsite] = useState("");
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (preferredActivities.length < 2) { setError("Please select at least two areas where you can contribute."); return; }
    if (skills.trim().length < 15) { setError("Please describe your relevant skills or experience (at least 15 characters)."); return; }
    if (website.trim()) {
      setSuccess(true);
      return;
    }
    if (!supabase) {
      setError("The application form is temporarily unavailable. Please email ecuisinefoods@gmail.com.");
      return;
    }

    setBusy(true);
    const { error: submitError } = await supabase.from("affiliate_applications").insert({
      full_name: fullName.trim(),
      email: email.trim(),
      phone: phone.trim() || null,
      social_handle: socialHandle.trim() || null,
      primary_platform: primaryPlatform,
      audience_size: audienceSize,
      promotion_channels: promotionChannels.trim() || null,
      motivation: motivation.trim(),
      skills: skills.trim() || null,
      availability,
      preferred_activities: preferredActivities,
      deadline_commitment: deadlineCommitment,
    });
    setBusy(false);

    if (submitError) {
      setError("We could not send your application just now. Please try again, or email ecuisinefoods@gmail.com.");
      return;
    }
    setSuccess(true);
    setFullName("");
    setEmail("");
    setPhone("");
    setSocialHandle("");
    setPrimaryPlatform(platforms[0]);
    setAudienceSize(audienceOptions[0]);
    setPromotionChannels("");
    setMotivation("");
    setSkills("");
    setAvailability("5–10 hours per week");
    setPreferredActivities(["Product promotion"]);
    setDeadlineCommitment(false);
  }

  if (success) {
    return (
      <div className="rounded-[1.7rem] border border-[#dce9dc] bg-white p-7 shadow-xl shadow-[#163b28]/[.06] sm:p-9" role="status">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[#e7f3e8] text-[#176044]"><CheckCircle2 size={27}/></span>
        <h2 className="mt-5 text-2xl font-black text-[#173c2b]">Your application is with us.</h2>
        <p className="mt-3 max-w-lg text-sm leading-7 text-[#66796c]">Thank you for applying to the eCuisine Partner Programme. Our team will review your skills, availability and commitments, then contact you about next steps.</p>
        <button type="button" onClick={() => setSuccess(false)} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#0b6849] px-5 py-3 text-xs font-extrabold text-white">Send another application <ArrowRight size={14}/></button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-[1.7rem] border border-[#e1e9df] bg-white p-6 shadow-xl shadow-[#163b28]/[.06] sm:p-8">
      <div className="mb-6">
        <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#9a7832]">Join the programme</p>
        <h2 className="mt-2 text-2xl font-black tracking-tight text-[#173c2b]">Apply to become an eCuisine partner</h2>
        <p className="mt-2 text-xs leading-6 text-[#748277]">Tell us what you can contribute, how much time you can commit and which activities you can deliver reliably.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-xs font-bold text-[#405648]">Full name <span className="text-[#b27636]">*</span>
          <input required minLength={2} maxLength={120} autoComplete="name" value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="Your name" className="mt-2 w-full rounded-xl border border-[#dce5db] bg-[#fbfcfa] px-4 py-3 text-sm text-[#203b2b] outline-none focus:border-[#4c805b]"/>
        </label>
        <label className="block text-xs font-bold text-[#405648]">Email address <span className="text-[#b27636]">*</span>
          <input required type="email" maxLength={254} autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" className="mt-2 w-full rounded-xl border border-[#dce5db] bg-[#fbfcfa] px-4 py-3 text-sm text-[#203b2b] outline-none focus:border-[#4c805b]"/>
        </label>
        <label className="block text-xs font-bold text-[#405648]">Phone / WhatsApp
          <input type="tel" maxLength={40} autoComplete="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+234 ..." className="mt-2 w-full rounded-xl border border-[#dce5db] bg-[#fbfcfa] px-4 py-3 text-sm text-[#203b2b] outline-none focus:border-[#4c805b]"/>
        </label>
        <label className="block text-xs font-bold text-[#405648]">Social handle or website
          <input maxLength={160} value={socialHandle} onChange={e=>setSocialHandle(e.target.value)} placeholder="@yourhandle or yoursite.com" className="mt-2 w-full rounded-xl border border-[#dce5db] bg-[#fbfcfa] px-4 py-3 text-sm text-[#203b2b] outline-none focus:border-[#4c805b]"/>
        </label>
        <label className="block text-xs font-bold text-[#405648]">Main platform <span className="text-[#b27636]">*</span>
          <select required value={primaryPlatform} onChange={e=>setPrimaryPlatform(e.target.value)} className="mt-2 w-full rounded-xl border border-[#dce5db] bg-[#fbfcfa] px-4 py-3 text-sm text-[#203b2b] outline-none focus:border-[#4c805b]">
            {platforms.map(value=><option key={value}>{value}</option>)}
          </select>
        </label>
        <label className="block text-xs font-bold text-[#405648]">Approximate audience size <span className="text-[#b27636]">*</span>
          <select required value={audienceSize} onChange={e=>setAudienceSize(e.target.value)} className="mt-2 w-full rounded-xl border border-[#dce5db] bg-[#fbfcfa] px-4 py-3 text-sm text-[#203b2b] outline-none focus:border-[#4c805b]">
            {audienceOptions.map(value=><option key={value}>{value}</option>)}
          </select>
        </label>
      </div>

      <label className="mt-4 block text-xs font-bold text-[#405648]">Where do you plan to share eCuisine? 
        <input maxLength={500} value={promotionChannels} onChange={e=>setPromotionChannels(e.target.value)} placeholder="For example: social posts, videos, a blog, community groups" className="mt-2 w-full rounded-xl border border-[#dce5db] bg-[#fbfcfa] px-4 py-3 text-sm text-[#203b2b] outline-none focus:border-[#4c805b]"/>
      </label>
      <div className="mt-5 rounded-2xl border border-[#e5ebe2] bg-[#f8faf6] p-4">
        <p className="text-xs font-bold text-[#405648]">What kind of partner work can you take on? (Choose at least two)</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {["Product promotion","Social media engagement","Content creation","Campaign support","Community support","Customer feedback"].map(activity=><label key={activity} className="flex items-center gap-2 text-xs font-medium text-[#526352]"><input type="checkbox" checked={preferredActivities.includes(activity)} onChange={e=>setPreferredActivities(current=>e.target.checked?[...current,activity]:current.filter(value=>value!==activity))} className="h-4 w-4 accent-[#0b6849]"/>{activity}</label>)}
        </div>
      </div>
      <label className="mt-4 block text-xs font-bold text-[#405648]">Relevant skills and experience
        <textarea required minLength={15} maxLength={1200} rows={3} value={skills} onChange={e=>setSkills(e.target.value)} placeholder="For example: video editing, copywriting, community management, customer support…" className="mt-2 w-full resize-y rounded-xl border border-[#dce5db] bg-[#fbfcfa] px-4 py-3 text-sm text-[#203b2b] outline-none focus:border-[#4c805b]"/>
      </label>
      <label className="mt-4 block text-xs font-bold text-[#405648]">Time you can reliably commit
        <select value={availability} onChange={e=>setAvailability(e.target.value)} className="mt-2 w-full rounded-xl border border-[#dce5db] bg-[#fbfcfa] px-4 py-3 text-sm text-[#203b2b] outline-none focus:border-[#4c805b]">
          {["Under 5 hours per week","5–10 hours per week","10–15 hours per week","15+ hours per week","Flexible, agreed per campaign"].map(value=><option key={value}>{value}</option>)}
        </select>
      </label>
      <label className="mt-4 flex items-start gap-3 rounded-xl border border-[#e8dfc8] bg-[#fffaf0] p-4 text-xs leading-5 text-[#66552f]">
        <input type="checkbox" required checked={deadlineCommitment} onChange={e=>setDeadlineCommitment(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-[#0b6849]"/>
        <span><strong>I can meet agreed deadlines and communicate early if something changes.</strong> I understand that repeated missed deadlines or incomplete work may affect my partner status.</span>
      </label>
      <label className="mt-4 block text-xs font-bold text-[#405648]">Why would you like to join? <span className="text-[#b27636]">*</span>
        <textarea required minLength={30} maxLength={2500} rows={5} value={motivation} onChange={e=>setMotivation(e.target.value)} placeholder="Tell us about your audience, content and how you would introduce eCuisine products." className="mt-2 w-full resize-y rounded-xl border border-[#dce5db] bg-[#fbfcfa] px-4 py-3 text-sm leading-6 text-[#203b2b] outline-none focus:border-[#4c805b]"/>
        <span className="mt-1 block text-right text-[10px] font-medium text-[#98a398]">{motivation.length}/2500</span>
      </label>

      <div className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
        <label>Leave this field empty<input tabIndex={-1} autoComplete="off" value={website} onChange={e=>setWebsite(e.target.value)}/></label>
      </div>
      {error ? <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs leading-5 text-red-700" role="alert">{error}</p> : null}
      <button type="submit" disabled={busy} className="mt-5 inline-flex w-full items-center justify-center gap-3 rounded-xl bg-[#0b6849] px-5 py-4 text-sm font-extrabold text-white shadow-lg shadow-[#0b6849]/15 transition hover:-translate-y-0.5 hover:bg-[#084f39] disabled:cursor-wait disabled:opacity-65 sm:w-auto">
        {busy ? <><LoaderCircle size={16} className="animate-spin"/> Sending application…</> : <>Submit partner application <Send size={15}/></>}
      </button>
      <p className="mt-4 text-[10px] leading-5 text-[#8c998d]">We use these details only to review and respond to your application. Commission rates, referral tracking and payout arrangements are confirmed with accepted affiliates before promotion begins.</p>
    </form>
  );
}
