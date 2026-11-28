"use client";
import { useCallback,useEffect,useState,type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft,Boxes,CheckCircle2,LoaderCircle,RefreshCw,ShieldCheck,Truck } from "lucide-react";
import { supabase } from "@/lib/supabase";
type Member={id:string;affiliate_code:string;affiliate_model:string;status:string};
type Product={id:string;name:string;product_variants:{id:string;pack_size:string;price:number}[]};
type Transfer={id:string;transfer_number:string;transfer_status:string;payment_status:string;source_type:string;source_name:string|null;transferred_at:string;affiliate_program_members:{affiliate_code:string;affiliate_model:string};affiliate_program_stock_transfer_items:{id:string;quantity:number;unit_acquisition_price:number;products:{name:string}|null;product_variants:{pack_size:string}|null}[]};
const money=(n:number)=>new Intl.NumberFormat("en-NG",{style:"currency",currency:"NGN"}).format(n);
const label=(s:string)=>s.replaceAll("_"," ").replace(/\b\w/g,c=>c.toUpperCase());
export default function AffiliateStockPage(){
 const [members,setMembers]=useState<Member[]>([]);const [products,setProducts]=useState<Product[]>([]);const [transfers,setTransfers]=useState<Transfer[]>([]);
 const [memberId,setMemberId]=useState("");const [sourceType,setSourceType]=useState("company");const [sourceName,setSourceName]=useState("");
 const [paymentStatus,setPaymentStatus]=useState("paid");const [paymentReference,setPaymentReference]=useState("");const [notes,setNotes]=useState("");
 const [variantId,setVariantId]=useState("");const [quantity,setQuantity]=useState("1");const [unitPrice,setUnitPrice]=useState("");
 const [loading,setLoading]=useState(true);const [busy,setBusy]=useState("");const [error,setError]=useState("");const [notice,setNotice]=useState("");
 const load=useCallback(async()=>{
  if(!supabase){setError("Database connection is not configured.");setLoading(false);return;}
  const {data:{session}}=await supabase.auth.getSession();if(!session){setError("Sign in through the admin dashboard first.");setLoading(false);return;}
  const {data:admin}=await supabase.from("admin_profiles").select("role,is_active").eq("user_id",session.user.id).maybeSingle();
  if(!admin?.is_active||admin.role!=="owner"){setError("Only the active account owner can manage affiliate stock.");setLoading(false);return;}
  const [m,p,t]=await Promise.all([
   supabase.from("affiliate_program_members").select("id,affiliate_code,affiliate_model,status").in("status",["active","onboarding"]).order("affiliate_code"),
   supabase.from("products").select("id,name,product_variants(id,pack_size,price)").eq("is_active",true).order("name"),
   supabase.from("affiliate_program_stock_transfers").select("id,transfer_number,transfer_status,payment_status,source_type,source_name,transferred_at,affiliate_program_members(affiliate_code,affiliate_model),affiliate_program_stock_transfer_items(id,quantity,unit_acquisition_price,products(name),product_variants(pack_size))").order("transferred_at",{ascending:false}).limit(100)
  ]);
  if(m.error||p.error||t.error)setError("Some stock records could not be loaded.");
  setMembers((m.data||[]) as Member[]);
  setProducts((p.data||[]) as unknown as Product[]);
  setTransfers((t.data||[]) as unknown as Transfer[]);
  setLoading(false);
 },[]);
 useEffect(()=>{void load();},[load]);
 async function record(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(!supabase)return;const q=Number(quantity),price=Number(unitPrice);
  if(!memberId||!variantId||!Number.isInteger(q)||q<1||!Number.isFinite(price)||price<0){setError("Complete all required stock details.");return;}
  setBusy("record");setError("");setNotice("");
  const selected=products.flatMap(p=>p.product_variants.map(v=>({...v,productId:p.id}))).find(v=>v.id===variantId);
  if(!selected){setError("Select a valid product pack size.");setBusy("");return;}
  const {error:e1}=await supabase.rpc("affiliate_program_record_stock_transfer",{p_member_id:memberId,p_source_type:sourceType,p_source_name:sourceName.trim()||null,p_payment_status:paymentStatus,p_payment_reference:paymentReference.trim()||null,p_notes:notes.trim()||null,p_items:[{product_id:selected.productId,variant_id:selected.id,quantity:q,unit_acquisition_price:price}]});
  if(e1)setError(e1.message);else{setNotice("Stock transfer recorded. Confirm it only after the stock and payment details have been checked.");setQuantity("1");setUnitPrice("");setPaymentReference("");setNotes("");await load();}
  setBusy("");
 }
 async function confirm(id:string){if(!supabase)return;setBusy(id);setError("");const {error:e}=await supabase.rpc("affiliate_program_confirm_stock_transfer",{p_transfer_id:id});if(e)setError(e.message);else{setNotice("Stock transfer confirmed and made available for reseller stock checks.");await load();}setBusy("");}
 if(loading)return <main className="grid min-h-screen place-items-center text-sm text-[#42694b]"><LoaderCircle className="mr-2 animate-spin"/>Loading affiliate stock…</main>;
 return <main className="admin-glass-shell min-h-screen px-4 py-8 text-[#25392b] sm:px-8"><div className="mx-auto max-w-6xl">
  <Link href="/admin" className="inline-flex items-center gap-2 text-sm font-semibold text-[#42694b]"><ArrowLeft size={16}/>Admin dashboard</Link>
  <div className="mt-6 flex flex-wrap items-end justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-[#9b7835]">New affiliate programme</p><h1 className="mt-2 text-3xl font-black">Affiliate stock transfers</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[#758276]">Record stock allocated to resellers. Transfers become available for stock checks only after payment and receipt are confirmed.</p></div><button onClick={()=>{setLoading(true);void load();}} className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-3 text-xs font-bold"><RefreshCw size={14}/>Refresh</button></div>
  {error&&<p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}{notice&&<p role="status" className="mt-5 rounded-xl border border-[#dce9dc] bg-[#edf4e9] p-3 text-sm text-[#315b43]">{notice}</p>}
  <section className="mt-6 rounded-3xl border border-white/80 bg-white/90 p-5 shadow-xl shadow-[#173d29]/[.04] sm:p-7"><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-[#edf4e9] text-[#356344]"><Truck size={20}/></span><div><h2 className="font-black">Record a stock transfer</h2><p className="mt-1 text-xs text-[#879487]">The admin team records transfers; affiliates see their own history.</p></div></div>
  <form onSubmit={record} className="mt-6 grid gap-4 sm:grid-cols-2">
   <label className="text-xs font-bold">Affiliate recipient *<select required value={memberId} onChange={e=>setMemberId(e.target.value)} className="mt-2 w-full rounded-xl border bg-[#fbfcfa] px-3 py-3 text-xs"><option value="">Select affiliate</option>{members.map(m=><option key={m.id} value={m.id}>{m.affiliate_code} · {label(m.affiliate_model)} · {label(m.status)}</option>)}</select></label>
   <label className="text-xs font-bold">Stock source *<select value={sourceType} onChange={e=>setSourceType(e.target.value)} className="mt-2 w-full rounded-xl border bg-[#fbfcfa] px-3 py-3 text-xs"><option value="company">eCuisinefoods</option><option value="stockist">Stockist</option><option value="affiliate">Another affiliate</option></select></label>
   {sourceType!=="company"&&<label className="text-xs font-bold">Source name *<input required value={sourceName} onChange={e=>setSourceName(e.target.value)} className="mt-2 w-full rounded-xl border bg-[#fbfcfa] px-3 py-3 text-xs"/></label>}
   <label className="text-xs font-bold">Payment status *<select value={paymentStatus} onChange={e=>setPaymentStatus(e.target.value)} className="mt-2 w-full rounded-xl border bg-[#fbfcfa] px-3 py-3 text-xs"><option value="paid">Paid</option><option value="pending">Pending</option><option value="not_required">Not required</option></select></label>
   <label className="text-xs font-bold sm:col-span-2">Product and pack size *<select required value={variantId} onChange={e=>{setVariantId(e.target.value);const v=products.flatMap(p=>p.product_variants).find(x=>x.id===e.target.value);setUnitPrice(v?String(v.price):"");}} className="mt-2 w-full rounded-xl border bg-[#fbfcfa] px-3 py-3 text-xs"><option value="">Choose pack size</option>{products.map(p=><optgroup key={p.id} label={p.name}>{p.product_variants.map(v=><option key={v.id} value={v.id}>{p.name} · {v.pack_size}</option>)}</optgroup>)}</select></label>
   <label className="text-xs font-bold">Quantity *<input required type="number" min="1" step="1" value={quantity} onChange={e=>setQuantity(e.target.value)} className="mt-2 w-full rounded-xl border bg-[#fbfcfa] px-3 py-3 text-xs"/></label>
   <label className="text-xs font-bold">Unit acquisition price (₦) *<input required type="number" min="0" step=".01" value={unitPrice} onChange={e=>setUnitPrice(e.target.value)} className="mt-2 w-full rounded-xl border bg-[#fbfcfa] px-3 py-3 text-xs"/></label>
   <label className="text-xs font-bold">Payment reference<input value={paymentReference} onChange={e=>setPaymentReference(e.target.value)} className="mt-2 w-full rounded-xl border bg-[#fbfcfa] px-3 py-3 text-xs"/></label>
   <label className="text-xs font-bold">Notes<input value={notes} onChange={e=>setNotes(e.target.value)} className="mt-2 w-full rounded-xl border bg-[#fbfcfa] px-3 py-3 text-xs"/></label>
   <div className="sm:col-span-2"><button disabled={busy==="record"} className="inline-flex items-center gap-2 rounded-xl bg-[#0b6849] px-5 py-3 text-xs font-bold text-white disabled:opacity-50">{busy==="record"?<LoaderCircle size={14} className="animate-spin"/>:<Boxes size={14}/>}Record transfer</button></div>
  </form></section>
  <section className="mt-7"><div className="flex items-center gap-2"><Boxes size={18} className="text-[#477554]"/><h2 className="font-black">Recent transfers</h2></div><div className="mt-4 space-y-3">{transfers.length?transfers.map(t=><article key={t.id} className="rounded-2xl border border-white/80 bg-white/90 p-5 shadow-lg shadow-[#173d29]/[.035]"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex flex-wrap gap-2"><span className="rounded-full bg-[#edf3e9] px-3 py-1 text-[9px] font-black uppercase text-[#315b43]">{t.affiliate_program_members.affiliate_code}</span><span className="rounded-full bg-[#f4f6f1] px-3 py-1 text-[9px] font-black uppercase text-[#657765]">{label(t.source_type)}</span></div><h3 className="mt-3 text-sm font-black">{t.transfer_number}</h3><p className="mt-1 text-[10px] text-[#879487]">{new Date(t.transferred_at).toLocaleString("en-NG")} · {label(t.payment_status)} · {t.source_name||"eCuisinefoods"}</p></div><span className="rounded-full bg-[#f4f6f1] px-3 py-1 text-[9px] font-black uppercase text-[#657765]">{label(t.transfer_status)}</span></div><div className="mt-3 space-y-1">{t.affiliate_program_stock_transfer_items.map(i=><p key={i.id} className="text-xs text-[#607365]">{i.products?.name||"Product"} · {i.product_variants?.pack_size||"Pack"} · {i.quantity} units × {money(Number(i.unit_acquisition_price))}</p>)}</div>{t.transfer_status==="recorded"?<button disabled={busy===t.id||t.payment_status==="pending"} onClick={()=>void confirm(t.id)} className="mt-4 inline-flex items-center gap-2 rounded-xl border border-[#cfe0cf] bg-[#f4faf3] px-4 py-2.5 text-xs font-bold text-[#315b43] disabled:opacity-40">{busy===t.id?<LoaderCircle size={13} className="animate-spin"/>:<CheckCircle2 size={13}/>}Confirm stock received</button>:null}</article>):<p className="rounded-2xl bg-white p-8 text-center text-sm text-[#879487]">No stock transfers recorded yet.</p>}</div></section>
  <p className="mt-7 flex items-center gap-2 text-[10px] text-[#93a092]"><ShieldCheck size={13}/> Owner-only stock management. Confirmation records are retained in the audit log.</p>
 </div></main>;
}
