"use client";
import { useCallback,useEffect,useState } from "react";
import Link from "next/link";
import { ArrowLeft,CheckCircle2,ClipboardCheck,LoaderCircle,RefreshCw,ShieldCheck,XCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Item={id:string;quantity:number;unit_selling_price:number;products:{name:string}|null;product_variants:{pack_size:string}|null};
type Sale={id:string;sale_number:string;sale_date:string;payment_status:string;status:string;payment_reference:string|null;payment_evidence_url:string|null;stock_received_from:string|null;submitted_note:string|null;review_note:string|null;submitted_at:string;affiliate_program_members:{affiliate_code:string;affiliate_model:"reseller"|"commission"};affiliate_program_sale_items:Item[]};
const money=(n:number)=>new Intl.NumberFormat("en-NG",{style:"currency",currency:"NGN"}).format(n);
const label=(s:string)=>s.replaceAll("_"," ").replace(/\b\w/g,c=>c.toUpperCase());

export default function AffiliateSalesReviewPage(){
 const [sales,setSales]=useState<Sale[]>([]);const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState("");const [error,setError]=useState("");const [note,setNote]=useState<Record<string,string>>({});
 const load=useCallback(async()=>{
  if(!supabase){setError("Database connection is not configured.");setLoading(false);return;}
  const {data:{session}}=await supabase.auth.getSession();
  if(!session){setError("Sign in to the admin dashboard first.");setLoading(false);return;}
  const {data:admin,error:adminError}=await supabase.from("admin_profiles").select("role,is_active").eq("user_id",session.user.id).maybeSingle();
  if(adminError||!admin?.is_active||admin.role!=="owner"){setError("Only the active account owner can verify affiliate programme sales.");setLoading(false);return;}
  const {data,error:queryError}=await supabase.from("affiliate_program_sales")
   .select("id,sale_number,sale_date,payment_status,status,payment_reference,payment_evidence_url,stock_received_from,submitted_note,review_note,submitted_at,affiliate_program_members(affiliate_code,affiliate_model),affiliate_program_sale_items(id,quantity,unit_selling_price,products(name),product_variants(pack_size))")
   .order("submitted_at",{ascending:false}).limit(150);
  if(queryError)setError(queryError.message);else{
   const hydrated=await Promise.all((data||[]).map(async row=>{
    const path=row.payment_evidence_url as string|null;
    if(!path)return row;
    if(/^https?:\\/\\//i.test(path))return row;
    const {data:signed}=await supabase.storage.from("affiliate-sale-evidence").createSignedUrl(path,600);
    return {...row,payment_evidence_url:signed?.signedUrl||null};
   }));
   setSales(hydrated as unknown as Sale[]);setError("");
  }
  setLoading(false);
 },[]);
 useEffect(()=>{void load();},[load]);
 async function review(sale:Sale,decision:"approved"|"rejected"){
  if(!supabase)return;
  setBusy(sale.id);setError("");
  const {error:e}=await supabase.rpc("affiliate_program_review_sale",{p_sale_id:sale.id,p_decision:decision,p_review_note:note[sale.id]?.trim()||null});
  if(e)setError(e.message);else{setSales(rows=>rows.map(row=>row.id===sale.id?{...row,status:decision,review_note:note[sale.id]||null}:row));}
  setBusy("");
 }
 if(loading)return <main className="grid min-h-screen place-items-center text-sm text-[#42694b]"><LoaderCircle className="mr-2 animate-spin"/>Loading sales for verification…</main>;
 const pending=sales.filter(s=>s.status==="pending_verification");
 return <main className="admin-glass-shell min-h-screen px-4 py-8 text-[#25392b] sm:px-8"><div className="mx-auto max-w-6xl">
  <Link href="/admin" className="inline-flex items-center gap-2 text-sm font-semibold text-[#42694b]"><ArrowLeft size={16}/>Admin dashboard</Link>
  <div className="mt-6 flex flex-wrap items-end justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-[#9b7835]">New affiliate programme</p><h1 className="mt-2 text-3xl font-black text-[#1e352b]">Sales verification</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[#758276]">Review submitted customer sales. Only paid, eligible sales can be approved. Reseller approvals check confirmed stock.</p></div><div className="flex gap-2"><Link href="/admin/affiliates" className="rounded-xl border bg-white px-4 py-3 text-xs font-bold">Applications</Link><button onClick={()=>{setLoading(true);void load();}} className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-3 text-xs font-bold"><RefreshCw size={14}/>Refresh</button></div></div>
  {error&&<p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
  <div className="mt-6 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl border bg-white/85 p-4"><p className="text-[10px] font-black uppercase text-[#819085]">Awaiting verification</p><p className="mt-2 text-3xl font-black">{pending.length}</p></div><div className="rounded-2xl border bg-white/85 p-4"><p className="text-[10px] font-black uppercase text-[#819085]">Approved</p><p className="mt-2 text-3xl font-black">{sales.filter(s=>s.status==="approved").length}</p></div><div className="rounded-2xl border bg-white/85 p-4"><p className="text-[10px] font-black uppercase text-[#819085]">Rejected</p><p className="mt-2 text-3xl font-black">{sales.filter(s=>s.status==="rejected").length}</p></div></div>
  {!sales.length?<div className="mt-7 rounded-3xl border bg-white/85 p-12 text-center"><ClipboardCheck size={32} className="mx-auto text-[#93a394]"/><h2 className="mt-4 font-bold">No affiliate sales submitted yet</h2></div>:<div className="mt-7 space-y-4">{sales.map(s=>{
   const member=s.affiliate_program_members;const total=s.affiliate_program_sale_items.reduce((sum,i)=>sum+i.quantity*Number(i.unit_selling_price),0);
   const canApprove=s.status==="pending_verification"&&s.payment_status==="paid"&&member.affiliate_model==="reseller";
   return <article key={s.id} className="rounded-3xl border border-white/80 bg-white/90 p-5 shadow-xl shadow-[#173d29]/[.045] sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex flex-wrap gap-2"><span className="rounded-full bg-[#edf3e9] px-3 py-1 text-[9px] font-black uppercase text-[#315b43]">{label(member.affiliate_model)}</span><span className="rounded-full bg-[#f4f6f1] px-3 py-1 text-[9px] font-black uppercase text-[#657765]">{label(s.status)}</span></div><h2 className="mt-3 text-lg font-black">{s.sale_number}</h2><p className="mt-1 text-xs text-[#718174]">Affiliate {member.affiliate_code} · {new Date(s.sale_date).toLocaleDateString("en-NG")} · {label(s.payment_status)}</p></div><div className="text-right"><p className="text-[10px] text-[#8a9787]">Submitted {new Date(s.submitted_at).toLocaleString("en-NG")}</p><p className="mt-2 text-xl font-black">{money(total)}</p></div></div>
    <div className="mt-4 space-y-2">{s.affiliate_program_sale_items.map(i=><div key={i.id} className="flex justify-between gap-3 rounded-xl bg-[#f7f9f5] p-3 text-xs"><span className="font-semibold">{i.products?.name||"Product"} · {i.product_variants?.pack_size||"Pack"} × {i.quantity}</span><span>{money(i.quantity*Number(i.unit_selling_price))}</span></div>)}</div>
    {s.payment_reference&&<p className="mt-3 text-xs text-[#718174]">Payment reference: <b>{s.payment_reference}</b></p>}{s.stock_received_from&&<p className="mt-2 text-xs text-[#718174]">Stock received from: <b>{s.stock_received_from==="company"?"eCuisinefoods (Company)":s.stock_received_from.replace(":"," · ")}</b></p>}
    {s.payment_evidence_url&&<p className="mt-2 text-xs"><a href={s.payment_evidence_url} target="_blank" rel="noreferrer" className="font-bold text-[#236448] underline">Open payment evidence</a></p>}{!s.payment_evidence_url&&<p className="mt-2 text-xs text-[#9b7835]">Payment receipt is missing or could not be opened.</p>}
    {s.submitted_note&&<p className="mt-3 rounded-xl bg-[#f7f9f5] p-3 text-xs leading-5 text-[#718174]">{s.submitted_note}</p>}
    {s.review_note&&<p className="mt-3 text-xs text-[#8a6a35]">Review note: {s.review_note}</p>}
    {s.status==="pending_verification"&&<div className="mt-4 border-t border-[#e7ece5] pt-4"><label className="block text-[11px] font-bold text-[#526958]">Review note (required when rejecting; recommended for audit)<textarea rows={2} value={note[s.id]||""} onChange={e=>setNote(v=>({...v,[s.id]:e.target.value}))} className="mt-1.5 w-full rounded-xl border border-[#dce5db] bg-[#fbfcfa] px-3 py-2.5 text-xs"/></label>{member.affiliate_model==="commission"?<p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-800">Commission sales remain on hold until management confirms whether and how customer funds must be remitted to eCuisinefoods. Approval is intentionally disabled.</p>:s.payment_status!=="paid"?<p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">This sale cannot be approved until it is fully paid.</p>:null}
     <div className="mt-4 flex flex-wrap gap-2"><button disabled={busy===s.id||!canApprove} onClick={()=>void review(s,"approved")} className="inline-flex items-center gap-2 rounded-xl bg-[#0b6849] px-4 py-3 text-xs font-bold text-white disabled:opacity-40"><CheckCircle2 size={14}/>{busy===s.id?"Saving…":"Approve sale"}</button><button disabled={busy===s.id||!note[s.id]?.trim()} onClick={()=>void review(s,"rejected")} className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-3 text-xs font-bold text-red-700 disabled:opacity-40"><XCircle size={14}/>Reject sale</button></div>
    </div>}
   </article>;
  })}</div>}
  <p className="mt-7 flex items-center gap-2 text-[10px] text-[#93a092]"><ShieldCheck size={13}/> Owner-only verification. All decisions are recorded in the affiliate audit log.</p>
 </div></main>;
}
