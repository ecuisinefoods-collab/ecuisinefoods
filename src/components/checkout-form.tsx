"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, MapPin, ShoppingBag } from "lucide-react";

type Location = { id: string; city: "Jos" | "Bauchi"; location_name: string; instructions: string | null };
type Item = { variant_id:string; product_id:string; name:string; pack_size:string; price:number; qty:number };
const CART_KEY="ecuisinefoods-cart-v1";

export function CheckoutForm({ locations }: { locations: Location[] }) {
  const [cart,setCart]=useState<Item[]>([]);
  const [method,setMethod]=useState<"pickup"|"delivery">("pickup");
  const [city,setCity]=useState<"Jos"|"Bauchi">("Jos");
  const [pickup,setPickup]=useState("");
  const [name,setName]=useState("");
  const [phone,setPhone]=useState("");
  const [email,setEmail]=useState("");
  const [state,setState]=useState("");
  const [deliveryCity,setDeliveryCity]=useState("");
  const [street,setStreet]=useState("");
  const [landmark,setLandmark]=useState("");
  const [notes,setNotes]=useState("");
  useEffect(()=>{try{setCart(JSON.parse(localStorage.getItem(CART_KEY)||"[]"));}catch{setCart([]);}},[]);
  const subtotal=useMemo(()=>cart.reduce((sum,item)=>sum+item.price*item.qty,0),[cart]);
  const cityLocations=locations.filter(x=>x.city===city && x.id);
  const canContinue=Boolean(cart.length>0 && name.trim() && phone.trim() && (method==="pickup"?!!pickup:!!state.trim()&&!!deliveryCity.trim()&&!!street.trim()));
  return <main className="min-h-screen bg-[#fbfaf7] px-5 py-10"><div className="mx-auto max-w-5xl">
    <Link href="/cart" className="inline-flex items-center gap-2 text-sm font-semibold text-[#245b42]"><ArrowLeft size={15}/> Back to cart</Link>
    <h1 className="mt-5 text-3xl font-semibold tracking-tight text-[#173e2d]">Checkout</h1>
    {!cart.length?<div className="mt-6 rounded-2xl border border-[#e8e9e1] bg-white p-8 text-center"><ShoppingBag className="mx-auto text-[#8a9689]"/><p className="mt-3 font-semibold text-[#526052]">Your cart is empty</p><Link href="/#shop" className="mt-4 inline-block rounded-full bg-[#245b42] px-5 py-3 text-sm font-bold text-white">Browse products</Link></div>:<div className="mt-6 grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
      <form className="space-y-5 rounded-2xl border border-[#e8e9e1] bg-white p-5 sm:p-7" onSubmit={e=>e.preventDefault()}>
        <section><h2 className="font-bold text-[#203329]">Customer information</h2><div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold text-[#68766b]">Full name<input required value={name} onChange={e=>setName(e.target.value)} className="mt-1.5 w-full rounded-xl border border-[#dfe4da] px-3 py-3 text-sm text-[#203329] outline-none focus:border-[#245b42]" placeholder="Your name"/></label>
          <label className="text-xs font-semibold text-[#68766b]">Phone number<input required type="tel" value={phone} onChange={e=>setPhone(e.target.value)} className="mt-1.5 w-full rounded-xl border border-[#dfe4da] px-3 py-3 text-sm text-[#203329] outline-none focus:border-[#245b42]" placeholder="080…"/></label>
          <label className="text-xs font-semibold text-[#68766b] sm:col-span-2">Email (optional)<input type="email" value={email} onChange={e=>setEmail(e.target.value)} className="mt-1.5 w-full rounded-xl border border-[#dfe4da] px-3 py-3 text-sm text-[#203329] outline-none focus:border-[#245b42]" placeholder="you@example.com"/></label>
        </div></section>
        <section className="border-t border-[#edf0e9] pt-5"><h2 className="font-bold text-[#203329]">How would you like to receive your order?</h2><div className="mt-3 grid grid-cols-2 gap-2"><button type="button" onClick={()=>setMethod("pickup")} className={`rounded-xl border px-4 py-3 text-sm font-bold ${method==="pickup"?"border-[#245b42] bg-[#edf3e9] text-[#245b42]":"border-[#dfe4da] text-[#68766b]"}`}>Pickup</button><button type="button" onClick={()=>setMethod("delivery")} className={`rounded-xl border px-4 py-3 text-sm font-bold ${method==="delivery"?"border-[#245b42] bg-[#edf3e9] text-[#245b42]":"border-[#dfe4da] text-[#68766b]"}`}>Home delivery</button></div>
          {method==="pickup"?<div className="mt-4 rounded-xl bg-[#fbfaf7] p-4"><label className="text-xs font-semibold text-[#68766b]">Pickup city<select value={city} onChange={e=>{setCity(e.target.value as "Jos"|"Bauchi");setPickup("");}} className="mt-1.5 w-full rounded-xl border border-[#dfe4da] bg-white px-3 py-3 text-sm text-[#203329]"><option>Jos</option><option>Bauchi</option></select></label><label className="mt-3 block text-xs font-semibold text-[#68766b]">Pickup location<select required value={pickup} onChange={e=>setPickup(e.target.value)} className="mt-1.5 w-full rounded-xl border border-[#dfe4da] bg-white px-3 py-3 text-sm text-[#203329]"><option value="">Select a location</option>{cityLocations.map(l=><option key={l.id} value={l.id}>{l.location_name}</option>)}</select></label>{pickup&&<p className="mt-3 flex gap-2 text-xs leading-5 text-[#68766b]"><MapPin size={15} className="mt-0.5 shrink-0"/>{cityLocations.find(l=>l.id===pickup)?.instructions || "Please wait for your order confirmation before visiting your selected pickup location."}</p>}</div>:<div className="mt-4 grid gap-3 rounded-xl bg-[#fbfaf7] p-4 sm:grid-cols-2"><label className="text-xs font-semibold text-[#68766b]">State<input required value={state} onChange={e=>setState(e.target.value)} className="mt-1.5 w-full rounded-xl border border-[#dfe4da] bg-white px-3 py-3 text-sm" placeholder="State"/></label><label className="text-xs font-semibold text-[#68766b]">City<input required value={deliveryCity} onChange={e=>setDeliveryCity(e.target.value)} className="mt-1.5 w-full rounded-xl border border-[#dfe4da] bg-white px-3 py-3 text-sm" placeholder="City"/></label><label className="text-xs font-semibold text-[#68766b] sm:col-span-2">Street address<input required value={street} onChange={e=>setStreet(e.target.value)} className="mt-1.5 w-full rounded-xl border border-[#dfe4da] bg-white px-3 py-3 text-sm" placeholder="Street / area"/></label><label className="text-xs font-semibold text-[#68766b] sm:col-span-2">House number / landmark<input value={landmark} onChange={e=>setLandmark(e.target.value)} className="mt-1.5 w-full rounded-xl border border-[#dfe4da] bg-white px-3 py-3 text-sm" placeholder="House number or nearby landmark"/></label><p className="text-xs leading-5 text-[#7b857a] sm:col-span-2">Delivery fee will be confirmed separately. No fee has been added to this subtotal.</p></div>}
        </section>
        <section className="border-t border-[#edf0e9] pt-5"><label className="text-xs font-semibold text-[#68766b]">Order notes (optional)<textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={3} className="mt-1.5 w-full rounded-xl border border-[#dfe4da] px-3 py-3 text-sm text-[#203329] outline-none focus:border-[#245b42]" placeholder="Anything we should know?"/></label></section>
        <button type="button" disabled={!canContinue} className="w-full cursor-not-allowed rounded-full bg-[#245b42] px-5 py-3.5 text-sm font-bold text-white opacity-60">Place order — secure submission being completed</button>
        <p className="text-xs leading-5 text-[#899288]">This checkout form is being prepared. Orders are not submitted or charged yet; secure order processing will be enabled after server-side validation and database permissions are in place.</p>
      </form>
      <aside className="h-fit rounded-2xl border border-[#e8e9e1] bg-white p-5 sm:p-7"><h2 className="font-bold text-[#203329]">Order summary</h2><div className="mt-4 space-y-3">{cart.map(item=><div key={item.variant_id} className="flex justify-between gap-3 text-sm"><div><p className="font-semibold text-[#405044]">{item.name}</p><p className="mt-1 text-xs text-[#899288]">{item.pack_size} × {item.qty}</p></div><span className="font-semibold text-[#405044]">₦{(item.price*item.qty).toLocaleString("en-NG")}</span></div>)}</div><div className="mt-5 border-t border-[#edf0e9] pt-4"><div className="flex justify-between text-sm"><span className="text-[#68766b]">Subtotal</span><strong className="text-[#203329]">₦{subtotal.toLocaleString("en-NG")}</strong></div><div className="mt-2 flex justify-between text-sm"><span className="text-[#68766b]">Delivery fee</span><span className="text-[#899288]">{method==="delivery"?"To be confirmed":"₦0"}</span></div><div className="mt-4 flex justify-between border-t border-[#edf0e9] pt-4"><strong className="text-[#203329]">Total so far</strong><strong className="text-lg text-[#245b42]">₦{subtotal.toLocaleString("en-NG")}</strong></div></div></aside>
    </div>}
  </div></main>;
}
