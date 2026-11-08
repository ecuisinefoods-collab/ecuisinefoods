"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, CreditCard, MapPin, MessageCircle, PackageCheck, ShoppingBag, Truck } from "lucide-react";
import { NIGERIAN_STATES } from "@/lib/nigerian-states";
import { supabase } from "@/lib/supabase";

type Location = {
  id:string; city:string; location_name:string; instructions:string|null;
  address?:string|null; opening_hours?:string|null; contact_phone?:string|null;
};
type DeliveryZone = {
  id:string; state:string; city:string; area_name:string; delivery_fee:number;
  minimum_order_amount:number; estimated_days:string|null; instructions:string|null;
};
type Item = { variant_id:string; product_id:string; name:string; pack_size:string; price:number; qty:number };
type OrderCreated = { order_number:number; tracking_code:string; subtotal:number; delivery_fee:number; total:number };

const CART_KEY="ecuisinefoods-cart-v1";
const money=(n:number)=>"₦"+Number(n||0).toLocaleString("en-NG");

export function CheckoutForm({ locations, deliveryZones }: { locations: Location[]; deliveryZones: DeliveryZone[] }) {
  const [cart,setCart]=useState<Item[]>([]);
  const [method,setMethod]=useState<"pickup"|"delivery">("pickup");
  const [city,setCity]=useState("Jos");
  const [pickup,setPickup]=useState("");
  const [name,setName]=useState("");
  const [phone,setPhone]=useState("");
  const [email,setEmail]=useState("");
  const [state,setState]=useState("");
  const [deliveryZoneId,setDeliveryZoneId]=useState("");
  const [street,setStreet]=useState("");
  const [landmark,setLandmark]=useState("");
  const [notes,setNotes]=useState("");
  const [submitting,setSubmitting]=useState(false);
  const [error,setError]=useState("");
  const [order,setOrder]=useState<OrderCreated|null>(null);
  const [submittedItems,setSubmittedItems]=useState<Item[]>([]);
  const [whatsappUrl,setWhatsappUrl]=useState("");

  useEffect(()=>{try{setCart(JSON.parse(localStorage.getItem(CART_KEY)||"[]"));}catch{setCart([]);}},[]);
  const subtotal=useMemo(()=>cart.reduce((sum,item)=>sum+Number(item.price)*item.qty,0),[cart]);
  const cityLocations=locations.filter(x=>x.city===city&&x.id);
  const availableZones=deliveryZones.filter(z=>z.state===state);
  const selectedZone=availableZones.find(z=>z.id===deliveryZoneId);
  const deliveryFee=selectedZone?Number(selectedZone.delivery_fee):0;
  const minOrder=Number(selectedZone?.minimum_order_amount||0);
  const minimumMet=method!=="delivery"||!selectedZone||subtotal>=minOrder;
  const missingMinimum=Math.max(0,minOrder-subtotal);
  const canContinue=Boolean(cart.length>0&&name.trim().length>=2&&phone.trim()&&(method==="pickup"?!!pickup:!!state&&!!deliveryZoneId&&!!street.trim()&&minimumMet));

  async function submitOrder(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    if(!supabase){setError("Checkout is temporarily unavailable. Please contact our team on WhatsApp.");return;}
    if(!canContinue){setError("Please complete the required checkout details and check the minimum order for this delivery area.");return;}
    let whatsappTab: Window | null = null;
    try { whatsappTab = window.open("about:blank", "_blank"); } catch { whatsappTab = null; }
    setSubmitting(true);setError("");
    const itemsToSave=cart;
    const payload={
      customer_name:name.trim(),phone:phone.trim(),email:email.trim()||null,
      fulfillment_method:method,pickup_location_id:method==="pickup"?pickup:null,
      delivery_zone_id:method==="delivery"?deliveryZoneId:null,
      street_address:method==="delivery"?street.trim():null,
      house_number_landmark:method==="delivery"?landmark.trim():null,
      order_notes:notes.trim()||null,
      items:itemsToSave.map(item=>({variant_id:item.variant_id,quantity:item.qty}))
    };
    const {data,error:rpcError}=await supabase.rpc("create_order_request",{p_order:payload});
    if(rpcError){whatsappTab?.close();setError(rpcError.message);setSubmitting(false);return;}
    const created=data as OrderCreated;
    if(!created?.order_number||!created?.tracking_code){whatsappTab?.close();setError("Your order could not be confirmed as saved. Please retry or contact support.");setSubmitting(false);return;}

    const trackingUrl=window.location.origin+"/track?code="+encodeURIComponent(created.tracking_code);
    const selected=locations.find(l=>l.id===pickup);
    const lines=[
      "Hello eCuisinefoods, I would like to complete my checkout on WhatsApp.",
      "",
      "Order number: #"+created.order_number,
      ...itemsToSave.map(item=>"• "+item.name+" — "+item.pack_size+" × "+item.qty+" = "+money(item.price*item.qty)),
      "",
      "Subtotal: "+money(Number(created.subtotal)),
      "Delivery: "+money(Number(created.delivery_fee)),
      "Total: "+money(Number(created.total)),
      "Customer: "+name.trim(),
      "Phone: "+phone.trim(),
      email.trim()?"Email: "+email.trim():"",
      method==="pickup"?"Pickup: "+(selected?.city||city)+" — "+(selected?.location_name||"Selected pickup point"):"Delivery: "+street.trim()+", "+selectedZone?.city+", "+selectedZone?.state+" — "+selectedZone?.area_name+(landmark.trim()?" (Landmark: "+landmark.trim()+")":""),
      notes.trim()?"Notes: "+notes.trim():"",
      "",
      "Track this order: "+trackingUrl,
      "Please confirm availability and the payment/collection arrangements. This request is not paid or confirmed until your team replies."
    ].filter(Boolean).join("\n");

    setSubmittedItems(itemsToSave);
    setOrder(created);
    const checkoutWhatsappUrl="https://wa.me/2348080942328?text="+encodeURIComponent(lines);
    setWhatsappUrl(checkoutWhatsappUrl);
    if(whatsappTab){try{whatsappTab.location.href=checkoutWhatsappUrl;}catch{whatsappTab.close();}}
    setCart([]);
    localStorage.removeItem(CART_KEY);
    setSubmitting(false);
  }

  return <main className="storefront-glass min-h-screen px-5 py-10">
    <div className="mx-auto max-w-5xl">
      <Link href="/cart" className="inline-flex items-center gap-2 text-sm font-semibold text-[#245b42]"><ArrowLeft size={15}/> Back to cart</Link>
      <h1 className="mt-5 text-3xl font-semibold tracking-tight text-[#173e2d]">Checkout</h1>
      {order?<section className="mt-6 rounded-3xl border border-white/70 bg-white/70 p-6 shadow-2xl shadow-[#506f56]/10 backdrop-blur-2xl sm:p-9">
        <div className="flex items-center gap-3"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#eaf4e7] text-[#267045]"><CheckCircle2 size={26}/></span><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#7f927e]">Order request saved</p><h2 className="text-2xl font-bold text-[#173e2d]">Thank you. Order #{order.order_number}</h2></div></div>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-[#68766b]">Your order has been saved as unpaid and is awaiting confirmation. WhatsApp should open with your order details so you can complete checkout with our team. If it does not open automatically, use the WhatsApp button below.</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl bg-white/80 p-4"><p className="text-[10px] font-bold uppercase text-[#879286]">Order subtotal</p><p className="mt-1 text-lg font-bold">{money(order.subtotal)}</p></div><div className="rounded-2xl bg-white/80 p-4"><p className="text-[10px] font-bold uppercase text-[#879286]">Delivery fee</p><p className="mt-1 text-lg font-bold">{money(order.delivery_fee)}</p></div><div className="rounded-2xl bg-[#edf5ea] p-4"><p className="text-[10px] font-bold uppercase text-[#55725a]">Total so far</p><p className="mt-1 text-lg font-bold text-[#245b42]">{money(order.total)}</p></div></div>
        <h3 className="mt-6 font-bold text-[#203329]">Items submitted</h3><div className="mt-2 space-y-2">{submittedItems.map(item=><div key={item.variant_id} className="flex justify-between gap-3 rounded-xl bg-white/70 p-3 text-sm"><span>{item.name} · {item.pack_size} × {item.qty}</span><b>{money(item.price*item.qty)}</b></div>)}</div>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row"><a href={whatsappUrl} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-full bg-[#1f9d55] px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#1f9d55]/20"><MessageCircle size={16}/> Open WhatsApp to complete checkout</a><Link href={"/track?code="+encodeURIComponent(order.tracking_code)} className="inline-flex items-center justify-center gap-2 rounded-full border border-[#cbd8c8] bg-white/75 px-6 py-3.5 text-sm font-bold text-[#245b42]"><PackageCheck size={16}/> Track this order</Link></div>
        <div className="mt-5 rounded-xl bg-[#f5f4eb] p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-[#8b8b72]">Private tracking code</p><p className="mt-1 break-all font-mono text-sm font-semibold text-[#344b38]">{order.tracking_code}</p><p className="mt-1 text-xs text-[#829080]">Keep this code safe. It is required to view your order progress.</p></div>
      </section>:!cart.length?<div className="mt-6 rounded-2xl border border-[#e8e9e1] bg-white/75 p-8 text-center shadow-xl backdrop-blur-xl"><ShoppingBag className="mx-auto text-[#8a9689]"/><p className="mt-3 font-semibold text-[#526052]">Your cart is empty</p><Link href="/shop" className="mt-4 inline-block rounded-full bg-[#245b42] px-5 py-3 text-sm font-bold text-white">Browse products</Link></div>:<div className="mt-6 grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
        <form className="space-y-5 rounded-3xl border border-white/70 bg-white/70 p-5 shadow-xl shadow-[#506f56]/10 backdrop-blur-2xl sm:p-7" onSubmit={submitOrder}>
          <section className="rounded-2xl border border-[#b9d8c0] bg-[#eff8f0]/90 p-4 shadow-inner shadow-white">
            <div className="flex items-center gap-2"><MessageCircle size={17} className="text-[#16834a]"/><h2 className="font-bold text-[#203329]">Checkout method</h2></div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border-2 border-[#249653] bg-white/90 p-3 shadow-sm">
                <div className="flex items-center justify-between gap-2"><span className="inline-flex items-center gap-2 text-sm font-bold text-[#176f3b]"><MessageCircle size={16}/> WhatsApp checkout</span><span className="rounded-full bg-[#e3f5e7] px-2 py-1 text-[9px] font-extrabold uppercase tracking-wide text-[#176f3b]">Available</span></div>
                <p className="mt-2 text-xs leading-5 text-[#617265]">Place your order here, then send the saved order details to our team on WhatsApp to confirm it.</p>
              </div>
              <div aria-disabled="true" className="rounded-xl border border-dashed border-[#d7ded5] bg-[#f5f6f3]/85 p-3 opacity-85">
                <div className="flex items-center justify-between gap-2"><span className="inline-flex items-center gap-2 text-sm font-bold text-[#737e73]"><CreditCard size={16}/> Online payments</span><span className="rounded-full bg-[#eee9d8] px-2 py-1 text-[9px] font-extrabold uppercase tracking-wide text-[#817044]">Coming soon</span></div>
                <p className="mt-2 text-xs leading-5 text-[#899288]">Card and online payment options are not available yet. No payment will be taken on this website.</p>
              </div>
            </div>
          </section>
          <section><h2 className="font-bold text-[#203329]">Customer information</h2><div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-semibold text-[#68766b]">Full name<input required minLength={2} value={name} onChange={e=>setName(e.target.value)} className="mt-1.5 w-full rounded-xl border border-[#dfe4da] bg-white/85 px-3 py-3 text-sm text-[#203329] outline-none focus:border-[#245b42]" placeholder="Your name"/></label>
            <label className="text-xs font-semibold text-[#68766b]">Phone number<input required type="tel" value={phone} onChange={e=>setPhone(e.target.value)} className="mt-1.5 w-full rounded-xl border border-[#dfe4da] bg-white/85 px-3 py-3 text-sm text-[#203329] outline-none focus:border-[#245b42]" placeholder="080…"/></label>
            <label className="text-xs font-semibold text-[#68766b] sm:col-span-2">Email (optional)<input type="email" value={email} onChange={e=>setEmail(e.target.value)} className="mt-1.5 w-full rounded-xl border border-[#dfe4da] bg-white/85 px-3 py-3 text-sm text-[#203329] outline-none focus:border-[#245b42]" placeholder="you@example.com"/></label>
          </div></section>
          <section className="border-t border-[#edf0e9] pt-5"><h2 className="font-bold text-[#203329]">How would you like to receive your order?</h2><div className="mt-3 grid grid-cols-2 gap-2"><button type="button" onClick={()=>setMethod("pickup")} className={`rounded-xl border px-4 py-3 text-sm font-bold ${method==="pickup"?"border-[#245b42] bg-[#edf3e9] text-[#245b42]":"border-[#dfe4da] bg-white/70 text-[#68766b]"}`}>Pickup</button><button type="button" onClick={()=>setMethod("delivery")} className={`rounded-xl border px-4 py-3 text-sm font-bold ${method==="delivery"?"border-[#245b42] bg-[#edf3e9] text-[#245b42]":"border-[#dfe4da] bg-white/70 text-[#68766b]"}`}>Home delivery</button></div>
            {method==="pickup"?<div className="mt-4 rounded-xl bg-[#fbfaf7]/80 p-4"><label className="text-xs font-semibold text-[#68766b]">Pickup city<select value={city} onChange={e=>{setCity(e.target.value);setPickup("");}} className="mt-1.5 w-full rounded-xl border border-[#dfe4da] bg-white px-3 py-3 text-sm text-[#203329]">{Array.from(new Set(locations.map(l=>l.city))).map(value=><option key={value}>{value}</option>)}</select></label><label className="mt-3 block text-xs font-semibold text-[#68766b]">Pickup location<select required value={pickup} onChange={e=>setPickup(e.target.value)} className="mt-1.5 w-full rounded-xl border border-[#dfe4da] bg-white px-3 py-3 text-sm text-[#203329]"><option value="">Select a location</option>{cityLocations.map(l=><option key={l.id} value={l.id}>{l.location_name}</option>)}</select></label>{pickup&&(()=>{const selected=cityLocations.find(l=>l.id===pickup);return selected?<div className="mt-3 rounded-xl bg-white/75 p-3 text-xs leading-5 text-[#68766b]"><p className="flex gap-2"><MapPin size={14} className="mt-0.5 shrink-0"/>{selected.address||selected.instructions||"Please wait for our order confirmation before visiting."}</p>{selected.opening_hours&&<p className="mt-2">Hours: {selected.opening_hours}</p>}{selected.contact_phone&&<p className="mt-1">Location contact: {selected.contact_phone}</p>}</div>:null;})()}</div>:<div className="mt-4 grid gap-3 rounded-xl bg-[#fbfaf7]/80 p-4 sm:grid-cols-2"><label className="text-xs font-semibold text-[#68766b]">State<select required value={state} onChange={e=>{setState(e.target.value);setDeliveryZoneId("");}} className="mt-1.5 w-full rounded-xl border border-[#dfe4da] bg-white px-3 py-3 text-sm"><option value="">Select state</option>{NIGERIAN_STATES.map(s=><option key={s} value={s}>{s}</option>)}</select></label><label className="text-xs font-semibold text-[#68766b]">Delivery area<select required value={deliveryZoneId} onChange={e=>setDeliveryZoneId(e.target.value)} disabled={!state||!availableZones.length} className="mt-1.5 w-full rounded-xl border border-[#dfe4da] bg-white px-3 py-3 text-sm"><option value="">{!state?"Choose a state first":availableZones.length?"Choose a configured delivery area":"Delivery is not yet available in this state"}</option>{availableZones.map(z=><option key={z.id} value={z.id}>{z.city} — {z.area_name} ({money(Number(z.delivery_fee))})</option>)}</select></label><label className="text-xs font-semibold text-[#68766b] sm:col-span-2">Street address<input required value={street} onChange={e=>setStreet(e.target.value)} className="mt-1.5 w-full rounded-xl border border-[#dfe4da] bg-white px-3 py-3 text-sm" placeholder="Street / area"/></label><label className="text-xs font-semibold text-[#68766b] sm:col-span-2">House number / landmark<input value={landmark} onChange={e=>setLandmark(e.target.value)} className="mt-1.5 w-full rounded-xl border border-[#dfe4da] bg-white px-3 py-3 text-sm" placeholder="House number or nearby landmark"/></label>{selectedZone&&<div className="rounded-xl bg-white/75 p-3 text-xs leading-5 text-[#68766b] sm:col-span-2"><p>Delivery fee: <b>{money(deliveryFee)}</b>{selectedZone.estimated_days?" · Estimated: "+selectedZone.estimated_days:""}</p>{selectedZone.instructions&&<p className="mt-1">{selectedZone.instructions}</p>}{minOrder>0&&<p className={minimumMet?"mt-1 text-green-700":"mt-1 font-bold text-red-700"}>Minimum order: {money(minOrder)}{minimumMet?" — minimum met":" — add "+money(missingMinimum)+" more to continue"}</p>}</div>}</div>}
          </section>
          <section className="border-t border-[#edf0e9] pt-5"><label className="text-xs font-semibold text-[#68766b]">Order notes (optional)<textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={3} className="mt-1.5 w-full rounded-xl border border-[#dfe4da] bg-white/85 px-3 py-3 text-sm text-[#203329] outline-none focus:border-[#245b42]" placeholder="Anything we should know?"/></label></section>
          {error&&<p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <button type="submit" disabled={!canContinue||submitting} className="w-full rounded-full bg-[#245b42] px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#245b42]/20 transition hover:bg-[#173e2d] disabled:cursor-not-allowed disabled:opacity-40">{submitting?"Saving your order…":"Place order & continue to WhatsApp"}</button>
          <p className="text-xs leading-5 text-[#899288]">Your order request is saved first and given an order number. It remains unpaid and unconfirmed until our team replies. Product prices, stock availability and delivery fees are checked again when the order is saved.</p>
        </form>
        <aside className="h-fit rounded-3xl border border-white/70 bg-white/70 p-5 shadow-xl shadow-[#506f56]/10 backdrop-blur-2xl sm:p-7"><h2 className="font-bold text-[#203329]">Order summary</h2><div className="mt-4 space-y-3">{cart.map(item=><div key={item.variant_id} className="flex justify-between gap-3 text-sm"><div><p className="font-semibold text-[#405044]">{item.name}</p><p className="mt-1 text-xs text-[#899288]">{item.pack_size} × {item.qty}</p></div><span className="font-semibold text-[#405044]">{money(item.price*item.qty)}</span></div>)}</div><div className="mt-5 border-t border-[#edf0e9] pt-4"><div className="flex justify-between text-sm"><span className="text-[#68766b]">Estimated subtotal</span><strong className="text-[#203329]">{money(subtotal)}</strong></div><div className="mt-2 flex justify-between text-sm"><span className="text-[#68766b]">Delivery fee</span><span className="text-[#899288]">{method==="delivery"&&selectedZone?money(deliveryFee):money(0)}</span></div><div className="mt-4 flex justify-between border-t border-[#edf0e9] pt-4"><strong className="text-[#203329]">Estimated total</strong><strong className="text-lg text-[#245b42]">{money(subtotal+(method==="delivery"?deliveryFee:0))}</strong></div><p className="mt-3 text-[10px] leading-5 text-[#929b90]">Final totals are revalidated against the database when you submit your order.</p></div></aside>
      </div>}
    </div>
  </main>;
}
