"use client";

import { useCallback,useEffect,useState,type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft,LoaderCircle,RefreshCw,Save,ShieldCheck,Target,Trophy } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Member={id:string;affiliate_code:string;affiliate_model:"reseller"|"commission";level:string;status:string;application_id:string|null;affiliate_program_applications:{full_name:string}|null};
type TargetRow={id:string;member_id:string;period_month:string;target_sales_amount:number|null;target_units:number|null;assigned_level:string;notes:string|null};
type Scorecard={id:string;period_month:string;manager_user_id:string;verified_group_sales_amount:number};
type Reward={id:string;scorecard_id:string;reward_amount:number;reward_reason:string;status:string;created_at:string};
const monthStart=()=>new Intl.DateTimeFormat("en-CA",{timeZone:"Africa/Lagos",year:"numeric",month:"2-digit"}).format(new Date())+"-01";
const money=(n:number)=>new Intl.NumberFormat("en-NG",{style:"currency",currency:"NGN",maximumFractionDigits:0}).format(n);
const label=(s:string)=>s.replaceAll("_"," ").replace(/\b\w/g,c=>c.toUpperCase());

export default function AffiliatePerformanceAdminPage(){
 const [members,setMembers]=useState<Member[]>([]);const [targets,setTargets]=useState<Record<string,TargetRow>>({});
 const [scorecards,setScorecards]=useState<Scorecard[]>([]);const [rewards,setRewards]=useState<Reward[]>([]);
 const [month,setMonth]=useState(monthStart());const [values,setValues]=useState<Record<string,{amount:string;units:string;notes:string}>>({});
 const [levels,setLevels]=useState<Record<string,string>>({});const [reasons,setReasons]=useState<Record<string,string>>({});
 const [rewardForm,setRewardForm]=useState({scorecard_id:"",amount:"",reason:""});
 const [loading,setLoading]=useState(true);const [busy,setBusy]=useState("");const [error,setError]=useState("");const [notice,setNotice]=useState("");
 const load=useCallback(async()=>{
  if(!supabase){setError("Database connection is not configured.");setLoading(false);return;}
  const {data:{session}}=await supabase.auth.getSession();
  if(!session){setError("Sign in through the admin dashboard first.");setLoading(false);return;}
  const {data:admin,error:ae}=await supabase.from("admin_profiles").select("role,is_active").eq("user_id",session.user.id).maybeSingle();
  if(ae||!admin?.is_active||admin.role!=="owner"){setError("Only the active account owner can configure targets, levels and leader rewards.");setLoading(false);return;}
  const [m,t,s,r]=await Promise.all([
   supabase.from("affiliate_program_members").select("id,affiliate_code,affiliate_model,level,status,application_id,affiliate_program_applications(full_name)").order("affiliate_code"),
   supabase.from("affiliate_program_monthly_targets").select("id,member_id,period_month,target_sales_amount,target_units,assigned_level,notes").eq("period_month",month),
   supabase.from("affiliate_program_manager_scorecards").select("id,period_month,manager_user_id,verified_group_sales_amount").order("period_month",{ascending:false}).limit(24),
   supabase.from("affiliate_program_leader_rewards").select("id,scorecard_id,reward_amount,reward_reason,status,created_at").order("created_at",{ascending:false}).limit(50)
  ]);
  if(m.error||t.error||s.error||r.error){setError("Affiliate performance data could not be loaded. Confirm the programme migrations are installed.");setLoading(false);return;}
  const ms=(m.data||[]) as unknown as Member[];const ts=(t.data||[]) as TargetRow[];
  setMembers(ms);setTargets(Object.fromEntries(ts.map(x=>[x.member_id,x])));
  setLevels(Object.fromEntries(ms.map(x=>[x.id,x.level])));
  setValues(Object.fromEntries(ms.map(x=>{const y=ts.find(z=>z.member_id===x.id);return [x.id,{amount:y?.target_sales_amount==null?"":String(y.target_sales_amount),units:y?.target_units==null?"":String(y.target_units),notes:y?.notes||""}]})));
  setScorecards((s.data||[]) as Scorecard[]);setRewards((r.data||[]) as Reward[]);setLoading(false);setError("");
 },[month]);
 useEffect(()=>{void load();},[load]);
 async function saveTarget(member:Member){
  if(!supabase)return;const v=values[member.id];const amount=v.amount.trim()===""?null:Number(v.amount);const units=v.units.trim()===""?null:Number(v.units);
  if(amount===null&&units===null){setError("Enter a sales-value target, a unit target, or both.");return;}
  if((amount!==null&&(!Number.isFinite(amount)||amount<0))||(units!==null&&(!Number.isInteger(units)||units<0))){setError("Targets must be valid non-negative amounts and whole units.");return;}
  setBusy(member.id);setError("");setNotice("");
  const {data:{session}}=await supabase.auth.getSession();
  const {error:e}=await supabase.from("affiliate_program_monthly_targets").upsert({member_id:member.id,period_month:month,target_sales_amount:amount,target_units:units,assigned_level:member.level,assigned_by:session?.user.id,notes:v.notes.trim()||null},{onConflict:"member_id,period_month"});
  if(e)setError(e.message);else{setNotice("Monthly target saved for "+member.affiliate_code+".");await load();}
  setBusy("");
 }
 async function changeLevel(member:Member){
  if(!supabase)return;const next=levels[member.id];if(next===member.level)return;
  const reason=reasons[member.id]?.trim();if(!reason){setError("Enter a reason for the level change.");return;}
  setBusy("level-"+member.id);setError("");setNotice("");
  const {error:e}=await supabase.rpc("affiliate_program_set_member_level",{p_member_id:member.id,p_new_level:next,p_effective_from:month,p_reason:reason});
  if(e)setError(e.message);else{setNotice("Level updated for "+member.affiliate_code+".");await load();}
  setBusy("");
 }
 async function createReward(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(!supabase)return;const amount=Number(rewardForm.amount);
  if(!rewardForm.scorecard_id||!Number.isFinite(amount)||amount<=0||!rewardForm.reason.trim()){setError("Choose a scorecard and enter a valid reward amount and reason.");return;}
  setBusy("reward");setError("");setNotice("");
  const {error:e1}=await supabase.from("affiliate_program_leader_rewards").insert({scorecard_id:rewardForm.scorecard_id,reward_amount:amount,reward_reason:rewardForm.reason.trim(),status:"pending_approval"});
  if(e1)setError(e1.message);else{setNotice("Leader reward recorded for owner review.");setRewardForm({scorecard_id:"",amount:"",reason:""});await load();}
  setBusy("");
 }
 async function updateReward(reward:Reward,status:"approved"|"paid"|"rejected"){
  if(!supabase)return;setBusy(reward.id);setError("");setNotice("");
  const {data:{session}}=await supabase.auth.getSession();
  const update:Record<string,unknown>={status};
  if(status==="approved"){update.approved_by=session?.user.id;update.approved_at=new Date().toISOString();}
  if(status==="paid"){update.paid_by=session?.user.id;update.paid_at=new Date().toISOString();}
  const {error:e}=await supabase.from("affiliate_program_leader_rewards").update(update).eq("id",reward.id);
  if(e)setError(e.message);else{setNotice("Leader reward status updated.");await load();}
  setBusy("");
 }
 if(loading)return <main className="grid min-h-screen place-items-center bg-[#f5f8f2] text-sm font-semibold text-[#315b43]"><LoaderCircle className="mr-2 animate-spin"/>Loading performance controls…</main>;
 return <main className="min-h-screen bg-[#f5f8f2] px-4 py-8 text-[#203b2b] sm:px-8"><div className="mx-auto max-w-7xl">
  <Link href="/admin/affiliates" className="inline-flex items-center gap-2 text-sm font-semibold text-[#42694b]"><ArrowLeft size={16}/>Affiliate applications</Link>
  <div className="mt-6 flex flex-wrap items-end justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-[#9b7835]">Owner controls</p><h1 className="mt-2 text-3xl font-black sm:text-4xl">Targets, levels & rewards</h1><p className="mt-2 max-w-2xl text-sm text-[#758276]">Assign realistic monthly targets, record level decisions and review manager rewards. No rates, targets or reward amounts are assumed.</p></div><div className="flex gap-2"><input type="month" aria-label="Target month" value={month.slice(0,7)} onChange={e=>setMonth(e.target.value+"-01")} className="rounded-xl border bg-white px-3 py-2.5 text-xs font-bold"/><button onClick={()=>{setLoading(true);void load();}} className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-3 text-xs font-bold"><RefreshCw size={14}/>Refresh</button></div></div>
  {error&&<p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}{notice&&<p role="status" className="mt-5 rounded-xl border border-[#dce9dc] bg-[#edf4e9] p-3 text-sm text-[#315b43]">{notice}</p>}
  <section className="mt-6 rounded-2xl border bg-white p-5 sm:p-6"><div className="flex items-center gap-2"><Target className="text-[#477554]"/><h2 className="font-black">Monthly targets and affiliate levels</h2></div><div className="mt-4 space-y-4">{members.map(member=>{const v=values[member.id]||{amount:"",units:"",notes:""};return <article key={member.id} className="rounded-xl border border-[#e7ece5] p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-bold">{member.affiliate_program_applications?.full_name||"Affiliate"} <span className="text-xs text-[#819084]">· {member.affiliate_code}</span></h3><p className="mt-1 text-[10px] text-[#879487]">{label(member.affiliate_model)} · {label(member.status)} · Current level: {label(member.level)}</p></div><span className="rounded-full bg-[#edf3e9] px-3 py-1 text-[9px] font-black uppercase text-[#315b43]">{targets[member.id]?"Target assigned":"No target yet"}</span></div><div className="mt-4 grid gap-3 sm:grid-cols-4"><label className="text-[10px] font-bold text-[#607465]">Sales-value target (₦)<input type="number" min="0" step=".01" value={v.amount} onChange={e=>setValues(x=>({...x,[member.id]:{...v,amount:e.target.value}}))} className="mt-1 w-full rounded-lg border px-3 py-2.5 text-xs"/></label><label className="text-[10px] font-bold text-[#607465]">Unit target<input type="number" min="0" step="1" value={v.units} onChange={e=>setValues(x=>({...x,[member.id]:{...v,units:e.target.value}}))} className="mt-1 w-full rounded-lg border px-3 py-2.5 text-xs"/></label><label className="text-[10px] font-bold text-[#607465] sm:col-span-2">Target notes<input maxLength={1000} value={v.notes} onChange={e=>setValues(x=>({...x,[member.id]:{...v,notes:e.target.value}}))} className="mt-1 w-full rounded-lg border px-3 py-2.5 text-xs" placeholder="Optional context for this target"/></label></div><button disabled={busy===member.id} onClick={()=>void saveTarget(member)} className="mt-3 rounded-lg bg-[#0b6849] px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50">{busy===member.id?"Saving…":"Save target"}</button><div className="mt-5 border-t border-[#edf0eb] pt-4"><div className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]"><label className="text-[10px] font-bold text-[#607465]">Set level<select value={levels[member.id]||member.level} onChange={e=>setLevels(x=>({...x,[member.id]:e.target.value}))} className="mt-1 w-full rounded-lg border bg-white px-3 py-2.5 text-xs"><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select></label><label className="text-[10px] font-bold text-[#607465] sm:col-span-2">Reason for level change<input value={reasons[member.id]||""} onChange={e=>setReasons(x=>({...x,[member.id]:e.target.value}))} maxLength={1000} className="mt-1 w-full rounded-lg border px-3 py-2.5 text-xs" placeholder="Required only when changing level"/></label><button disabled={busy==="level-"+member.id||levels[member.id]===member.level} onClick={()=>void changeLevel(member)} className="self-end rounded-lg border border-[#dce5db] px-4 py-2.5 text-xs font-bold disabled:opacity-40">Update level</button></div></div></article>})}{!members.length&&<p className="py-8 text-center text-sm text-[#879487]">No affiliate programme members have been activated yet.</p>}</div></section>
  <div className="mt-6 grid gap-5 lg:grid-cols-2"><section className="rounded-2xl border bg-white p-5 sm:p-6"><div className="flex items-center gap-2"><Trophy className="text-[#9b7835]"/><h2 className="font-black">Record Affiliate Sales & Growth Manager reward</h2></div><p className="mt-2 text-xs leading-5 text-[#879487]">Rewards are entered manually after reviewing the scorecard. This does not calculate or approve a bonus automatically.</p><form onSubmit={createReward} className="mt-4 space-y-3"><label className="block text-[10px] font-bold text-[#607465]">Manager scorecard<select required value={rewardForm.scorecard_id} onChange={e=>setRewardForm(v=>({...v,scorecard_id:e.target.value}))} className="mt-1 w-full rounded-lg border bg-white px-3 py-2.5 text-xs"><option value="">Choose scorecard</option>{scorecards.map(s=><option key={s.id} value={s.id}>{new Date(s.period_month+"T00:00:00").toLocaleDateString("en-NG",{month:"long",year:"numeric"})} · {money(Number(s.verified_group_sales_amount))}</option>)}</select></label><label className="block text-[10px] font-bold text-[#607465]">Reward amount (₦)<input required type="number" min="1" step=".01" value={rewardForm.amount} onChange={e=>setRewardForm(v=>({...v,amount:e.target.value}))} className="mt-1 w-full rounded-lg border px-3 py-2.5 text-xs"/></label><label className="block text-[10px] font-bold text-[#607465]">Reason<textarea required rows={2} maxLength={1000} value={rewardForm.reason} onChange={e=>setRewardForm(v=>({...v,reason:e.target.value}))} className="mt-1 w-full rounded-lg border px-3 py-2.5 text-xs"/></label><button disabled={busy==="reward"} className="rounded-xl bg-[#0b6849] px-5 py-3 text-xs font-bold text-white disabled:opacity-50">{busy==="reward"?"Saving…":"Record pending reward"}</button></form></section>
   <section className="rounded-2xl border bg-white p-5 sm:p-6"><h2 className="font-black">Leader rewards register</h2><div className="mt-4 space-y-3">{rewards.map(reward=><article key={reward.id} className="rounded-xl bg-[#f7f9f5] p-4"><div className="flex flex-wrap items-center justify-between gap-2"><b className="text-sm">{money(Number(reward.reward_amount))}</b><span className="text-[9px] font-black uppercase text-[#607465]">{label(reward.status)}</span></div><p className="mt-2 text-xs text-[#718174]">{reward.reward_reason}</p><div className="mt-3 flex flex-wrap gap-2">{reward.status==="pending_approval"&&<><button disabled={busy===reward.id} onClick={()=>void updateReward(reward,"approved")} className="rounded-lg bg-[#0b6849] px-3 py-2 text-[10px] font-bold text-white">Approve</button><button disabled={busy===reward.id} onClick={()=>void updateReward(reward,"rejected")} className="rounded-lg border border-red-200 px-3 py-2 text-[10px] font-bold text-red-700">Reject</button></>}{reward.status==="approved"&&<button disabled={busy===reward.id} onClick={()=>void updateReward(reward,"paid")} className="rounded-lg border px-3 py-2 text-[10px] font-bold">Mark paid</button>}</div></article>)}{!rewards.length&&<p className="py-6 text-sm text-[#879487]">No leader rewards have been recorded.</p>}</div></section></div>
  <p className="mt-6 flex items-center gap-2 text-[10px] text-[#8b988c]"><ShieldCheck size={13}/> Owner-only controls. Commission rates and automatic earnings remain disabled until the settlement model and margins are approved.</p>
 </div></main>;
}
