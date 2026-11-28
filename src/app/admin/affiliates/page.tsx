"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, RefreshCw, ShieldCheck, Users } from "lucide-react";
import { supabase } from "@/lib/supabase";

type ApplicationStatus = "submitted" | "under_review" | "approved" | "rejected" | "withdrawn";
type Application = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  location: string | null;
  requested_model: "reseller" | "commission";
  experience_note: string | null;
  status: ApplicationStatus;
  created_at: string;
  reviewed_at: string | null;
  review_note: string | null;
};

const statuses: ApplicationStatus[] = ["submitted","under_review","approved","rejected","withdrawn"];
const label = (value:string) => value.replaceAll("_"," ").replace(/\b\w/g,c=>c.toUpperCase());

export default function AffiliateApplicationsPage() {
  const [items,setItems]=useState<Application[]>([]);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState("");
  const [error,setError]=useState("");
  const [role,setRole]=useState("");

  const load=useCallback(async()=>{
    if(!supabase){setError("Database connection is not configured.");setLoading(false);return;}
    const {data:{session}}=await supabase.auth.getSession();
    if(!session){setError("Please sign in through the admin dashboard.");setLoading(false);return;}
    const {data:profile,error:profileError}=await supabase.from("admin_profiles").select("role,is_active").eq("user_id",session.user.id).maybeSingle();
    if(profileError||!profile?.is_active||profile.role!=="owner"){setError("Only the account owner can review affiliate programme applications.");setLoading(false);return;}
    setRole(profile.role);
    const {data,error:queryError}=await supabase.from("affiliate_program_applications").select("id,full_name,email,phone,location,requested_model,experience_note,status,created_at,reviewed_at,review_note").order("created_at",{ascending:false}).limit(250);
    if(queryError)setError(queryError.message);
    else{setItems((data||[]) as Application[]);setError("");}
    setLoading(false);
  },[]);

  useEffect(()=>{void load();},[load]);

  async function updateStatus(item:Application,status:ApplicationStatus){
    if(!supabase||status===item.status)return;
    setSaving(item.id);setError("");
    const {data:{session}}=await supabase.auth.getSession();
    const {error:updateError}=await supabase.from("affiliate_program_applications").update({
      status,
      reviewed_by:session?.user.id||null,
      reviewed_at:new Date().toISOString(),
      updated_at:new Date().toISOString()
    }).eq("id",item.id);
    if(updateError)setError(updateError.message);
    else setItems(current=>current.map(row=>row.id===item.id?{...row,status,reviewed_at:new Date().toISOString()}:row));
    setSaving("");
  }

  if(loading)return <main className="admin-glass-shell min-h-screen p-10 text-sm font-semibold text-[#42694b]">Loading programme applications…</main>;

  return <main className="admin-glass-shell min-h-screen px-4 py-8 text-[#25392b] sm:px-8">
    <div className="mx-auto max-w-6xl">
      <Link href="/admin" className="inline-flex items-center gap-2 text-sm font-semibold text-[#42694b]"><ArrowLeft size={16}/> Admin dashboard</Link>
      <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#9b7835]">New affiliate programme</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-[#1e352b] sm:text-4xl">Applications</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#758276]">Review reseller and commission-based affiliate applications. Membership activation is a separate controlled step.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/partners" className="inline-flex items-center gap-2 rounded-xl border border-[#d9e0db] bg-white px-4 py-3 text-xs font-bold text-[#344c3c]">Legacy records (read-only transition)</Link>
          <button type="button" onClick={()=>{setLoading(true);void load();}} className="inline-flex items-center gap-2 rounded-xl border border-[#d9e0db] bg-white px-4 py-3 text-xs font-bold text-[#344c3c]"><RefreshCw size={14}/> Refresh</button>
        </div>
      </div>
      {error?<p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>:null}
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {(["submitted","under_review","approved"] as const).map(status=><article key={status} className="rounded-2xl border border-white/80 bg-white/85 p-4 shadow-lg shadow-[#183d2b]/[.04]"><p className="text-[10px] font-black uppercase tracking-[.16em] text-[#819085]">{label(status)}</p><p className="mt-2 text-3xl font-black tabular-nums text-[#1d3d2c]">{items.filter(item=>item.status===status).length}</p></article>)}
      </div>
      {!error&&items.length===0?<div className="mt-7 rounded-3xl border border-white/80 bg-white/85 px-6 py-14 text-center shadow-xl"><Users size={30} className="mx-auto text-[#93a394]"/><h2 className="mt-4 text-lg font-bold text-[#294232]">No new programme applications yet</h2><p className="mt-2 text-sm text-[#879487]">Applications submitted through the new affiliate page will appear here.</p></div>:null}
      {!error&&items.length>0?<div className="mt-7 space-y-4">{items.map(item=><article key={item.id} className="rounded-[1.6rem] border border-white/80 bg-white/90 p-5 shadow-xl shadow-[#173d29]/[.055] sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-[#edf3e9] px-3 py-1 text-[9px] font-black uppercase tracking-[.14em] text-[#315b43]">{item.requested_model==="reseller"?"Reseller":"Commission-based"}</span><span className="rounded-full bg-[#f4f6f1] px-3 py-1 text-[9px] font-black uppercase tracking-[.12em] text-[#657765]">{label(item.status)}</span></div>
            <h2 className="mt-3 text-lg font-black text-[#203b2b]">{item.full_name}</h2>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-xs text-[#718174]"><a className="inline-flex items-center gap-1.5 font-semibold hover:text-[#0b6849]" href={`mailto:${item.email}`}><Mail size={13}/>{item.email}</a><a href={`tel:${item.phone.replace(/[^+0-9]/g,"")}`} className="font-semibold">{item.phone}</a>{item.location?<span>{item.location}</span>:null}</div>
          </div>
          <div className="flex min-w-[180px] flex-col items-start gap-2 sm:items-end"><span className="text-[10px] font-semibold text-[#8a9787]">Applied {new Date(item.created_at).toLocaleString("en-NG",{dateStyle:"medium",timeStyle:"short"})}</span><select aria-label={`Update status for ${item.full_name}`} value={item.status} disabled={saving===item.id} onChange={e=>void updateStatus(item,e.target.value as ApplicationStatus)} className="rounded-xl border border-[#dce5dc] bg-white px-3 py-2.5 text-xs font-bold text-[#34513e]">{statuses.map(status=><option key={status} value={status}>{label(status)}</option>)}</select></div>
        </div>
        {item.experience_note?<p className="mt-4 rounded-xl border border-[#e7ece5] bg-[#f8faf7] p-4 text-sm leading-6 text-[#52695a]">{item.experience_note}</p>:null}
      </article>)}</div>:null}
      <p className="mt-7 flex items-center gap-2 text-[10px] leading-5 text-[#93a092]"><ShieldCheck size={13}/> Application review is owner-only. Bank details are not collected or displayed on this page.</p>
      <span className="sr-only">Signed in role: {role}</span>
    </div>
  </main>;
}
