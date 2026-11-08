"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Boxes, History, PackagePlus, RefreshCw } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Variant={id:string;product_id:string;pack_size:string;price:number;stock_quantity:number;products:{name:string;slug:string}|null};
type Movement={id:string;movement_type:string;quantity_change:number;reason:string|null;created_at:string;variant_id:string;product_variants:{pack_size:string;products:{name:string}|null}|null};
export default function InventoryPage(){
 const [variants,setVariants]=useState<Variant[]>([]);
 const [movements,setMovements]=useState<Movement[]>([]);
 const [role,setRole]=useState("");
 const [search,setSearch]=useState("");
 const [drafts,setDrafts]=useState<Record<string,{quantity:string;reason:string}>>({});
 const [loading,setLoading]=useState(true);
 const [saving,setSaving]=useState("");
 const [error,setError]=useState("");
 const [message,setMessage]=useState("");
 const load=useCallback(async()=>{
  if(!supabase){setError("Database connection is not configured.");setLoading(false);return;}
  const {data:{user}}=await supabase.auth.getUser();
  if(!user){setError("Please sign in through the admin dashboard.");setLoading(false);return;}
  const {data:profile}=await supabase.from("admin_profiles").select("role,is_active").eq("user_id",user.id).maybeSingle();
  if(!profile?.is_active||!["owner","store_manager","analyst"].includes(profile.role)){setError("Your account cannot view inventory.");setLoading(false);return;}
  setRole(profile.role);
  const [v,m]=await Promise.all([
   supabase.from("product_variants").select("id,product_id,pack_size,price,stock_quantity,products(name,slug)").order("product_id"),
   supabase.from("inventory_movements").select("id,variant_id,movement_type,quantity_change,reason,created_at,product_variants(pack_size,products(name))").order("created_at",{ascending:false}).limit(40)
  ]);
  if(v.error)setError(v.error.message);else setVariants((v.data||[]) as unknown as Variant[]);
  if(m.error)setError(m.error.message);else setMovements((m.data||[]) as unknown as Movement[]);
  setLoading(false);
 },[]);
 useEffect(()=>{void load();},[load]);
 async function adjust(id:string){
  if(!supabase||!["owner","store_manager"].includes(role))return;
  const draft=drafts[id]||{quantity:"",reason:""};
  const quantity=Number(draft.quantity);
  if(!Number.isInteger(quantity)||quantity===0){setError("Enter a non-zero whole-number stock change.");return;}
  if(!draft.reason.trim()){setError("Enter a reason for the stock adjustment.");return;}
  setSaving(id);setError("");setMessage("");
  const {data,error:rpcError}=await supabase.rpc("adjust_variant_stock",{p_variant_id:id,p_quantity_delta:quantity,p_reason:draft.reason.trim()});
  if(rpcError)setError(rpcError.message);else{setMessage("Stock updated. New quantity: "+data);setDrafts(x=>({...x,[id]:{quantity:"",reason:""}}));await load();}
  setSaving("");
 }
 const shown=variants.filter(v=>((v.products?.name||"")+" "+v.pack_size).toLowerCase().includes(search.toLowerCase()));
 const low=variants.filter(v=>v.stock_quantity<=5);
 if(loading)return <main className="admin-glass-shell p-10">Loading inventory…</main>;
 return <main className="admin-glass-shell min-h-screen px-4 py-8 text-[#25392b] sm:px-8"><div className="mx-auto max-w-6xl">
  <Link href="/admin" className="inline-flex items-center gap-2 text-sm font-semibold text-[#42694b]"><ArrowLeft size={16}/> Admin dashboard</Link>
  <div className="mt-6 flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/70 text-[#245b42] shadow"><Boxes size={22}/></span><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#8a9787]">Stock control</p><h1 className="text-3xl font-semibold text-[#1e3b29]">Inventory</h1><p className="mt-1 text-sm text-[#718071]">View stock by product pack size, record restocks and review stock movements.</p></div></div><button onClick={()=>{setLoading(true);void load();}} className="inline-flex items-center gap-2 rounded-xl border bg-white/70 px-4 py-3 text-xs font-bold"><RefreshCw size={14}/> Refresh</button></div>
  {error&&<p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}{message&&<p className="mt-5 rounded-xl bg-green-50 p-4 text-sm text-green-800">{message}</p>}
  <div className="mt-6 grid gap-3 sm:grid-cols-3"><article className="rounded-2xl border border-white/70 bg-white/65 p-4 shadow backdrop-blur-xl"><p className="text-xs text-[#7b887a]">Pack sizes</p><p className="mt-2 text-2xl font-bold">{variants.length}</p></article><article className="rounded-2xl border border-white/70 bg-white/65 p-4 shadow backdrop-blur-xl"><p className="text-xs text-[#7b887a]">Low stock (5 or fewer)</p><p className="mt-2 text-2xl font-bold text-amber-700">{low.length}</p></article><article className="rounded-2xl border border-white/70 bg-white/65 p-4 shadow backdrop-blur-xl"><p className="text-xs text-[#7b887a]">Out of stock</p><p className="mt-2 text-2xl font-bold text-red-700">{variants.filter(v=>v.stock_quantity===0).length}</p></article></div>
  <section className="mt-6 rounded-3xl border border-white/70 bg-white/65 p-5 shadow-xl shadow-[#506f56]/10 backdrop-blur-xl"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-bold">Stock by pack size</h2><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search product or pack size" className="rounded-xl border bg-white/80 px-3 py-2 text-sm"/></div>
   <div className="mt-4 divide-y divide-[#dce6da]/70">{shown.map(v=><article key={v.id} className="grid gap-3 py-4 md:grid-cols-[1.2fr_.6fr_1.5fr] md:items-center"><div><p className="text-sm font-bold">{v.products?.name||"Product"}</p><p className="mt-1 text-xs text-[#7c897b]">{v.pack_size} · ₦{Number(v.price).toLocaleString("en-NG")}</p></div><div><p className="text-2xl font-bold tabular-nums">{v.stock_quantity}</p><span className={v.stock_quantity===0?"text-xs font-bold text-red-700":v.stock_quantity<=5?"text-xs font-bold text-amber-700":"text-xs font-bold text-green-700"}>{v.stock_quantity===0?"Out of stock":v.stock_quantity<=5?"Low stock":"Healthy"}</span></div>
    {["owner","store_manager"].includes(role)?<div className="grid gap-2 sm:grid-cols-[.45fr_1fr_auto]"><input type="number" step="1" value={drafts[v.id]?.quantity||""} onChange={e=>setDrafts(x=>({...x,[v.id]:{quantity:e.target.value,reason:x[v.id]?.reason||""}}))} placeholder="+ restock / − adjust" className="min-w-0 rounded-lg border bg-white/80 px-3 py-2 text-xs"/><input value={drafts[v.id]?.reason||""} onChange={e=>setDrafts(x=>({...x,[v.id]:{quantity:x[v.id]?.quantity||"",reason:e.target.value}}))} placeholder="Reason (e.g. new stock received)" className="min-w-0 rounded-lg border bg-white/80 px-3 py-2 text-xs"/><button disabled={saving===v.id} onClick={()=>void adjust(v.id)} className="inline-flex items-center justify-center gap-1 rounded-lg bg-[#245b42] px-3 py-2 text-xs font-bold text-white disabled:opacity-50"><PackagePlus size={13}/>{saving===v.id?"Saving…":"Adjust"}</button></div>:<p className="text-xs text-[#829080]">Read-only inventory access</p>}
   </article>)}{!shown.length&&<p className="py-8 text-center text-sm text-[#899487]">No matching pack sizes.</p>}</div>
  </section>
  <section className="mt-6 rounded-3xl border border-white/70 bg-white/65 p-5 shadow-xl shadow-[#506f56]/10 backdrop-blur-xl"><h2 className="flex items-center gap-2 font-bold"><History size={17}/> Recent stock movements</h2><div className="mt-4 divide-y divide-[#dce6da]/70">{movements.map(m=><div key={m.id} className="flex flex-wrap items-center gap-3 py-3"><div className="min-w-0 flex-1"><p className="text-xs font-bold">{m.product_variants?.products?.name||"Product"} · {m.product_variants?.pack_size||"Pack size"}</p><p className="mt-1 text-[10px] text-[#829080]">{m.reason||m.movement_type} · {new Date(m.created_at).toLocaleString("en-NG")}</p></div><strong className={m.quantity_change>0?"text-sm text-green-700":"text-sm text-red-700"}>{m.quantity_change>0?"+":""}{m.quantity_change}</strong><span className="rounded-full bg-[#eff3ec] px-2.5 py-1 text-[10px] font-bold capitalize">{m.movement_type}</span></div>)}{!movements.length&&<p className="py-8 text-center text-sm text-[#899487]">Stock adjustments and order commitments will appear here.</p>}</div></section>
 </div></main>;
}
