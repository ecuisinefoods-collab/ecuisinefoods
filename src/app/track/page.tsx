"use client";
import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, PackageCheck, Search, Truck } from "lucide-react";
import { supabase } from "@/lib/supabase";

type TrackingResult={found:boolean;order_number?:number;status?:string;payment_status?:string;fulfillment_method?:string;pickup_city?:string;pickup_location_name?:string;delivery_state?:string;delivery_city?:string;delivery_area?:string;created_at?:string;items?:{product_name:string;pack_size:string;quantity:number}[]};
const steps=["New","Confirmed","Processing","Ready for pickup","Out for delivery","Completed"];
export default function TrackOrderPage(){
 const [code,setCode]=useState("");
 const [result,setResult]=useState<TrackingResult|null>(null);
 const [loading,setLoading]=useState(false);
 const [error,setError]=useState("");
 useEffect(()=>{const value=new URLSearchParams(window.location.search).get("code");if(value)setCode(value);},[]);
 async function lookup(e?:FormEvent){e?.preventDefault();if(!supabase)return;setLoading(true);setError("");setResult(null);const {data,error:rpcError}=await supabase.rpc("track_order_request",{p_tracking_code:code.trim()});if(rpcError)setError(rpcError.message);else if(!data?.found)setError("We could not find an order with that tracking code. Check the code from your order confirmation.");else setResult(data as TrackingResult);setLoading(false);}
 const currentIndex=result?steps.indexOf(result.status||"New"):-1;
 return <main className="storefront-glass min-h-screen px-4 py-10 sm:px-6"><div className="mx-auto max-w-3xl"><Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-[#42694b]"><ArrowLeft size={15}/> Back to store</Link>
  <div className="mt-7 rounded-3xl border border-white/70 bg-white/65 p-6 shadow-2xl shadow-[#506f56]/10 backdrop-blur-2xl sm:p-9"><div className="flex items-center gap-3"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#edf3e9] text-[#245b42]"><Truck size={22}/></span><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#8a9787]">Order status</p><h1 className="text-3xl font-semibold text-[#1e3b29]">Track your order</h1></div></div>
   <p className="mt-4 text-sm leading-6 text-[#718071]">Enter the private tracking code provided after placing your order. You do not need to create an account.</p>
   <form onSubmit={lookup} className="mt-6 flex flex-col gap-3 sm:flex-row"><input required value={code} onChange={e=>setCode(e.target.value)} placeholder="Paste your order tracking code" className="min-w-0 flex-1 rounded-xl border bg-white/85 px-4 py-3 text-sm"/><button disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#245b42] px-5 py-3 text-sm font-bold text-white disabled:opacity-50"><Search size={15}/>{loading?"Checking…":"Find my order"}</button></form>
   {error&&<p role="alert" className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
   {result&&<section className="mt-7 border-t border-[#dce6da]/70 pt-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-[#7d8b7c]">Order #{result.order_number}</p><p className="mt-1 text-lg font-bold text-[#203329]">{result.status}</p><p className="mt-1 text-xs text-[#829080]">Placed {result.created_at?new Date(result.created_at).toLocaleString("en-NG"):""}</p></div><span className="rounded-full bg-[#edf3e9] px-3 py-1.5 text-xs font-bold capitalize text-[#42664a]">{result.payment_status||"unpaid"} · payment</span></div>
    <div className="mt-6 grid gap-3 rounded-2xl bg-white/70 p-4 sm:grid-cols-2"><div><p className="text-[10px] font-bold uppercase tracking-wider text-[#8a9787]">Delivery method</p><p className="mt-1 text-sm font-semibold capitalize">{result.fulfillment_method}</p></div><div><p className="text-[10px] font-bold uppercase tracking-wider text-[#8a9787]">Collection / delivery area</p><p className="mt-1 text-sm font-semibold">{result.fulfillment_method==="pickup"?[result.pickup_city,result.pickup_location_name].filter(Boolean).join(" · "):[result.delivery_area,result.delivery_city,result.delivery_state].filter(Boolean).join(" · ")}</p></div></div>
    <h2 className="mt-6 font-bold">Order progress</h2>{result.status==="Cancelled"?<p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">This order has been cancelled. Please contact our team if you need help.</p>:<div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">{steps.filter(s=>s!=="Out for delivery"||result.fulfillment_method==="delivery").map((step)=>{const idx=steps.indexOf(step);const active=currentIndex>=idx&&currentIndex>=0;return <div key={step} className={active?"rounded-xl border border-[#b8d2bb] bg-[#edf5ea] p-3":"rounded-xl border border-[#e4e9e1] bg-white/50 p-3"}><span className={active?"text-xs font-bold text-[#245b42]":"text-xs font-semibold text-[#8a9689]"}>{active?"✓ ":"○ "}{step}</span></div>})}</div>}
    <h2 className="mt-6 font-bold">Items</h2><div className="mt-2 space-y-2">{(result.items||[]).map((item,i)=><div key={i} className="flex justify-between gap-3 rounded-xl bg-white/60 p-3 text-sm"><span>{item.product_name} · {item.pack_size}</span><b>× {item.quantity}</b></div>)}</div>
    <p className="mt-5 text-xs leading-5 text-[#829080]">For payment confirmation, pickup directions or delivery updates, contact eCuisinefoods on <a className="font-bold text-[#245b42]" href="https://wa.me/2348080942328">WhatsApp</a>. Do not share your tracking code publicly.</p>
   </section>}
  </div></div></main>;
}
