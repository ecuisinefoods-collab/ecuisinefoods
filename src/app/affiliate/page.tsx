"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowRight, CalendarClock, CheckCircle2, ClipboardCheck, ExternalLink, LoaderCircle, LogOut, Package, Send, ShieldCheck, Sparkles, Users } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Partner = { id:string; partner_code:string; status:string };
type Task = { id:string; title:string; description:string; task_type:string; priority:string; status:string; due_at:string|null; reference_url:string|null; product_id:string|null };
type Submission = { id:string; task_id:string; status:string; submission_text:string; proof_url:string|null; submitted_at:string };
type Product = { id:string; name:string; slug:string; image_url:string|null };
type BankDetails = { bank_name:string|null; bank_account_name:string|null; bank_account_number:string|null };
type ReferralOrder = { order_number:number; order_status:string; payment_status:string; created_at:string; eligible_sales_amount:number; referral_code:string; is_self_referral:boolean; commission_amount:number; commission_status:string };

const label = (value:string) => value.replaceAll("_"," ").replace(/\b\w/g, c=>c.toUpperCase());
const date = (value:string|null) => value ? new Date(value).toLocaleString("en-NG",{dateStyle:"medium",timeStyle:"short"}) : "No deadline set";

export default function PartnerDashboardPage(){
 const [email,setEmail]=useState("");
 const [password,setPassword]=useState("");
 const [mode,setMode]=useState<"signin"|"signup">("signin");
 const [userEmail,setUserEmail]=useState("");
 const [partner,setPartner]=useState<Partner|null>(null);
 const [tasks,setTasks]=useState<Task[]>([]);
 const [submissions,setSubmissions]=useState<Submission[]>([]);
 const [products,setProducts]=useState<Product[]>([]);
 const [referralStats,setReferralStats]=useState({clicks:0,orders:0});
 const [referralOrders,setReferralOrders]=useState<ReferralOrder[]>([]);
 const [commissionStats,setCommissionStats]=useState({earned:0,approved:0,paid:0,week:0});
 const [bankDetails,setBankDetails]=useState<BankDetails>({bank_name:"",bank_account_name:"",bank_account_number:""});
 const [bankForm,setBankForm]=useState({bank_name:"",bank_account_name:"",bank_account_number:""});
 const [savingBank,setSavingBank]=useState(false);
 const [selectedTask,setSelectedTask]=useState("");
 const [submissionText,setSubmissionText]=useState("");
 const [proofUrl,setProofUrl]=useState("");
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState(false);
 const [notice,setNotice]=useState("");
 const [error,setError]=useState("");

 const load=useCallback(async()=>{
  if(!supabase){setError("The Affiliate Hub database is not configured.");setLoading(false);return;}
  const {data:{session}}=await supabase.auth.getSession();
  if(!session){setLoading(false);return;}
  setUserEmail(session.user.email||"");
  const {data:claim,error:claimError}=await supabase.rpc("claim_ecuisine_partner_account");
  if(claimError){setError(claimError.message.includes("No approved")?"Your affiliate application has not yet been approved for Affiliate Hub access.":claimError.message);setLoading(false);return;}
  const {data:profile,error:profileError}=await supabase.from("partner_profiles").select("id,partner_code,status").eq("id",claim).maybeSingle();
  if(profileError||!profile){setError(profileError?.message||"Affiliate profile could not be loaded.");setLoading(false);return;}
  if(profile.status!=="active"){setError("Your affiliate access is currently paused. Please contact eCuisine.");setLoading(false);return;}
  const [taskResult,submissionResult,productResult,referralResult,commissionResult,orderResult,bankResult]=await Promise.all([
   supabase.from("partner_tasks").select("id,title,description,task_type,priority,status,due_at,reference_url,product_id").eq("assigned_partner_id",profile.id).neq("status","cancelled").order("due_at",{ascending:true}),
   supabase.from("partner_task_submissions").select("id,task_id,status,submission_text,proof_url,submitted_at").eq("partner_id",profile.id).order("submitted_at",{ascending:false}),
   supabase.from("products").select("id,name,slug,image_url").eq("is_active",true).order("name").limit(60),
   supabase.rpc("get_my_partner_referral_stats"),
   supabase.from("affiliate_commissions").select("commission_amount,status,earned_at").eq("partner_id",profile.id),
   supabase.rpc("get_my_partner_referral_orders"),
   supabase.rpc("get_my_affiliate_bank_details")
  ]);
  if(taskResult.error)setError(taskResult.error.message);
  else setTasks((taskResult.data||[]) as Task[]);
  if(submissionResult.error)setError(submissionResult.error.message);
  else setSubmissions((submissionResult.data||[]) as Submission[]);
  setProducts((productResult.data||[]) as Product[]);
  setReferralStats({clicks:Number(referralResult.data?.clicks||0),orders:Number(referralResult.data?.orders||0)});
  if(orderResult.error)setError(orderResult.error.message);else setReferralOrders((orderResult.data||[]) as ReferralOrder[]);
  const commissionRows=(commissionResult.data||[]) as {commission_amount:number;status:string;earned_at:string}[];
  const lagosNow=new Date(new Date().toLocaleString("en-US",{timeZone:"Africa/Lagos"}));
  const lagosDay=new Date(Date.UTC(lagosNow.getFullYear(),lagosNow.getMonth(),lagosNow.getDate()));
  lagosDay.setUTCDate(lagosDay.getUTCDate()-((lagosDay.getUTCDay()+2)%7));
  const weekStart=lagosDay.toISOString().slice(0,10)+"T00:00:00+01:00";
  const outstanding=commissionRows.filter(x=>x.status==="earned"||x.status==="approved");
  setCommissionStats({earned:outstanding.reduce((n,x)=>n+Number(x.commission_amount),0),approved:commissionRows.filter(x=>x.status==="approved").reduce((n,x)=>n+Number(x.commission_amount),0),paid:commissionRows.filter(x=>x.status==="paid").reduce((n,x)=>n+Number(x.commission_amount),0),week:commissionRows.filter(x=>x.earned_at>=weekStart&&x.status!=="reversed").reduce((n,x)=>n+Number(x.commission_amount),0)});
  const bank=(bankResult.data?.[0]||{bank_name:"",bank_account_name:"",bank_account_number:""}) as BankDetails;
  setBankDetails(bank);setBankForm({bank_name:bank.bank_name||"",bank_account_name:bank.bank_account_name||"",bank_account_number:bank.bank_account_number||""});
  setPartner(profile as Partner);
  setLoading(false);
 },[]);

 useEffect(()=>{void load();},[load]);

 async function authenticate(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(!supabase)return;setBusy(true);setError("");setNotice("");
  if(mode==="signup"){
   const {data,error:authError}=await supabase.auth.signUp({email:email.trim(),password,options:{emailRedirectTo:"https://ecuisinefoods.onrender.com/affiliate"}});
   if(authError)setError(authError.message);
   else if(data.session){setNotice("Account created. Connecting your approved affiliate profile…");await load();}
   else setNotice("Check your email to confirm your affiliate account, then return here to sign in.");
  }else{
   const {error:authError}=await supabase.auth.signInWithPassword({email:email.trim(),password});
   if(authError)setError(authError.message);else{setLoading(true);await load();}
  }
  setBusy(false);
 }

 async function saveBankDetails(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(!supabase)return;
  if(!bankForm.bank_name.trim()||!bankForm.bank_account_name.trim()||!/^\d{10}$/.test(bankForm.bank_account_number)){setError("Enter your bank name, account holder name and valid 10-digit account number.");return;}
  setSavingBank(true);setError("");setNotice("");
  const {error:saveError}=await supabase.rpc("update_my_affiliate_bank_details",{p_bank_name:bankForm.bank_name.trim(),p_bank_account_name:bankForm.bank_account_name.trim(),p_bank_account_number:bankForm.bank_account_number});
  if(saveError)setError(saveError.message);else{setBankDetails({...bankForm});setNotice("Your bank details have been saved securely for manual Friday payouts.");}
  setSavingBank(false);
 }

 async function submitWork(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(!supabase||!partner||!selectedTask)return;setBusy(true);setError("");setNotice("");
  const {error:submitError}=await supabase.from("partner_task_submissions").insert({task_id:selectedTask,partner_id:partner.id,submission_text:submissionText.trim(),proof_url:proofUrl.trim()||null});
  if(submitError)setError(submitError.message);
  else{setNotice("Your work has been submitted for review.");setSubmissionText("");setProofUrl("");setSelectedTask("");await load();}
  setBusy(false);
 }

 async function signOut(){await supabase?.auth.signOut();setPartner(null);setTasks([]);setSubmissions([]);setUserEmail("");setNotice("You have signed out.");}

 if(loading)return <main className="grid min-h-screen place-items-center bg-[#f5f8f2] text-sm font-semibold text-[#315b43]"><LoaderCircle className="mr-2 animate-spin"/>Loading your Affiliate Hub…</main>;

 if(!partner)return <main className="relative min-h-screen overflow-hidden bg-[#f4f7f1] px-4 py-8 text-[#203b2b] sm:py-12">
  <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-[#dcebdc] blur-3xl"/>
  <div className="pointer-events-none absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-[#f1e7c9] blur-3xl"/>
  <div className="relative mx-auto max-w-6xl">
   <header className="flex items-center justify-between"><Link href="/" className="inline-flex items-center gap-2 text-xs font-extrabold text-[#315b43]"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#143c2a] text-sm font-black text-white">e</span> eCuisine</Link><Link href="/affiliates" className="rounded-full border border-[#d5e1d4] bg-white/80 px-4 py-2.5 text-xs font-bold text-[#315b43] hover:bg-white">Become an affiliate <ArrowRight size={13} className="ml-1 inline"/></Link></header>
   <div className="mt-8 grid overflow-hidden rounded-[2rem] border border-white bg-white shadow-[0_24px_80px_rgba(22,55,35,.12)] lg:min-h-[650px] lg:grid-cols-[1.05fr_.95fr]">
    <section className="relative isolate flex flex-col justify-between overflow-hidden bg-[#102b20] p-7 text-white sm:p-11">
     <div className="pointer-events-none absolute -right-24 -top-24 -z-10 h-80 w-80 rounded-full border-[44px] border-white/[.045]"/>
     <div><span className="inline-flex items-center gap-2 rounded-full border border-[#e7ca79]/30 bg-white/[.07] px-4 py-2 text-[10px] font-black uppercase tracking-[.18em] text-[#f1d88e]"><Sparkles size={13}/> eCuisine Affiliate Hub</span>
      <h1 className="mt-9 max-w-xl text-4xl font-black leading-[1.12] sm:text-5xl">Grow with us.<br/><span className="text-[#e9cd79]">Earn with confidence.</span></h1>
      <p className="mt-5 max-w-lg text-sm leading-7 text-[#d0ded2]">Your home for referral links, sales visibility, commissions, product promotions and campaign activities — all in one place.</p>
     </div>
     <div className="mt-10 grid gap-3 sm:grid-cols-2">
      <div className="rounded-2xl border border-white/10 bg-white/[.06] p-4"><ClipboardCheck className="text-[#e9cd79]"/><p className="mt-3 text-sm font-bold">Your activity, organised</p><p className="mt-1 text-xs leading-5 text-[#bdcfc0]">See assignments, due dates and review feedback.</p></div>
      <div className="rounded-2xl border border-white/10 bg-white/[.06] p-4"><ShieldCheck className="text-[#e9cd79]"/><p className="mt-3 text-sm font-bold">Transparent referrals</p><p className="mt-1 text-xs leading-5 text-[#bdcfc0]">Track attributed orders, including your own purchases.</p></div>
     </div>
     <p className="mt-8 text-[10px] font-medium tracking-wide text-[#9db5a2]">A trusted partnership between eCuisine and the people who grow with us.</p>
    </section>
    <section className="flex flex-col justify-center p-7 sm:p-11">
     <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#9b7835]">Secure affiliate access</p>
     <h2 className="mt-3 text-3xl font-black tracking-tight">{mode==="signin"?"Welcome back":"Set up your Affiliate Hub login"}</h2>
     <p className="mt-3 max-w-md text-sm leading-6 text-[#788679]">{mode==="signin"?"Sign in to view your referrals, commissions and assigned activities.":"Use the same email address you supplied in your approved eCuisine affiliate application."}</p>
     <form onSubmit={authenticate} className="mt-8 space-y-5">
      <label className="block text-xs font-bold text-[#405648]">Email address<input required type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" className="mt-2 w-full rounded-xl border border-[#dce5db] bg-[#fbfcfa] px-4 py-3.5 text-sm font-normal text-[#203b2b] outline-none transition focus:border-[#0b6849] focus:ring-4 focus:ring-[#0b6849]/10"/></label>
      <label className="block text-xs font-bold text-[#405648]">Password<input required minLength={8} type="password" autoComplete={mode==="signin"?"current-password":"new-password"} value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 8 characters" className="mt-2 w-full rounded-xl border border-[#dce5db] bg-[#fbfcfa] px-4 py-3.5 text-sm font-normal text-[#203b2b] outline-none transition focus:border-[#0b6849] focus:ring-4 focus:ring-[#0b6849]/10"/></label>
      {error&&<p role="alert" className="rounded-xl border border-red-100 bg-red-50 p-3 text-xs leading-5 text-red-700">{error}</p>}{notice&&<p role="status" className="rounded-xl border border-green-100 bg-green-50 p-3 text-xs leading-5 text-green-800">{notice}</p>}
      <button disabled={busy} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0b6849] px-5 py-4 text-sm font-extrabold text-white shadow-lg shadow-[#0b6849]/15 transition hover:-translate-y-0.5 hover:bg-[#084f39] disabled:opacity-60">{busy?<LoaderCircle size={16} className="animate-spin"/>:null}{mode==="signin"?"Sign in to Affiliate Hub":"Create affiliate login"}<ArrowRight size={16}/></button>
     </form>
     <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[#edf1ea] pt-5"><p className="text-xs text-[#788679]">{mode==="signin"?"Newly approved affiliate?":"Already have an account?"}</p><button type="button" onClick={()=>{setMode(mode==="signin"?"signup":"signin");setError("");setNotice("");}} className="text-xs font-extrabold text-[#0b6849] hover:underline">{mode==="signin"?"Create your login":"Return to sign in"}</button></div>
     <p className="mt-6 rounded-xl bg-[#f7f9f5] p-4 text-[10px] leading-5 text-[#849184]">Affiliate Hub access is available after your application has been approved. Use your approved application email so we can securely connect your profile. <Link href="/affiliates" className="font-bold text-[#0b6849] underline">Apply to become an affiliate</Link>.</p>
    </section>
   </div>
  </div>
 </main>;

 const completed=tasks.filter(t=>submissions.some(s=>s.task_id===t.id&&s.status==="approved")).length;
 const overdue=tasks.filter(t=>t.due_at&&new Date(t.due_at)<new Date()&&!submissions.some(s=>s.task_id===t.id&&s.status==="approved")).length;
 return <main className="min-h-screen bg-[#f5f8f2] px-4 py-8 text-[#203b2b] sm:px-8"><div className="mx-auto max-w-7xl"><header className="flex flex-wrap items-center justify-between gap-4"><div><Link href="/" className="text-xs font-bold text-[#47714e]">← eCuisine storefront</Link><p className="mt-5 text-[10px] font-black uppercase tracking-[.2em] text-[#9b7835]">Affiliate Hub</p><h1 className="mt-2 text-3xl font-black">Welcome to your eCuisine Affiliate Hub.</h1><p className="mt-2 text-xs text-[#778679]">{userEmail} · Affiliate ID {partner.partner_code}</p></div><button onClick={()=>void signOut()} className="inline-flex items-center gap-2 rounded-xl border border-[#dce5db] bg-white px-4 py-3 text-xs font-bold"><LogOut size={14}/> Sign out</button></header>
 {error&&<p role="alert" className="mt-5 rounded-xl bg-red-50 p-3 text-xs text-red-700">{error}</p>}{notice&&<p role="status" className="mt-5 rounded-xl bg-green-50 p-3 text-xs text-green-800">{notice}</p>}
 <div className="mt-7 grid gap-3 sm:grid-cols-3"><article className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-[10px] font-black uppercase tracking-wider text-[#879487]">Assigned activities</p><p className="mt-2 text-3xl font-black">{tasks.length}</p></article><article className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-[10px] font-black uppercase tracking-wider text-[#879487]">Approved submissions</p><p className="mt-2 text-3xl font-black text-[#13804f]">{completed}</p></article><article className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-[10px] font-black uppercase tracking-wider text-[#879487]">Overdue activities</p><p className="mt-2 text-3xl font-black text-[#b46a24]">{overdue}</p></article></div>
 <section className="mt-7 rounded-2xl border border-[#e8dfc2] bg-[#fffdf7] p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#9b7835]">Your promotion links</p><h2 className="mt-2 text-xl font-black">Share eCuisine with your audience</h2><p className="mt-1 max-w-2xl text-xs leading-5 text-[#7b887c]">Every link below carries your unique affiliate code. Share the shop link for the full catalogue or use a product link to send customers straight to an item.</p></div><span className="rounded-full bg-[#edf4e9] px-3 py-1 text-[10px] font-black uppercase text-[#315b43]">Active code · {partner.partner_code}</span></div><div className="mt-5 rounded-xl border border-[#eadcae] bg-white p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-[10px] font-black uppercase tracking-wider text-[#879487]">Your main shop promotion link</p><p className="mt-1 text-[11px] text-[#7b887c]">Customers land on the eCuisine shop with your referral attached.</p></div><span className="rounded-full bg-[#fff4d8] px-3 py-1 text-[9px] font-black uppercase text-[#8a681b]">Share this link</span></div><div className="mt-3 flex flex-col gap-2 sm:flex-row"><input aria-label="Your unique shop promotion link" readOnly value={"https://ecuisinefoods.onrender.com/shop?ref="+encodeURIComponent(partner.partner_code)} className="min-w-0 flex-1 rounded-lg border border-[#e7eadf] bg-[#fbfcf8] px-3 py-3 font-mono text-[11px] text-[#315b43]"/><button type="button" onClick={()=>{void navigator.clipboard.writeText("https://ecuisinefoods.onrender.com/shop?ref="+encodeURIComponent(partner.partner_code)).then(()=>setNotice("Your shop promotion link has been copied. Share it with your audience.")).catch(()=>setError("Could not copy the shop link. Select and copy the link from the box."));}} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#173e2d] px-4 py-3 text-xs font-bold text-white"><ClipboardCheck size={14}/> Copy shop link</button><a href={"/shop?ref="+encodeURIComponent(partner.partner_code)} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#dce5db] px-4 py-3 text-xs font-bold text-[#315b43]">Preview <ExternalLink size={13}/></a></div></div><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><div className="rounded-xl bg-white p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-[#879487]">Referral visits</p><p className="mt-1 text-2xl font-black">{referralStats.clicks}</p></div><div className="rounded-xl bg-white p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-[#879487]">Attributed orders</p><p className="mt-1 text-2xl font-black">{referralStats.orders}</p></div><div className="rounded-xl bg-white p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-[#879487]">This week’s earnings</p><p className="mt-1 text-2xl font-black text-[#13804f]">{new Intl.NumberFormat("en-NG",{style:"currency",currency:"NGN",maximumFractionDigits:0}).format(commissionStats.week)}</p><p className="mt-1 text-[10px] text-[#879487]">Outstanding: {new Intl.NumberFormat("en-NG",{style:"currency",currency:"NGN",maximumFractionDigits:0}).format(commissionStats.earned)} · Paid out: {new Intl.NumberFormat("en-NG",{style:"currency",currency:"NGN",maximumFractionDigits:0}).format(commissionStats.paid)}</p></div></div><p className="mt-4 rounded-xl bg-[#edf4e9] p-3 text-[10px] leading-5 text-[#55705b]">Attribution: when a customer opens your link, their browser stores your referral for 30 days. If they place an order on this browser within that period, the order is attached to your affiliate account and appears in your attributed orders. Product-specific links work the same way.</p></section>

 <section className="mt-6 rounded-2xl border border-[#e3eae0] bg-white p-5 shadow-sm"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#9b7835]">Payout profile</p><h2 className="mt-2 text-xl font-black">Your bank details</h2><p className="mt-1 text-xs leading-5 text-[#7b887c]">eCuisine makes affiliate payments manually by bank transfer on Fridays. Keep these details accurate.</p></div><span className="rounded-full bg-[#edf4e9] px-3 py-1 text-[10px] font-bold text-[#315b43]">{bankDetails.bank_account_number?"Bank details saved":"Bank details needed"}</span></div>
 <form onSubmit={saveBankDetails} className="mt-4 grid gap-3 sm:grid-cols-3"><label className="text-xs font-bold">Bank name<input required maxLength={100} value={bankForm.bank_name} onChange={e=>setBankForm(v=>({...v,bank_name:e.target.value}))} placeholder="e.g. Access Bank" className="mt-2 w-full rounded-xl border border-[#dce5db] bg-[#fbfcfa] px-3 py-3 text-sm font-normal"/></label><label className="text-xs font-bold">Account holder name<input required maxLength={120} value={bankForm.bank_account_name} onChange={e=>setBankForm(v=>({...v,bank_account_name:e.target.value}))} placeholder="Name on account" className="mt-2 w-full rounded-xl border border-[#dce5db] bg-[#fbfcfa] px-3 py-3 text-sm font-normal"/></label><label className="text-xs font-bold">10-digit account number<input required inputMode="numeric" pattern="[0-9]{10}" maxLength={10} value={bankForm.bank_account_number} onChange={e=>setBankForm(v=>({...v,bank_account_number:e.target.value.replace(/\D/g,"").slice(0,10)}))} placeholder="0123456789" className="mt-2 w-full rounded-xl border border-[#dce5db] bg-[#fbfcfa] px-3 py-3 text-sm font-normal"/></label><button type="submit" disabled={savingBank} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0b6849] px-4 py-3 text-xs font-bold text-white disabled:opacity-60 sm:col-span-3">{savingBank?<LoaderCircle size={14} className="animate-spin"/>:<ShieldCheck size={14}/>} Save bank details</button></form><p className="mt-2 text-[10px] text-[#879487]">Your bank account details are private and are only retrieved by your signed-in profile and authorised eCuisine administrators.</p></section>
 <section className="mt-6 rounded-2xl border border-[#e3eae0] bg-white p-5 shadow-sm"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#9b7835]">Referral transparency</p><h2 className="mt-2 text-xl font-black">Your attributed orders</h2><p className="mt-1 text-xs leading-5 text-[#7b887c]">Personal purchases made with your own referral code are labelled separately. Order values exclude delivery; commission status follows the programme rules.</p></div><span className="rounded-full bg-[#edf4e9] px-3 py-1 text-[10px] font-black text-[#315b43]">{referralOrders.length} recent orders</span></div>
 {referralOrders.length===0?<p className="mt-4 rounded-xl bg-[#f8faf6] p-5 text-center text-xs text-[#849184]">No attributed orders have been recorded yet. Orders linked to your code will appear here.</p>:<div className="mt-4 overflow-x-auto"><table className="w-full min-w-[650px] text-left text-xs"><thead><tr className="border-b border-[#edf1ea] text-[10px] uppercase tracking-wider text-[#89968a]"><th className="py-3 pr-3">Order</th><th className="py-3 pr-3">Date</th><th className="py-3 pr-3">Type</th><th className="py-3 pr-3">Order status</th><th className="py-3 pr-3">Eligible sales</th><th className="py-3 pr-3">Commission</th></tr></thead><tbody>{referralOrders.map(o=><tr key={o.order_number} className="border-b border-[#f0f3ed] last:border-0"><td className="py-3 pr-3 font-bold">#{o.order_number}</td><td className="py-3 pr-3 text-[#718174]">{new Date(o.created_at).toLocaleDateString("en-NG")}</td><td className="py-3 pr-3"><span className={o.is_self_referral?"rounded-full bg-[#fff3df] px-2.5 py-1 text-[9px] font-black text-[#98621c]":"rounded-full bg-[#edf4e9] px-2.5 py-1 text-[9px] font-black text-[#315b43]"}>{o.is_self_referral?"Self-referred purchase":"Attributed · not matched as self"}</span></td><td className="py-3 pr-3"><span className="font-semibold">{label(o.order_status)} / {label(o.payment_status||"unpaid")}</span><p className="mt-1 text-[10px] text-[#89968a]">{o.commission_status==="not_eligible"?"Not yet commission-eligible":label(o.commission_status)}</p></td><td className="py-3 pr-3 font-semibold">{new Intl.NumberFormat("en-NG",{style:"currency",currency:"NGN",maximumFractionDigits:0}).format(Number(o.eligible_sales_amount)||0)}</td><td className="py-3 pr-3 font-bold text-[#205a40]">{new Intl.NumberFormat("en-NG",{style:"currency",currency:"NGN",maximumFractionDigits:0}).format(Number(o.commission_amount)||0)}</td></tr>)}</tbody></table></div>}</section>
 <div className="mt-8 grid gap-7 lg:grid-cols-[1.2fr_.8fr]"><section><div className="flex items-end justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#9b7835]">Your work plan</p><h2 className="mt-2 text-2xl font-black">Assigned activities</h2></div><span className="text-xs font-semibold text-[#829083]">{tasks.length} total</span></div>{tasks.length===0?<div className="mt-4 rounded-2xl border border-dashed border-[#cbd9ca] bg-white p-8 text-center"><Sparkles className="mx-auto text-[#9b7835]"/><p className="mt-3 text-sm font-bold">Your first activity is on its way</p><p className="mt-1 text-xs text-[#849184]">Your eCuisine manager will assign a campaign or activity here.</p></div>:<div className="mt-4 space-y-3">{tasks.map(task=>{const latest=submissions.find(s=>s.task_id===task.id);return <article key={task.id} className="rounded-2xl border border-[#e3eae0] bg-white p-5 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-2"><span className="rounded-full bg-[#edf4e9] px-3 py-1 text-[9px] font-black uppercase tracking-wider text-[#315b43]">{label(task.task_type)}</span><span className="text-[10px] font-bold text-[#8b9789]">{task.priority} priority</span></div><h3 className="mt-3 text-base font-black">{task.title}</h3><p className="mt-2 whitespace-pre-wrap text-xs leading-6 text-[#6f7e70]">{task.description}</p><div className="mt-3 flex flex-wrap gap-3 text-[10px] font-semibold text-[#7d8a7d]"><span className="inline-flex items-center gap-1"><CalendarClock size={12}/> Due {date(task.due_at)}</span>{latest?<span className="inline-flex items-center gap-1 text-[#386b48]"><CheckCircle2 size={12}/> Submission {latest.status}</span>:<span className="text-[#a56b25]">Awaiting your submission</span>}</div>{task.reference_url&&<a href={task.reference_url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-[10px] font-bold text-[#0b6849]">Open campaign brief <ExternalLink size={12}/></a>}</article>})}</div>}</section>
 <aside className="space-y-6"><section className="rounded-2xl border border-[#e3eae0] bg-white p-5 shadow-sm"><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#9b7835]">Submit your work</p><h2 className="mt-2 text-lg font-black">Send activity for review</h2><form onSubmit={submitWork} className="mt-4 space-y-3"><label className="block text-xs font-bold">Activity<select required value={selectedTask} onChange={e=>setSelectedTask(e.target.value)} className="mt-2 w-full rounded-xl border border-[#dce5db] bg-[#fbfcfa] px-3 py-3 text-xs"><option value="">Choose an assigned activity</option>{tasks.filter(t=>!submissions.some(s=>s.task_id===t.id&&s.status==="approved")).map(t=><option key={t.id} value={t.id}>{t.title}</option>)}</select></label><label className="block text-xs font-bold">What did you complete?<textarea required minLength={5} maxLength={3000} rows={5} value={submissionText} onChange={e=>setSubmissionText(e.target.value)} placeholder="Describe the work completed, results and any next steps…" className="mt-2 w-full rounded-xl border border-[#dce5db] bg-[#fbfcfa] px-3 py-3 text-xs font-normal"/></label><label className="block text-xs font-bold">Proof / published link (optional)<input type="url" value={proofUrl} onChange={e=>setProofUrl(e.target.value)} placeholder="https://…" className="mt-2 w-full rounded-xl border border-[#dce5db] bg-[#fbfcfa] px-3 py-3 text-xs font-normal"/></label><button disabled={busy||!selectedTask} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0b6849] px-4 py-3 text-xs font-extrabold text-white disabled:opacity-50"><Send size={14}/> Submit for review</button></form></section>
 <section className="rounded-2xl border border-[#e3eae0] bg-white p-5 shadow-sm"><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#9b7835]">Product promotion library</p><h2 className="mt-2 text-lg font-black">Products to feature</h2><div className="mt-4 space-y-3">{products.map(product=><div key={product.id} className="flex items-center gap-3 border-b border-[#edf1ea] pb-3 last:border-0">{product.image_url?<img src={product.image_url} alt="" className="h-12 w-12 rounded-xl bg-[#f4f6f0] object-cover"/>:<span className="grid h-12 w-12 place-items-center rounded-xl bg-[#edf4e9]"><Package size={18}/></span>}<div className="min-w-0 flex-1"><p className="truncate text-xs font-bold">{product.name}</p><div className="mt-1 flex flex-wrap gap-3"><Link href={"/products/"+product.slug} className="inline-flex items-center gap-1 text-[10px] font-bold text-[#0b6849]">Open product <ExternalLink size={11}/></Link><button type="button" onClick={()=>{void navigator.clipboard.writeText(window.location.origin+"/products/"+product.slug+"?ref="+encodeURIComponent(partner.partner_code)).then(()=>setNotice("Product link copied. Share it with your audience." )).catch(()=>setError("Could not copy the product link. Open the product and copy its address."));}} className="text-[10px] font-bold text-[#8a6a23]">Copy share link</button></div></div></div>)}</div></section></aside></div>
 </div></main>;
}
