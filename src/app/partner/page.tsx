"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowRight, CalendarClock, CheckCircle2, ClipboardCheck, ExternalLink, LoaderCircle, LogOut, Package, Send, ShieldCheck, Sparkles, Users } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Partner = { id:string; partner_code:string; status:string };
type Task = { id:string; title:string; description:string; task_type:string; priority:string; status:string; due_at:string|null; reference_url:string|null; product_id:string|null };
type Submission = { id:string; task_id:string; status:string; submission_text:string; proof_url:string|null; submitted_at:string };
type Product = { id:string; name:string; slug:string; image_url:string|null };

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
 const [selectedTask,setSelectedTask]=useState("");
 const [submissionText,setSubmissionText]=useState("");
 const [proofUrl,setProofUrl]=useState("");
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState(false);
 const [notice,setNotice]=useState("");
 const [error,setError]=useState("");

 const load=useCallback(async()=>{
  if(!supabase){setError("The partner portal database is not configured.");setLoading(false);return;}
  const {data:{session}}=await supabase.auth.getSession();
  if(!session){setLoading(false);return;}
  setUserEmail(session.user.email||"");
  const {data:claim,error:claimError}=await supabase.rpc("claim_ecuisine_partner_account");
  if(claimError){setError(claimError.message.includes("No approved")?"Your partner application has not yet been approved for portal access.":claimError.message);setLoading(false);return;}
  const {data:profile,error:profileError}=await supabase.from("partner_profiles").select("id,partner_code,status").eq("id",claim).maybeSingle();
  if(profileError||!profile){setError(profileError?.message||"Partner profile could not be loaded.");setLoading(false);return;}
  if(profile.status!=="active"){setError("Your partner access is currently paused. Please contact eCuisine.");setLoading(false);return;}
  const [taskResult,submissionResult,productResult]=await Promise.all([
   supabase.from("partner_tasks").select("id,title,description,task_type,priority,status,due_at,reference_url,product_id").eq("assigned_partner_id",profile.id).neq("status","cancelled").order("due_at",{ascending:true}),
   supabase.from("partner_task_submissions").select("id,task_id,status,submission_text,proof_url,submitted_at").eq("partner_id",profile.id).order("submitted_at",{ascending:false}),
   supabase.from("products").select("id,name,slug,image_url").eq("is_active",true).order("name").limit(60)
  ]);
  if(taskResult.error)setError(taskResult.error.message);
  else setTasks((taskResult.data||[]) as Task[]);
  if(submissionResult.error)setError(submissionResult.error.message);
  else setSubmissions((submissionResult.data||[]) as Submission[]);
  setProducts((productResult.data||[]) as Product[]);
  setPartner(profile as Partner);
  setLoading(false);
 },[]);

 useEffect(()=>{void load();},[load]);

 async function authenticate(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(!supabase)return;setBusy(true);setError("");setNotice("");
  if(mode==="signup"){
   const {data,error:authError}=await supabase.auth.signUp({email:email.trim(),password,options:{emailRedirectTo:"https://ecuisinefoods.onrender.com/partner"}});
   if(authError)setError(authError.message);
   else if(data.session){setNotice("Account created. Connecting your approved partner profile…");await load();}
   else setNotice("Check your email to confirm your partner account, then return here to sign in.");
  }else{
   const {error:authError}=await supabase.auth.signInWithPassword({email:email.trim(),password});
   if(authError)setError(authError.message);else{setLoading(true);await load();}
  }
  setBusy(false);
 }

 async function submitWork(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(!supabase||!partner||!selectedTask)return;setBusy(true);setError("");setNotice("");
  const {error:submitError}=await supabase.from("partner_task_submissions").insert({task_id:selectedTask,partner_id:partner.id,submission_text:submissionText.trim(),proof_url:proofUrl.trim()||null});
  if(submitError)setError(submitError.message);
  else{setNotice("Your work has been submitted for review.");setSubmissionText("");setProofUrl("");setSelectedTask("");await load();}
  setBusy(false);
 }

 async function signOut(){await supabase?.auth.signOut();setPartner(null);setTasks([]);setSubmissions([]);setUserEmail("");setNotice("You have signed out.");}

 if(loading)return <main className="grid min-h-screen place-items-center bg-[#f5f8f2] text-sm font-semibold text-[#315b43]"><LoaderCircle className="mr-2 animate-spin"/>Loading your partner workspace…</main>;

 if(!partner)return <main className="min-h-screen bg-[#f5f8f2] px-4 py-12 text-[#203b2b]"><div className="mx-auto max-w-5xl"><Link href="/" className="text-xs font-bold text-[#47714e]">← Back to eCuisine</Link><div className="mt-8 grid overflow-hidden rounded-[2rem] bg-white shadow-xl lg:grid-cols-[1fr_.85fr]"><section className="bg-[#102b20] p-8 text-white sm:p-12"><span className="inline-flex items-center gap-2 rounded-full border border-[#e7ca79]/30 bg-white/5 px-4 py-2 text-[10px] font-black uppercase tracking-[.18em] text-[#f1d88e]"><Users size={14}/> eCuisine Partner Hub</span><h1 className="mt-7 text-4xl font-black leading-tight">Partnership is more than promotion.</h1><p className="mt-5 max-w-lg text-sm leading-7 text-[#d0ded2]">Access assigned campaigns, product promotion briefs, social engagement activities, deadlines and work reviews in one place.</p><div className="mt-8 grid gap-3 sm:grid-cols-2"><div className="rounded-2xl border border-white/10 bg-white/5 p-4"><ClipboardCheck className="text-[#e9cd79]"/><p className="mt-3 text-sm font-bold">Clear assignments</p><p className="mt-1 text-xs leading-5 text-[#bdcfc0]">Know what to do and when it is due.</p></div><div className="rounded-2xl border border-white/10 bg-white/5 p-4"><ShieldCheck className="text-[#e9cd79]"/><p className="mt-3 text-sm font-bold">Accountability</p><p className="mt-1 text-xs leading-5 text-[#bdcfc0]">Submit proof and receive feedback.</p></div></div></section><section className="p-7 sm:p-10"><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#9b7835]">Partner access</p><h2 className="mt-3 text-2xl font-black">{mode==="signin"?"Sign in to your dashboard":"Create your partner login"}</h2><p className="mt-2 text-xs leading-6 text-[#788679]">Use the same email address you supplied in your approved eCuisine partner application.</p><form onSubmit={authenticate} className="mt-7 space-y-4"><label className="block text-xs font-bold">Email address<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} className="mt-2 w-full rounded-xl border border-[#dce5db] bg-[#fbfcfa] px-4 py-3 text-sm font-normal"/></label><label className="block text-xs font-bold">Password<input required minLength={8} type="password" value={password} onChange={e=>setPassword(e.target.value)} className="mt-2 w-full rounded-xl border border-[#dce5db] bg-[#fbfcfa] px-4 py-3 text-sm font-normal"/></label>{error&&<p role="alert" className="rounded-xl bg-red-50 p-3 text-xs text-red-700">{error}</p>}{notice&&<p role="status" className="rounded-xl bg-green-50 p-3 text-xs text-green-800">{notice}</p>}<button disabled={busy} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0b6849] px-5 py-4 text-sm font-extrabold text-white disabled:opacity-60">{busy?<LoaderCircle size={16} className="animate-spin"/>:null}{mode==="signin"?"Sign in securely":"Create partner account"}<ArrowRight size={15}/></button></form><button type="button" onClick={()=>{setMode(mode==="signin"?"signup":"signin");setError("");setNotice("");}} className="mt-5 text-xs font-bold text-[#0b6849]">{mode==="signin"?"New approved partner? Create your login":"Already registered? Sign in"}</button><p className="mt-6 text-[10px] leading-5 text-[#8c998d]">Partner accounts are available only to applicants approved by the eCuisine team. If your email is not yet approved, contact us for assistance.</p></section></div></div></main>;

 const completed=tasks.filter(t=>submissions.some(s=>s.task_id===t.id&&s.status==="approved")).length;
 const overdue=tasks.filter(t=>t.due_at&&new Date(t.due_at)<new Date()&&!submissions.some(s=>s.task_id===t.id&&s.status==="approved")).length;
 return <main className="min-h-screen bg-[#f5f8f2] px-4 py-8 text-[#203b2b] sm:px-8"><div className="mx-auto max-w-7xl"><header className="flex flex-wrap items-center justify-between gap-4"><div><Link href="/" className="text-xs font-bold text-[#47714e]">← eCuisine storefront</Link><p className="mt-5 text-[10px] font-black uppercase tracking-[.2em] text-[#9b7835]">Partner workspace</p><h1 className="mt-2 text-3xl font-black">Welcome to your eCuisine partnership.</h1><p className="mt-2 text-xs text-[#778679]">{userEmail} · Partner ID {partner.partner_code}</p></div><button onClick={()=>void signOut()} className="inline-flex items-center gap-2 rounded-xl border border-[#dce5db] bg-white px-4 py-3 text-xs font-bold"><LogOut size={14}/> Sign out</button></header>
 {error&&<p role="alert" className="mt-5 rounded-xl bg-red-50 p-3 text-xs text-red-700">{error}</p>}{notice&&<p role="status" className="mt-5 rounded-xl bg-green-50 p-3 text-xs text-green-800">{notice}</p>}
 <div className="mt-7 grid gap-3 sm:grid-cols-3"><article className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-[10px] font-black uppercase tracking-wider text-[#879487]">Assigned activities</p><p className="mt-2 text-3xl font-black">{tasks.length}</p></article><article className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-[10px] font-black uppercase tracking-wider text-[#879487]">Approved submissions</p><p className="mt-2 text-3xl font-black text-[#13804f]">{completed}</p></article><article className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-[10px] font-black uppercase tracking-wider text-[#879487]">Overdue activities</p><p className="mt-2 text-3xl font-black text-[#b46a24]">{overdue}</p></article></div>
 <div className="mt-8 grid gap-7 lg:grid-cols-[1.2fr_.8fr]"><section><div className="flex items-end justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#9b7835]">Your work plan</p><h2 className="mt-2 text-2xl font-black">Assigned activities</h2></div><span className="text-xs font-semibold text-[#829083]">{tasks.length} total</span></div>{tasks.length===0?<div className="mt-4 rounded-2xl border border-dashed border-[#cbd9ca] bg-white p-8 text-center"><Sparkles className="mx-auto text-[#9b7835]"/><p className="mt-3 text-sm font-bold">Your first activity is on its way</p><p className="mt-1 text-xs text-[#849184]">Your eCuisine manager will assign a campaign or activity here.</p></div>:<div className="mt-4 space-y-3">{tasks.map(task=>{const latest=submissions.find(s=>s.task_id===task.id);return <article key={task.id} className="rounded-2xl border border-[#e3eae0] bg-white p-5 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-2"><span className="rounded-full bg-[#edf4e9] px-3 py-1 text-[9px] font-black uppercase tracking-wider text-[#315b43]">{label(task.task_type)}</span><span className="text-[10px] font-bold text-[#8b9789]">{task.priority} priority</span></div><h3 className="mt-3 text-base font-black">{task.title}</h3><p className="mt-2 whitespace-pre-wrap text-xs leading-6 text-[#6f7e70]">{task.description}</p><div className="mt-3 flex flex-wrap gap-3 text-[10px] font-semibold text-[#7d8a7d]"><span className="inline-flex items-center gap-1"><CalendarClock size={12}/> Due {date(task.due_at)}</span>{latest?<span className="inline-flex items-center gap-1 text-[#386b48]"><CheckCircle2 size={12}/> Submission {latest.status}</span>:<span className="text-[#a56b25]">Awaiting your submission</span>}</div>{task.reference_url&&<a href={task.reference_url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-[10px] font-bold text-[#0b6849]">Open campaign brief <ExternalLink size={12}/></a>}</article>})}</div>}</section>
 <aside className="space-y-6"><section className="rounded-2xl border border-[#e3eae0] bg-white p-5 shadow-sm"><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#9b7835]">Submit your work</p><h2 className="mt-2 text-lg font-black">Send activity for review</h2><form onSubmit={submitWork} className="mt-4 space-y-3"><label className="block text-xs font-bold">Activity<select required value={selectedTask} onChange={e=>setSelectedTask(e.target.value)} className="mt-2 w-full rounded-xl border border-[#dce5db] bg-[#fbfcfa] px-3 py-3 text-xs"><option value="">Choose an assigned activity</option>{tasks.filter(t=>!submissions.some(s=>s.task_id===t.id&&s.status==="approved")).map(t=><option key={t.id} value={t.id}>{t.title}</option>)}</select></label><label className="block text-xs font-bold">What did you complete?<textarea required minLength={5} maxLength={3000} rows={5} value={submissionText} onChange={e=>setSubmissionText(e.target.value)} placeholder="Describe the work completed, results and any next steps…" className="mt-2 w-full rounded-xl border border-[#dce5db] bg-[#fbfcfa] px-3 py-3 text-xs font-normal"/></label><label className="block text-xs font-bold">Proof / published link (optional)<input type="url" value={proofUrl} onChange={e=>setProofUrl(e.target.value)} placeholder="https://…" className="mt-2 w-full rounded-xl border border-[#dce5db] bg-[#fbfcfa] px-3 py-3 text-xs font-normal"/></label><button disabled={busy||!selectedTask} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0b6849] px-4 py-3 text-xs font-extrabold text-white disabled:opacity-50"><Send size={14}/> Submit for review</button></form></section>
 <section className="rounded-2xl border border-[#e3eae0] bg-white p-5 shadow-sm"><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#9b7835]">Product promotion library</p><h2 className="mt-2 text-lg font-black">Products to feature</h2><div className="mt-4 space-y-3">{products.map(product=><div key={product.id} className="flex items-center gap-3 border-b border-[#edf1ea] pb-3 last:border-0">{product.image_url?<img src={product.image_url} alt="" className="h-12 w-12 rounded-xl bg-[#f4f6f0] object-cover"/>:<span className="grid h-12 w-12 place-items-center rounded-xl bg-[#edf4e9]"><Package size={18}/></span>}<div className="min-w-0 flex-1"><p className="truncate text-xs font-bold">{product.name}</p><Link href={"/products/"+product.slug} className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-[#0b6849]">View product <ExternalLink size={11}/></Link></div></div>)}</div></section></aside></div>
 </div></main>;
}
