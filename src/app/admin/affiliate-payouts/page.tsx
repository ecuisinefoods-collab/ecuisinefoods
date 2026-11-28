"use client";
import {useCallback,useEffect,useState} from "react";
import Link from "next/link";
import {ArrowLeft,LoaderCircle,RefreshCw,ShieldCheck} from "lucide-react";
import {supabase} from "@/lib/supabase";

type Payout={member_id:string;bank_name:string;account_name:string;account_number:string;updated_at:string;affiliate_program_members:{affiliate_code:string;affiliate_model:string;affiliate_program_applications:{full_name:string}|null}|null};
export default function AffiliatePayoutDetailsPage(){
 const [items,setItems]=useState<Payout[]>([]);const [loading,setLoading]=useState(true);const [error,setError]=useState("");
 const load=useCallback(async()=>{
  if(!supabase){setError("Database connection is not configured.");setLoading(false);return;}
  const {data:{session}}=await supabase.auth.getSession();
  if(!session){setError("Sign in through the admin dashboard first.");setLoading(false);return;}
  const {data:admin,error:ae}=await supabase.from("admin_profiles").select("role,is_active").eq("user_id",session.user.id).maybeSingle();
  if(ae||!admin?.is_active||admin.role!=="owner"){setError("Bank details are restricted to the active account owner.");setLoading(false);return;}
  const {data,error:e}=await supabase.from("affiliate_program_payout_details").select("member_id,bank_name,account_name,account_number,updated_at,affiliate_program_members(affiliate_code,affiliate_model,affiliate_program_applications(full_name))").order("updated_at",{ascending: false});
  if(e)setError("Payout details could not be loaded. Confirm the affiliate programme database migrations are installed.");
  else setItems((data||[]) as unknown as Payout[]);
  setLoading(false);
 },[]);
 useEffect(()=>{void load();},[load]);
 if(loading)return <main className="grid min-h-screen place-items-center text-sm text-[#42694b]"><LoaderCircle className="mr-2 animate-spin"/>Loading private payout details…</main>;
 return <main className="min-h-screen bg-[#f5f8f2] px-4 py-8 text-[#203b2b] sm:px-8"><div className="mx-auto max-w-5xl">
  <Link href="/admin/affiliate-performance" className="inline-flex items-center gap-2 text-sm font-semibold text-[#42694b]"><ArrowLeft size={16}/>Targets & rewards</Link>
  <div className="mt-6 flex flex-wrap items-end justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-[#9b7835]">Restricted finance information</p><h1 className="mt-2 text-3xl font-black">Affiliate payout details</h1><p className="mt-2 text-sm text-[#758276]">Private bank details supplied by affiliates for approved programme payouts.</p></div><button onClick={()=>{setLoading(true);void load();}} className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-3 text-xs font-bold"><RefreshCw size={14}/>Refresh</button></div>
  {error&&<p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
  <div className="mt-6 space-y-3">{items.map(item=><article key={item.member_id} className="rounded-2xl border border-white bg-white p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-black">{item.affiliate_program_members?.affiliate_program_applications?.full_name||"Affiliate"}</h2><p className="mt-1 text-xs text-[#879487]">{item.affiliate_program_members?.affiliate_code} · {item.affiliate_program_members?.affiliate_model}</p></div><span className="text-[10px] text-[#879487]">Updated {new Date(item.updated_at).toLocaleDateString("en-NG")}</span></div><dl className="mt-4 grid gap-3 sm:grid-cols-3"><div className="rounded-lg bg-[#f7f9f5] p-3"><dt className="text-[9px] font-bold uppercase text-[#829083]">Bank</dt><dd className="mt-1 text-sm font-bold">{item.bank_name}</dd></div><div className="rounded-lg bg-[#f7f9f5] p-3"><dt className="text-[9px] font-bold uppercase text-[#829083]">Account name</dt><dd className="mt-1 text-sm font-bold">{item.account_name}</dd></div><div className="rounded-lg bg-[#f7f9f5] p-3"><dt className="text-[9px] font-bold uppercase text-[#829083]">Account number</dt><dd className="mt-1 text-sm font-bold tracking-wider">{item.account_number}</dd></div></dl></article>)}{!items.length&&!error&&<div className="rounded-2xl border bg-white p-10 text-center text-sm text-[#879487]">No affiliates have submitted payout details yet.</div>}</div>
  <p className="mt-6 flex items-center gap-2 text-[10px] text-[#8b988c]"><ShieldCheck size={13}/> Owner-only view. Affiliate managers and other staff cannot access bank account details.</p>
 </div></main>;
}
