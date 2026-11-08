"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, RefreshCw, ShieldAlert, Download, Pencil, Trash2, Search, CheckCircle2 } from "lucide-react";

type Order = {
  id:string; order_number:number; customer_name:string; phone:string; email:string|null;
  fulfillment_method:string; pickup_location_id:string|null; pickup_city:string|null; pickup_location_name:string|null;
  delivery_state:string|null; delivery_city:string|null; delivery_area:string|null; street_address:string|null; house_number_landmark:string|null;
  order_notes:string|null; status:string; subtotal:number; delivery_fee:number; total:number; created_at:string;
  payment_status:string; payment_method:string; payment_reference:string|null; stock_committed:boolean;
};
type Item = { id:string; order_id:string; product_name:string; pack_size:string; quantity:number; line_total:number };
const statuses=["New","Confirmed","Processing","Ready for pickup","Out for delivery","Completed","Cancelled"];
const money=(n:number)=>new Intl.NumberFormat("en-NG",{style:"currency",currency:"NGN",maximumFractionDigits:0}).format(Number(n)||0);

export default function AdminOrdersPage(){
 const [orders,setOrders]=useState<Order[]>([]);
 const [items,setItems]=useState<Item[]>([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [allowed,setAllowed]=useState(false);
 const [role,setRole]=useState("");
 const [saving,setSaving]=useState("");
 const [search,setSearch]=useState("");
 const [statusFilter,setStatusFilter]=useState("all");

 const load=useCallback(async()=>{
  if(!supabase){setError("Database connection is not configured.");setLoading(false);return;}
  const {data:{session}}=await supabase.auth.getSession();
  if(!session){setError("Please sign in through the admin dashboard first.");setLoading(false);return;}
  const {data:profile,error:profileError}=await supabase.from("admin_profiles").select("role,is_active").eq("user_id",session.user.id).maybeSingle();
  if(profileError||!profile?.is_active||!["owner","store_manager","order_officer","finance_officer","analyst"].includes(profile.role)){setError("Your account does not have permission to view customer orders.");setLoading(false);return;}
  setAllowed(true);setRole(profile.role);
  const {data,error:orderError}=await supabase.from("orders").select("*").order("created_at",{ascending:false}).limit(250);
  if(orderError){setError(orderError.message);setLoading(false);return;}
  const rows=(data||[]) as Order[];setOrders(rows);
  if(rows.length){const {data:itemRows,error:itemError}=await supabase.from("order_items").select("id,order_id,product_name,pack_size,quantity,line_total").in("order_id",rows.map(o=>o.id));if(itemError)setError(itemError.message);else setItems((itemRows||[]) as Item[]);}else setItems([]);
  setLoading(false);
 },[]);
 useEffect(()=>{void load();},[load]);

 async function updateStatus(order:Order,status:string){
  if(!supabase)return;setSaving(order.id);setError("");
  const {error:updateError}=await supabase.from("orders").update({status,updated_at:new Date().toISOString()}).eq("id",order.id);
  if(updateError)setError(updateError.message);else await load();
  setSaving("");
 }
 async function markPaymentReceived(order:Order){
  if(!supabase||role!=="owner")return;
  if(!window.confirm("Only continue if the money has actually reached the business account. Mark order #"+order.order_number+" as PAID?"))return;
  const reference=window.prompt("Payment reference or receipt note (optional)",order.payment_reference||"");
  if(reference===null)return;
  setSaving(order.id);setError("");
  const {error:e}=await supabase.from("orders").update({payment_status:"paid",payment_method:"bank_transfer",payment_reference:reference.trim()||null,updated_at:new Date().toISOString()}).eq("id",order.id);
  if(e)setError(e.message);else await load();
  setSaving("");
 }
 function downloadOrders(){
  const cols=["order_number","customer_name","phone","email","fulfillment_method","pickup_city","pickup_location_name","delivery_state","delivery_city","delivery_area","street_address","house_number_landmark","order_notes","status","payment_status","payment_method","subtotal","delivery_fee","total","created_at"];
  const safe=(v:unknown)=>{let x=String(v??"");if(/^[=+@-]/.test(x))x="'"+x;return '"'+x.replace(/"/g,'""')+'"';};
  const body=[cols.join(","),...filtered.map(o=>cols.map(k=>safe((o as unknown as Record<string,unknown>)[k])).join(","))].join("\r\n");
  const url=URL.createObjectURL(new Blob(["\uFEFF"+body],{type:"text/csv;charset=utf-8"}));const a=document.createElement("a");a.href=url;a.download="ecuisinefoods-orders-"+new Date().toISOString().slice(0,10)+".csv";a.click();URL.revokeObjectURL(url);
 }
 async function editOrder(order:Order){
  if(!supabase||!["owner","store_manager","order_officer"].includes(role))return;
  const customer_name=window.prompt("Customer name",order.customer_name);if(customer_name===null)return;
  const phone=window.prompt("Phone number",order.phone);if(phone===null)return;
  const email=window.prompt("Email (leave blank if none)",order.email||"");if(email===null)return;
  const order_notes=window.prompt("Order notes",order.order_notes||"");if(order_notes===null)return;
  setSaving(order.id);const {error:e}=await supabase.from("orders").update({customer_name:customer_name.trim(),phone:phone.trim(),email:email.trim()||null,order_notes:order_notes.trim()||null,updated_at:new Date().toISOString()}).eq("id",order.id);
  if(e)setError(e.message);else await load();setSaving("");
 }
 async function deleteOrder(order:Order){
  if(!supabase||role!=="owner")return;
  if(!window.confirm("Permanently erase order #"+order.order_number+" and its line items? This cannot be undone and affects sales reports."))return;
  setSaving(order.id);const {error:e}=await supabase.from("orders").delete().eq("id",order.id);if(e)setError(e.message);else await load();setSaving("");
 }
 const filtered=useMemo(()=>orders.filter(o=>{
  const term=search.trim().toLowerCase();
  const matches=!term||String(o.order_number).includes(term)||o.customer_name.toLowerCase().includes(term)||o.phone.toLowerCase().includes(term)||(o.email||"").toLowerCase().includes(term);
  return matches&&(statusFilter==="all"||o.status===statusFilter);
 }),[orders,search,statusFilter]);
 const pending=orders.filter(o=>o.status==="New").length;
 return <main className="admin-glass-shell min-h-screen px-4 py-8 text-[#25392b] sm:px-8"><div className="mx-auto max-w-6xl">
  <Link href="/admin" className="inline-flex items-center gap-2 text-sm font-semibold text-[#42694b]"><ArrowLeft size={16}/> Admin dashboard</Link>
  <div className="mt-6 flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#8a9787]">Order management</p><h1 className="mt-1 text-3xl font-semibold text-[#1e3b29]">Customer orders</h1><p className="mt-2 text-sm text-[#7b887a]">Saved customer requests, fulfilment progress, payment state and stock commitment.</p></div><div className="flex gap-2"><button onClick={downloadOrders} className="inline-flex items-center gap-2 rounded-xl border border-[#e3e9e0] bg-white/80 px-4 py-3 text-xs font-bold"><Download size={14}/> Export filtered</button><button onClick={()=>{setLoading(true);setError("");void load();}} className="inline-flex items-center gap-2 rounded-xl border border-[#e3e9e0] bg-white/80 px-4 py-3 text-xs font-bold"><RefreshCw size={14}/> Refresh</button></div></div>
  <div className="mt-5 grid gap-3 sm:grid-cols-3"><article className="rounded-2xl border border-white/70 bg-white/65 p-4 shadow backdrop-blur-xl"><p className="text-xs text-[#7b887a]">All loaded orders</p><p className="mt-1 text-2xl font-bold">{orders.length}</p></article><article className="rounded-2xl border border-white/70 bg-white/65 p-4 shadow backdrop-blur-xl"><p className="text-xs text-[#7b887a]">Awaiting confirmation</p><p className="mt-1 text-2xl font-bold text-amber-700">{pending}</p></article><article className="rounded-2xl border border-white/70 bg-white/65 p-4 shadow backdrop-blur-xl"><p className="text-xs text-[#7b887a]">Completed orders</p><p className="mt-1 text-2xl font-bold text-green-700">{orders.filter(o=>o.status==="Completed").length}</p></article></div>
  <div className="mt-5 flex flex-col gap-3 sm:flex-row"><label className="relative flex-1"><Search size={15} className="absolute left-3 top-3.5 text-[#8a9689]"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search order number, customer, phone or email" className="w-full rounded-xl border border-white/70 bg-white/75 py-3 pl-9 pr-3 text-sm shadow backdrop-blur-xl"/></label><select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="rounded-xl border border-white/70 bg-white/75 px-4 py-3 text-sm shadow backdrop-blur-xl"><option value="all">All statuses</option>{statuses.map(s=><option key={s}>{s}</option>)}</select></div>
  {error&&<p role="alert" className="mt-5 flex items-center gap-2 rounded-xl bg-red-50 p-4 text-sm text-red-700"><ShieldAlert size={17}/>{error}</p>}
  {loading?<p className="mt-8 text-sm text-[#68806b]">Loading orders…</p>:!allowed?null:orders.length===0?<div className="mt-8 rounded-2xl border border-white/70 bg-white/65 p-10 text-center shadow-xl backdrop-blur-xl"><h2 className="font-bold">No customer orders yet</h2><p className="mt-2 text-sm text-[#879286]">Saved customer requests will appear here as soon as customers submit checkout.</p></div>:filtered.length===0?<div className="mt-8 rounded-2xl border border-white/70 bg-white/65 p-8 text-center text-sm text-[#879286] shadow-xl backdrop-blur-xl">No orders match these filters.</div>:
   <div className="mt-7 space-y-4">{filtered.map(order=><article key={order.id} className="rounded-3xl border border-white/70 bg-white/70 p-5 shadow-xl shadow-[#506f56]/10 backdrop-blur-2xl">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-[#7d8b7c]">Order #{order.order_number}</p><h2 className="mt-1 text-lg font-bold">{order.customer_name}</h2><p className="mt-1 text-xs text-[#7d8b7c]">{order.phone}{order.email?" · "+order.email:""} · {new Date(order.created_at).toLocaleString("en-NG")}</p></div>
     <div className="min-w-[190px] text-right"><p className="text-lg font-bold text-[#245b42]">{money(order.total)}</p><div className="mb-2 flex justify-end gap-2">{["owner","store_manager","order_officer"].includes(role)&&<button disabled={saving===order.id} onClick={()=>void editOrder(order)} className="inline-flex items-center gap-1 rounded-lg bg-[#eef3eb] px-2 py-1.5 text-[10px] font-bold text-[#42664a]"><Pencil size={12}/> Edit details</button>}{role==="owner"&&<button disabled={saving===order.id} onClick={()=>void deleteOrder(order)} className="inline-flex items-center gap-1 rounded-lg bg-[#fbefed] px-2 py-1.5 text-[10px] font-bold text-[#a05f54]"><Trash2 size={12}/> Erase</button>}</div>{["owner","store_manager","order_officer"].includes(role)?<select disabled={saving===order.id} value={order.status} onChange={e=>void updateStatus(order,e.target.value)} className="mt-2 rounded-lg border border-[#dfe6dc] bg-white/80 px-3 py-2 text-xs font-bold">{statuses.map(s=><option key={s} value={s}>{s}</option>)}</select>:<span className="mt-2 inline-block text-xs font-bold text-[#718071]">{order.status}</span>}</div>
    </div>
    <div className="mt-4 grid gap-4 border-t border-[#edf0eb] pt-4 md:grid-cols-2">
     <div><p className="text-[10px] font-bold uppercase tracking-wider text-[#8a9787]">Items</p><div className="mt-2 space-y-2">{items.filter(i=>i.order_id===order.id).map(i=><div key={i.id} className="flex justify-between gap-3 text-xs"><span>{i.product_name} · {i.pack_size} × {i.quantity}</span><b>{money(i.line_total)}</b></div>)}</div><p className="mt-3 text-xs text-[#657266]">Stock: <b>{order.stock_committed?"Committed":"Not yet deducted"}</b></p></div>
     <div><p className="text-[10px] font-bold uppercase tracking-wider text-[#8a9787]">Fulfilment & payment</p><p className="mt-2 text-xs font-semibold capitalize">{order.fulfillment_method}</p><p className="mt-1 text-xs leading-5 text-[#657266]">{order.fulfillment_method==="pickup"?[order.pickup_city,order.pickup_location_name].filter(Boolean).join(" · ")||"Pickup details pending":[order.street_address,order.delivery_area,order.delivery_city,order.delivery_state,order.house_number_landmark].filter(Boolean).join(", ")}</p>{order.order_notes&&<p className="mt-2 text-xs text-[#657266]">Note: {order.order_notes}</p>}<p className="mt-3 text-xs text-[#657266]">Subtotal {money(order.subtotal)} · Delivery {money(order.delivery_fee)}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2"><span className={order.payment_status==="paid"?"rounded-full bg-green-100 px-2.5 py-1 text-[10px] font-bold text-green-800":"rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold text-amber-800"}>Payment: {order.payment_status||"unpaid"}</span><span className="rounded-full bg-[#eef2eb] px-2.5 py-1 text-[10px] font-bold capitalize text-[#5d735d]">{(order.payment_method||"whatsapp").replaceAll("_"," ")}</span></div>
      {order.payment_status!=="paid"&&role==="owner"&&<button disabled={saving===order.id} onClick={()=>void markPaymentReceived(order)} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs font-bold text-green-800"><CheckCircle2 size={13}/> Mark payment received</button>}
     </div>
    </div>
   </article>)}</div>}
 </div></main>;
}
