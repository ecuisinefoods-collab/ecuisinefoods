"use client";
import { useCallback,useEffect,useState } from "react";
import Link from "next/link";
import { ArrowLeft,CheckCircle2,LoaderCircle,RefreshCw,ShieldCheck,UserPlus } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Application={id:string;full_name:string;email:string;requested_model:"reseller"|"commission";created_at:string};
const today=()=>new Intl.DateTimeFormat("en-CA",{timeZone:"Africa/Lagos",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
export default function AffiliateActivationPage(){
 const [apps,setApps]=useState<Application[]>([]);const [activeIds,setActiveIds]=useState<string[]>([]);
 const [codes,setCodes]=useState<Record<string,string>>({});const [dates,setDates]=useState<Record<string,string>>({});
 const [loading,setLoading]=useState(true);const [busy,setBusy]=useState("");const [error,setError]=useState("");const [notice,setNotice]=useState("");
 const load=useCallback(async()=>{
  if(!supabase){setError("Database connection is not configured.");setLoading(false);return;}
  const {data:{session}}=await supabase.auth.getSession();
  if(!session){setError("Sign in through the admin dashboard first.");setLoading(false);return;}
  const {data:admin,error:ae}=await supabase.from("admin_profiles").select("role,is_active").eq("user_id",session.user.id).maybeSingle();
  if(ae||!admin?.is_active||admin.role!=="owner"){setError("Only the active account owner can activate affiliates.");setLoading(false);return;}
  const [a,m]=await Promise.all([
   supabase.from("affiliate_program_applications").select("id,full_name,email,requested_model,created_at").eq("status","approved").order("created_at",{ascending:true}).limit(250),
   supabase.from("affiliate_program_members").select("application_id")
  ]);
  if(a.error||m.error)setError("Approved applications could not be loaded.");
  else{setApps((a.data||[]) as Application[]);setActiveIds((m.data||[]).map(x=>x.application_id).filter(Boolean) as string[]);}
  setLoading(false);
 },[]);
 useEffect(()=>{void load();},[load]);
 async function activate(app:Application){
  if(!supabase)return;const code=(codes[app.id]||"").trim().toUpperCase();const date=dates[app.id]||today();
  if(!code){setError("Enter an affiliate code before activation.");return;}
  setBusy(app.id);setError("");setNotice("");
  const {error:e}=await supabase.rpc("affiliate_program_activate_application",{p_application_id:app.id,p_affiliate_code:code,p_programme_start_date:date});
  if(e)setError(e.message);else{setNotice(app.full_name+" has been activated as "+code+". Send the affiliate their sign-in invitation through Supabase Auth.");await load();}
  setBusy("");
 }
 if(loading)return <main className="grid min-h-screen place-items-center text-sm text-[#42694b]"><LoaderCircle className="mr-2 animate-spin"/>Loading approved applications…</main>;
 return <main className="admin-glass-shell min-h-screen px-4 py-8 text-[#25392b] sm:px-8"><div className="mx-auto max-w-5xl">
  <Link href="/admin/affiliates" className="inline-flex items-center gap-2 text-sm font-semibold text-[#42694b]"><ArrowLeft size={16}/>Applications</Link>
  <div className="mt-6 flex flex-wrap items-end justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-[#9b7835]">New affiliate programme</p><h1 className="mt-2 text-3xl font-black">Activate approved affiliates</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[#758276]">After approving an application, invite the applicant through Supabase Auth. Once they accept and confirm their account, activate their programme membership here.</p></div><button onClick={()=>{setLoading(true);void load();}} className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-3 text-xs font-bold"><RefreshCw size={14}/>Refresh</button></div>
  <div className="mt-5 rounded-2xl border border-[#e5e9d8] bg-[#f8f7ed] p-4 text-xs leading-6 text-[#77643b]"><b>Important:</b> Activation does not create a password or send an invitation. First invite the applicant's email through Supabase Dashboard → Authentication → Users, and wait until they accept and confirm their email.</div>
  {error&&<p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
  {notice&&<p role="status" className="mt-4 rounded-xl border border-[#dce9dc] bg-[#edf4e9] p-3 text-sm text-[#315b43]">{notice}</p>}
  <div className="mt-6 space-y-4">{apps.filter(a=>!activeIds.includes(a.id)).map(app=><article key={app.id} className="rounded-3xl border border-white/80 bg-white/90 p-5 shadow-xl shadow-[#173d29]/[.04] sm:p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><span className="rounded-full bg-[#edf3e9] px-3 py-1 text-[9px] font-black uppercase text-[#315b43]">{app.requested_model==="reseller"?"Reseller":"Commission-based"}</span><h2 className="mt-3 text-lg font-black">{app.full_name}</h2><p className="mt-1 text-xs text-[#718174]">{app.email}</p></div><span className="text-[10px] font-bold text-[#8a9787]">Approved</span></div><div className="mt-5 grid gap-3 sm:grid-cols-[1fr_1fr_auto]"><label className="text-[11px] font-bold text-[#526958]">Affiliate code<input value={codes[app.id]||""} onChange={e=>setCodes(v=>({...v,[app.id]:e.target.value.toUpperCase()}))} maxLength={24} placeholder="e.g. ECF-0001" className="mt-1.5 w-full rounded-lg border bg-[#fbfcfa] px-3 py-2.5 text-xs"/></label><label className="text-[11px] font-bold text-[#526958]">Programme start date<input type="date" max={today()} value={dates[app.id]||today()} onChange={e=>setDates(v=>({...v,[app.id]:e.target.value}))} className="mt-1.5 w-full rounded-lg border bg-[#fbfcfa] px-3 py-2.5 text-xs"/></label><button disabled={busy===app.id||!codes[app.id]?.trim()} onClick={()=>void activate(app)} className="mt-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#0b6849] px-4 py-3 text-xs font-bold text-white disabled:opacity-50">{busy===app.id?<LoaderCircle size={14} className="animate-spin"/>:<UserPlus size={14}/>}Activate</button></div></article>)}
  {!apps.filter(a=>!activeIds.includes(a.id)).length&&<div className="rounded-3xl border border-white/80 bg-white/90 p-12 text-center"><CheckCircle2 size={32} className="mx-auto text-[#5b8b62]"/><h2 className="mt-4 font-bold">No approved applications awaiting activation</h2></div>}
  </div>
  <p className="mt-7 flex items-center gap-2 text-[10px] text-[#93a092]"><ShieldCheck size={13}/> Owner-only membership activation. New members start at Beginner level.</p>
 </div></main>;
}
