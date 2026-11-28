"use client";
import {useCallback,useEffect,useState} from "react";
import Link from "next/link";
import {ArrowLeft,LoaderCircle,RefreshCw,ShieldCheck} from "lucide-react";
import {supabase} from "@/lib/supabase";

type Payout={member_id:string;bank_name:string;account_name:string;account_number:string;updated_at:string;affiliate_program_members:{affiliate_code:string;affiliate_model:string;affiliate_program_applications:{full_name:string}|null}|null};
type Earning={id:string;member_id:string;earning_type:string;amount:number;status:string;created_at:string;payout_reference:string|null;affiliate_program_members:{affiliate_code:string;affiliate_program_applications:{full_name:string}|null}|null};
export default function AffiliatePayoutDetailsPage(){
 const [items,setItems]=useState<Payout[]>([]);const [earnings,setEarnings]=useState<Earning[]>([]);const [references,setReferences]=useState<Record<string,string>>({});const [loading,setLoading]=useState(true);const [busy,setBusy]=useState("");const [error,setError]=useState("");const [notice,setNotice]=useState("");
 const load=useCallback(async()=>{
  if(!supabase){setError("Database connection is not configured.");setLoading(false);return;}
  const {data:{session}}=await supabase.auth.getSession();
  if(!session){setError("Sign in through the admin dashboard first.");setLoading(false);return;}
  const {data:admin,error:ae}=await supabase.from("admin_profiles").select("role,is_active").eq("user_id",session.user.id).maybeSingle();
  if(ae||!admin?.is_active||admin.role!=="owner"){setError("Bank details are restricted to the active account owner.");setLoading(false);return;}
  const [payoutRows,earningRows]=await Promise.all([
   supabase.from("affiliate_program_payout_details").select("member_id,bank_name,account_name,account_number,updated_at,affiliate_program_members(affiliate_code,affiliate_model,affiliate_program_applications(full_name))").order("updated_at",{ascending:false}),
   supabase.from("affiliate_program_earnings").select("id,member_id,earning_type,amount,status,created_at,payout_reference,affiliate_program_members(affiliate_code,affiliate_program_applications(full_name))").order("created_at",{ascending:false}).limit(250)
  ]);
  if(payoutRows.error||earningRows.error)setError("Payout or earnings records could not be loaded. Confirm the affiliate programme database migrations are installed.");
  else{setItems((payoutRows.data||[]) as unknown as Payout[]);setEarnings((earningRows.data||[]) as unknown as Earning[]);}
  setLoading(false);
 },[]);
 useEffect(()=>{void load();},[load]);
 async function updateEarning(earning:Earning,next:"approved"|"payable"|"paid"){
  if(!supabase)return;
  const reference=references[earning.id]?.trim();
  if(next==="paid"&&!reference){setError("Enter the bank transfer reference before marking an earning as paid.");return;}
  setBusy(earning.id);setError("");setNotice("");
  const {data:{session}}=await supabase.auth.getSession();
  if(!session){setError("Please sign in again.");setBusy("");return;}
  const now=new Date().toISOString();
  const update:Record<string,unknown>={status:next};
  if(next==="approved"||next==="payable"){update.approved_by=session.user.id;update.approved_at=now;}
  if(next==="paid"){update.paid_by=session.user.id;update.paid_at=now;update.payout_reference=reference;}
  const {error:e}=await supabase.from("affiliate_program_earnings").update(update).eq("id",earning.id);
  if(e)setError(e.message);else{setNotice("Earning status updated. Record weekly payments only after the transfer has been completed.");await load();}
  setBusy("");
 }
 if(loading)return <main className="grid min-h-screen place-items-center text-sm text-[#42694b]"><LoaderCircle className="mr-2 animate-spin"/>Loading private payout details…</main>;
 return <main className="min-h-screen bg-[#f5f8f2] px-4 py-8 text-[#203b2b] sm:px-8"><div className="mx-auto max-w-5xl">
  <Link href="/admin/affiliate-performance" className="inline-flex items-center gap-2 text-sm font-semibold text-[#42694b]"><ArrowLeft size={16}/>Targets & rewards</Link>
  <div className="mt-6 flex flex-wrap items-end justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-[#9b7835]">Restricted finance information</p><h1 className="mt-2 text-3xl font-black">Affiliate payout details</h1><p className="mt-2 text-sm text-[#758276]">Private bank details supplied by affiliates for approved programme payouts.</p></div><button onClick={()=>{setLoading(true);void load();}} className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-3 text-xs font-bold"><RefreshCw size={14}/>Refresh</button></div>
  {error&&<p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
  <div className="mt-6 space-y-3">{items.map(item=><article key={item.member_id} className="rounded-2xl border border-white bg-white p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-black">{item.affiliate_program_members?.affiliate_program_applications?.full_name||"Affiliate"}</h2><p className="mt-1 text-xs text-[#879487]">{item.affiliate_program_members?.affiliate_code} · {item.affiliate_program_members?.affiliate_model}</p></div><span className="text-[10px] text-[#879487]">Updated {new Date(item.updated_at).toLocaleDateString("en-NG")}</span></div><dl className="mt-4 grid gap-3 sm:grid-cols-3"><div className="rounded-lg bg-[#f7f9f5] p-3"><dt className="text-[9px] font-bold uppercase text-[#829083]">Bank</dt><dd className="mt-1 text-sm font-bold">{item.bank_name}</dd></div><div className="rounded-lg bg-[#f7f9f5] p-3"><dt className="text-[9px] font-bold uppercase text-[#829083]">Account name</dt><dd className="mt-1 text-sm font-bold">{item.account_name}</dd></div><div className="rounded-lg bg-[#f7f9f5] p-3"><dt className="text-[9px] font-bold uppercase text-[#829083]">Account number</dt><dd className="mt-1 text-sm font-bold tracking-wider">{item.account_number}</dd></div></dl></article>)}{!items.length&&!error&&<div className="rounded-2xl border bg-white p-10 text-center text-sm text-[#879487]">No affiliates have submitted payout details yet.</div>}</div>
  <section className="mt-7 rounded-2xl border border-white bg-white p-5 shadow-sm sm:p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#9b7835]">Weekly reconciliation</p><h2 className="mt-1 text-xl font-black">Affiliate earnings and payouts</h2><p className="mt-2 max-w-2xl text-xs leading-5 text-[#758276]">Review approved earnings, mark eligible amounts payable, and record the bank transfer reference when a weekly payment is completed. No commission or reseller margin is calculated until the approved financial rules generate an earning record.</p></div><div className="rounded-xl bg-[#f7f9f5] px-4 py-3"><p className="text-[9px] font-bold uppercase text-[#879487]">Ready for payment</p><b className="text-lg">{new Intl.NumberFormat("en-NG",{style:"currency",currency:"NGN",maximumFractionDigits:0}).format(earnings.filter(x=>x.status==="payable").reduce((n,x)=>n+Number(x.amount),0))}</b></div></div>{notice&&<p role="status" className="mt-4 rounded-xl bg-[#edf4e9] p-3 text-xs text-[#315b43]">{notice}</p>}<div className="mt-4 space-y-3">{earnings.map(earning=><article key={earning.id} className="rounded-xl border border-[#e7ece5] p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><b className="text-sm">{earning.affiliate_program_members?.affiliate_program_applications?.full_name||"Affiliate"} · {earning.affiliate_program_members?.affiliate_code||""}</b><p className="mt-1 text-[10px] text-[#879487]">{earning.earning_type.replaceAll("_"," ")} · {new Date(earning.created_at).toLocaleDateString("en-NG")}</p></div><div className="text-right"><b className="text-lg">{new Intl.NumberFormat("en-NG",{style:"currency",currency:"NGN",maximumFractionDigits:0}).format(Number(earning.amount))}</b><p className="mt-1 text-[9px] font-black uppercase text-[#607465]">{earning.status.replaceAll("_"," ")}</p></div></div>{earning.status==="pending"&&<button disabled={busy===earning.id} onClick={()=>void updateEarning(earning,"approved")} className="mt-3 rounded-lg bg-[#0b6849] px-3 py-2 text-[10px] font-bold text-white disabled:opacity-50">Approve earning</button>}{earning.status==="approved"&&<button disabled={busy===earning.id} onClick={()=>void updateEarning(earning,"payable")} className="mt-3 rounded-lg border px-3 py-2 text-[10px] font-bold disabled:opacity-50">Mark payable for weekly run</button>}{earning.status==="payable"&&<div className="mt-3 flex flex-wrap gap-2"><input value={references[earning.id]||""} onChange={e=>setReferences(v=>({...v,[earning.id]:e.target.value}))} placeholder="Bank transfer reference" className="min-w-[220px] flex-1 rounded-lg border px-3 py-2 text-xs"/><button disabled={busy===earning.id} onClick={()=>void updateEarning(earning,"paid")} className="rounded-lg bg-[#0b6849] px-3 py-2 text-[10px] font-bold text-white disabled:opacity-50">Mark paid</button></div>}{earning.status==="paid"&&earning.payout_reference&&<p className="mt-2 text-[10px] text-[#718174]">Payment reference: {earning.payout_reference}</p>}</article>)}{!earnings.length&&<p className="rounded-xl bg-[#f7f9f5] p-6 text-center text-xs leading-6 text-[#879487]">No earnings have been generated yet. This is expected until approved commission rates and reseller margin calculations are configured.</p>}</div></section>
 <p className="mt-6 flex items-center gap-2 text-[10px] text-[#8b988c]"><ShieldCheck size={13}/> Owner-only view. Affiliate managers and other staff cannot access bank account details.</p>
 </div></main>;
}
