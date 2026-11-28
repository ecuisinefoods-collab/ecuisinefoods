"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, ClipboardList, LoaderCircle, RefreshCw, ShieldCheck, Target, TrendingUp, Users } from "lucide-react";
import { supabase } from "@/lib/supabase";

type RosterRow = {
  member_id:string; affiliate_code:string; full_name:string; email:string; phone:string; location:string|null;
  affiliate_model:"reseller"|"commission"; level:string; member_status:string; programme_start_date:string;
  approved_sales_count:number; pending_sales_count:number; approved_sales_amount:number; approved_units:number;
  latest_approved_sale_date:string|null; target_sales_amount:number|null; target_units:number|null;
  sales_target_progress:number|null; units_target_progress:number|null;
};
type Followup = {member_id:string;contact_status:string;followup_note:string|null;contacted_at:string|null;next_followup_at:string|null};
type Scorecard = {id:string;period_month:string;verified_group_sales_amount:number;affiliates_with_verified_sales:number;target_achievers:number;inactive_affiliates_contacted:number;reactivated_affiliates:number;new_recruits:number;recruits_reaching_first_target:number;manager_notes:string|null;created_at:string};
const monthStart=()=>new Intl.DateTimeFormat("en-CA",{timeZone:"Africa/Lagos",year:"numeric",month:"2-digit"}).format(new Date())+"-01";
const money=(n:number)=>new Intl.NumberFormat("en-NG",{style:"currency",currency:"NGN",maximumFractionDigits:0}).format(n);
const label=(v:string)=>v.replaceAll("_"," ").replace(/\b\w/g,c=>c.toUpperCase());
const statuses=["not_contacted","contacted","interested","onboarding","not_interested","closed"];

export default function AffiliateManagerDashboard(){
 const [rows,setRows]=useState<RosterRow[]>([]);const [followups,setFollowups]=useState<Record<string,Followup>>({});
 const [scorecards,setScorecards]=useState<Scorecard[]>([]);const [month,setMonth]=useState(monthStart());
 const [filter,setFilter]=useState("all");const [search,setSearch]=useState("");
 const [loading,setLoading]=useState(true);const [busy,setBusy]=useState("");const [error,setError]=useState("");const [notice,setNotice]=useState("");
 const [report,setReport]=useState({contacted:"0",reactivated:"0",recruits:"0",firstTarget:"0",notes:""});
 const load=useCallback(async()=>{
  if(!supabase){setError("Database connection is not configured.");setLoading(false);return;}
  const {data:{session}}=await supabase.auth.getSession();
  if(!session){setError("Please sign in through the admin dashboard.");setLoading(false);return;}
  const {data:admin,error:adminError}=await supabase.from("admin_profiles").select("role,is_active").eq("user_id",session.user.id).maybeSingle();
  if(adminError||!admin?.is_active||!["owner","affiliate_manager"].includes(admin.role)){setError("This workspace is restricted to the owner and assigned Affiliate Sales & Growth Manager.");setLoading(false);return;}
  const [roster,notes,cards]=await Promise.all([
   supabase.rpc("get_affiliate_program_manager_roster",{p_period_month:month}),
   supabase.from("affiliate_program_manager_followups").select("member_id,contact_status,followup_note,contacted_at,next_followup_at"),
   supabase.rpc("get_affiliate_program_manager_scorecards")
  ]);
  if(roster.error||notes.error||cards.error){setError("Manager information could not be loaded. Confirm the affiliate programme database migrations have been installed.");setLoading(false);return;}
  setRows((roster.data||[]) as RosterRow[]);
  setFollowups(Object.fromEntries(((notes.data||[]) as Followup[]).map(n=>[n.member_id,n])));
  setScorecards((cards.data||[]) as Scorecard[]);
  setLoading(false);setError("");
 },[month]);
 useEffect(()=>{void load();},[load]);
 const filtered=useMemo(()=>rows.filter(r=>(filter==="all"||(filter==="inactive"&&r.approved_sales_count===0)||(filter==="active"&&r.approved_sales_count>0)||(filter===r.affiliate_model)||(filter===r.level))&&[r.full_name,r.affiliate_code,r.phone,r.email].join(" ").toLowerCase().includes(search.toLowerCase())),[rows,filter,search]);
 const active=rows.filter(r=>r.approved_sales_count>0).length;
 const achieved=rows.filter(r=>(r.target_sales_amount!==null&&r.target_sales_amount>0?r.sales_target_progress!==null&&r.sales_target_progress>=100:true)&&(r.target_units!==null&&r.target_units>0?r.units_target_progress!==null&&r.units_target_progress>=100:true)&&(r.target_sales_amount!==null&&r.target_sales_amount>0||r.target_units!==null&&r.target_units>0)).length;
 const groupSales=rows.reduce((n,r)=>n+Number(r.approved_sales_amount),0);
 async function saveFollowup(row:RosterRow){
  if(!supabase)return;const f=followups[row.member_id]||{member_id:row.member_id,contact_status:"not_contacted",followup_note:null,contacted_at:null,next_followup_at:null};
  setBusy(row.member_id);setError("");setNotice("");
  const {data:{session}}=await supabase.auth.getSession();
  const payload={member_id:row.member_id,manager_user_id:session?.user.id,contact_status:f.contact_status,followup_note:f.followup_note||null,contacted_at:f.contact_status==="not_contacted"?null:(f.contacted_at||new Date().toISOString()),next_followup_at:f.next_followup_at||null,updated_at:new Date().toISOString()};
  const {error:e}=await supabase.from("affiliate_program_manager_followups").upsert(payload,{onConflict:"member_id,manager_user_id"});
  if(e)setError(e.message);else setNotice("Follow-up record saved for "+row.affiliate_code+".");
  setBusy(""); 
 }
 async function submitScorecard(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(!supabase)return;setBusy("scorecard");setError("");setNotice("");
  const {error:e1}=await supabase.rpc("affiliate_program_save_manager_scorecard",{p_period_month:month,p_inactive_affiliates_contacted:Number(report.contacted),p_reactivated_affiliates:Number(report.reactivated),p_new_recruits:Number(report.recruits),p_recruits_reaching_first_target:Number(report.firstTarget),p_manager_notes:report.notes.trim()||null});
  if(e1)setError(e1.message);else{setNotice("Monthly scorecard saved. Verified sales and target-achievement figures were calculated from approved records.");await load();}
  setBusy("");
 }
 if(loading)return <main className="grid min-h-screen place-items-center bg-[#f5f8f2] text-sm font-semibold text-[#315b43]"><LoaderCircle className="mr-2 animate-spin"/>Loading manager workspace…</main>;
 return <main className="min-h-screen bg-[#f5f8f2] px-4 py-8 text-[#203b2b] sm:px-8"><div className="mx-auto max-w-7xl">
  <Link href="/admin" className="inline-flex items-center gap-2 text-sm font-semibold text-[#42694b]"><ArrowLeft size={16}/>Admin dashboard</Link>
  <div className="mt-6 flex flex-wrap items-end justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-[#9b7835]">Affiliate programme operations</p><h1 className="mt-2 text-3xl font-black sm:text-4xl">Sales & Growth Manager</h1><p className="mt-2 text-sm text-[#758276]">A practical view of verified team performance, follow-ups and monthly reporting.</p></div><div className="flex flex-wrap items-center gap-2"><input aria-label="Performance month" type="month" value={month.slice(0,7)} onChange={e=>setMonth(e.target.value+"-01")} className="rounded-xl border border-[#dce5db] bg-white px-3 py-2.5 text-xs font-bold"/><button onClick={()=>{setLoading(true);void load();}} className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-3 text-xs font-bold"><RefreshCw size={14}/>Refresh</button></div></div>
  {error&&<p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}{notice&&<p role="status" className="mt-5 rounded-xl border border-[#dce9dc] bg-[#edf4e9] p-3 text-sm text-[#315b43]">{notice}</p>}
  <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[{name:"Programme members",value:rows.length,icon:Users},{name:"With approved sales",value:active,icon:TrendingUp},{name:"Monthly target achievers",value:achieved,icon:Target},{name:"Verified group sales",value:money(groupSales),icon:ClipboardList}].map(x=><article key={x.name} className="rounded-2xl border border-white bg-white p-5 shadow-sm"><div className="flex items-center justify-between text-xs font-semibold text-[#819084]">{x.name}<x.icon size={18} className="text-[#477554]"/></div><p className="mt-3 text-2xl font-black">{x.value}</p></article>)}</div>
  <section className="mt-6 rounded-2xl border bg-white p-5 sm:p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-black">Affiliate team</h2><p className="mt-1 text-xs text-[#879487]">Only approved, fully paid sales count towards verified performance.</p></div><div className="flex flex-wrap gap-2"><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name, code or contact" className="rounded-lg border px-3 py-2 text-xs"/><select value={filter} onChange={e=>setFilter(e.target.value)} className="rounded-lg border bg-white px-3 py-2 text-xs"><option value="all">All affiliates</option><option value="active">With approved sales</option><option value="inactive">No approved sales</option><option value="reseller">Resellers</option><option value="commission">Commission</option><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select></div></div>
   <div className="mt-5 space-y-3">{filtered.map(row=>{const f=followups[row.member_id]||{member_id:row.member_id,contact_status:"not_contacted",followup_note:null,contacted_at:null,next_followup_at:null};return <article key={row.member_id} className="rounded-xl border border-[#e7ece5] p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex flex-wrap gap-2"><span className="rounded-full bg-[#edf3e9] px-2.5 py-1 text-[9px] font-black uppercase text-[#315b43]">{label(row.affiliate_model)}</span><span className="rounded-full bg-[#f4f6f1] px-2.5 py-1 text-[9px] font-black uppercase text-[#657765]">{label(row.level)}</span><span className="text-[10px] font-bold text-[#849184]">{row.affiliate_code}</span></div><h3 className="mt-2 font-bold">{row.full_name}</h3><p className="mt-1 text-xs text-[#718174]">{row.phone} · {row.email}{row.location?" · "+row.location:""}</p></div><div className="text-right"><p className="text-sm font-black">{money(Number(row.approved_sales_amount))}</p><p className="text-[10px] text-[#8a9787]">{row.approved_units} units · {row.approved_sales_count} approved sales</p></div></div>
    <div className="mt-4 grid gap-3 sm:grid-cols-4"><div className="rounded-lg bg-[#f7f9f5] p-3"><p className="text-[9px] font-bold uppercase text-[#829083]">Sales target</p><p className="mt-1 text-sm font-black">{row.target_sales_amount===null?"Not assigned":money(Number(row.target_sales_amount))}</p><p className="text-[10px] text-[#839084]">{row.sales_target_progress===null?"":Math.round(row.sales_target_progress)+"% complete"}</p></div><div className="rounded-lg bg-[#f7f9f5] p-3"><p className="text-[9px] font-bold uppercase text-[#829083]">Unit target</p><p className="mt-1 text-sm font-black">{row.target_units===null?"Not assigned":row.target_units}</p><p className="text-[10px] text-[#839084]">{row.units_target_progress===null?"":Math.round(row.units_target_progress)+"% complete"}</p></div><div className="rounded-lg bg-[#f7f9f5] p-3"><p className="text-[9px] font-bold uppercase text-[#829083]">Pending submissions</p><p className="mt-1 text-sm font-black">{row.pending_sales_count}</p></div><div className="rounded-lg bg-[#f7f9f5] p-3"><p className="text-[9px] font-bold uppercase text-[#829083]">Latest verified sale</p><p className="mt-1 text-sm font-black">{row.latest_approved_sale_date?new Date(row.latest_approved_sale_date).toLocaleDateString("en-NG"):"None yet"}</p></div></div>
    <div className="mt-4 grid gap-3 md:grid-cols-[.8fr_1.2fr_1fr_auto]"><label className="text-[10px] font-bold text-[#607465]">Follow-up status<select value={f.contact_status} onChange={e=>setFollowups(v=>({...v,[row.member_id]:{...f,contact_status:e.target.value}}))} className="mt-1 w-full rounded-lg border bg-white px-3 py-2.5 text-xs">{statuses.map(s=><option key={s} value={s}>{label(s)}</option>)}</select></label><label className="text-[10px] font-bold text-[#607465]">Follow-up note<textarea rows={2} maxLength={4000} value={f.followup_note||""} onChange={e=>setFollowups(v=>({...v,[row.member_id]:{...f,followup_note:e.target.value}}))} className="mt-1 w-full rounded-lg border bg-white px-3 py-2.5 text-xs" placeholder="Record the conversation or next action"/></label><label className="text-[10px] font-bold text-[#607465]">Next follow-up date<input type="date" value={f.next_followup_at?.slice(0,10)||""} onChange={e=>setFollowups(v=>({...v,[row.member_id]:{...f,next_followup_at:e.target.value||null}}))} className="mt-1 w-full rounded-lg border bg-white px-3 py-2.5 text-xs"/></label><button disabled={busy===row.member_id} onClick={()=>void saveFollowup(row)} className="self-end rounded-lg bg-[#0b6849] px-4 py-3 text-xs font-bold text-white disabled:opacity-50">{busy===row.member_id?"Saving…":"Save follow-up"}</button></div>
   </article>})}{filtered.length===0&&<p className="py-8 text-center text-sm text-[#879487]">No affiliates match this filter.</p>}</div>
  </section>
  <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_1fr]"><section className="rounded-2xl border bg-white p-5 sm:p-6"><h2 className="font-black">Submit monthly scorecard</h2><p className="mt-1 text-xs leading-5 text-[#879487]">Verified sales, active sellers and target achievers are calculated automatically. Enter the operational activity figures and a concise report.</p><form onSubmit={submitScorecard} className="mt-4 space-y-3"><div className="grid grid-cols-2 gap-3">{[{key:"contacted",label:"Inactive affiliates contacted"},{key:"reactivated",label:"Affiliates reactivated"},{key:"recruits",label:"New recruits"},{key:"firstTarget",label:"Recruits reaching first target"}].map(x=><label key={x.key} className="text-[10px] font-bold text-[#607465]">{x.label}<input required min="0" step="1" type="number" value={report[x.key as keyof typeof report] as string} onChange={e=>setReport(v=>({...v,[x.key]:e.target.value}))} className="mt-1 w-full rounded-lg border px-3 py-2.5 text-xs"/></label>)}</div><label className="block text-[10px] font-bold text-[#607465]">Key obstacles, actions and next priorities<textarea rows={4} maxLength={4000} value={report.notes} onChange={e=>setReport(v=>({...v,notes:e.target.value}))} className="mt-1 w-full rounded-lg border px-3 py-2.5 text-xs"/></label><button disabled={busy==="scorecard"} className="rounded-xl bg-[#0b6849] px-5 py-3 text-xs font-bold text-white disabled:opacity-50">{busy==="scorecard"?"Saving…":"Save monthly scorecard"}</button></form></section>
   <section className="rounded-2xl border bg-white p-5 sm:p-6"><h2 className="font-black">Previous scorecards</h2><div className="mt-4 space-y-3">{scorecards.map(s=><article key={s.id} className="rounded-xl bg-[#f7f9f5] p-4"><div className="flex justify-between gap-2"><b className="text-sm">{new Date(s.period_month+"T00:00:00").toLocaleDateString("en-NG",{month:"long",year:"numeric"})}</b><span className="text-xs font-black">{money(Number(s.verified_group_sales_amount))}</span></div><p className="mt-2 text-[10px] text-[#718174]">{s.affiliates_with_verified_sales} affiliates with sales · {s.target_achievers} target achievers · {s.reactivated_affiliates} reactivated</p>{s.manager_notes&&<p className="mt-2 text-xs leading-5 text-[#607465]">{s.manager_notes}</p>}</article>)}{!scorecards.length&&<p className="py-6 text-sm text-[#879487]">No submitted scorecards yet.</p>}</div></section></div>
  <p className="mt-6 flex items-center gap-2 text-[10px] text-[#8b988c]"><ShieldCheck size={13}/> The manager cannot verify sales, record stock transfers, view payout details or approve rewards. These remain owner-controlled.</p>
 </div></main>;
}
