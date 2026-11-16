"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, MapPin, MessageCircle, PackageCheck, ShoppingBag } from "lucide-react";
import { NIGERIAN_STATES } from "@/lib/nigerian-states";
import { supabase } from "@/lib/supabase";
import { getEffectivePrice } from "@/lib/product-pricing";

type Location = {
  id:string; city:string; location_name:string; instructions:string|null;
  address?:string|null; opening_hours?:string|null; contact_phone?:string|null;
};
type DeliveryZone = {
  id:string; state:string; city:string; area_name:string; delivery_fee:number;
  minimum_order_amount:number; estimated_days:string|null; instructions:string|null;
};
type Item = { variant_id:string; product_id:string; name:string; pack_size:string; price:number; original_price?:number; qty:number; stock_quantity?:number; image_url?:string|null };
type OrderCreated = { order_number:number; tracking_code:string; subtotal:number; delivery_fee:number; discount_amount:number; coupon_code:string|null; total:number; payment_method:string; payment_status:string; payment_reference:string|null };
type PaymentSettings = { bank_name:string; account_name:string; account_number:string; transfer_instructions:string; bank_transfer_enabled:boolean; cash_pickup_enabled:boolean; cash_delivery_enabled:boolean };
const defaultPaymentSettings:PaymentSettings = { bank_name:"", account_name:"", account_number:"", transfer_instructions:"", bank_transfer_enabled:false, cash_pickup_enabled:true, cash_delivery_enabled:true };

const CART_KEY="ecuisinefoods-cart-v1";
const money=(n:number)=>"₦"+Number(n||0).toLocaleString("en-NG");

export function CheckoutForm({ locations, deliveryZones }: { locations: Location[]; deliveryZones: DeliveryZone[] }) {
  const [cart,setCart]=useState<Item[]>([]);
  const [stockChecked,setStockChecked]=useState(false);
  const [stockIssue,setStockIssue]=useState("");
  const [stockNotice,setStockNotice]=useState("");
  const [method,setMethod]=useState<"pickup"|"delivery">("pickup");
  const [paymentMethod,setPaymentMethod]=useState<"bank_transfer"|"cash"|"cash_on_delivery">("cash");
  const [paymentSettings,setPaymentSettings]=useState<PaymentSettings>(defaultPaymentSettings);
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
  const [couponCode,setCouponCode]=useState("");
  const [appliedCoupon,setAppliedCoupon]=useState<{code:string;discount:number}|null>(null);
  const [couponMessage,setCouponMessage]=useState("");
  const [submitting,setSubmitting]=useState(false);
  const [error,setError]=useState("");
  const [order,setOrder]=useState<OrderCreated|null>(null);
  const [submittedItems,setSubmittedItems]=useState<Item[]>([]);
  const [whatsappUrl,setWhatsappUrl]=useState("");

  useEffect(()=>{
    let active=true;
    const load=async()=>{
      let saved:Item[]=[];
      try{saved=JSON.parse(localStorage.getItem(CART_KEY)||"[]");}catch{saved=[];}
      if(!active)return;
      setCart(saved);
      if(!saved.length){setStockChecked(true);return;}
      if(!supabase){setStockIssue("We could not verify product stock. Please contact our team before placing this order.");setStockChecked(true);return;}
      const {data,error}=await supabase.from("product_variants").select("id,pack_size,price,sale_price,sale_starts_at,sale_ends_at,stock_quantity").in("id",saved.map(item=>item.variant_id));
      if(!active)return;
      if(error){setStockIssue("We could not verify the latest stock. Please refresh this page and try again.");setStockChecked(true);return;}
      const rows=new Map((data??[]).map((variant:any)=>[variant.id,variant]));
      const {data:productRows}=await supabase.from("products").select("id,image_url").in("id",saved.map(item=>item.product_id));
      if(!active)return;
      const imageMap=new Map((productRows??[]).map((product:any)=>[product.id,product.image_url]));
      let adjusted=false;
      const refreshed=saved.map(item=>{
        const variant=rows.get(item.variant_id) as {id:string;pack_size:string;price:number;sale_price:number|null;sale_starts_at:string|null;sale_ends_at:string|null;stock_quantity:number}|undefined;
        const image=imageMap.get(item.product_id) as string|null|undefined;
        if(!variant)return {...item,image_url:image??item.image_url??null,stock_quantity:0};
        const available=Math.max(0,Number(variant.stock_quantity)||0);
        const qty=available>0?Math.min(item.qty,available):item.qty;
        if(qty!==item.qty)adjusted=true;
        return {...item,image_url:image??item.image_url??null,pack_size:variant.pack_size,price:getEffectivePrice(variant),original_price:Number(variant.price),stock_quantity:available,qty};
      });
      setCart(refreshed);
      localStorage.setItem(CART_KEY,JSON.stringify(refreshed));
      if(adjusted)setStockNotice("Your cart quantity was adjusted to match the latest available stock.");
      if(refreshed.some(item=>!item.stock_quantity))setStockIssue("One or more cart items are out of stock. Return to your cart and remove them before checkout.");
      setStockChecked(true);
    };
    void load();
    return ()=>{active=false;};
  },[]);

  useEffect(()=>{
    let active=true;
    const loadPaymentSettings=async()=>{
      if(!supabase)return;
      const settingKeys=["payment_bank_name","payment_account_name","payment_account_number","payment_transfer_instructions","payment_bank_transfer_enabled","payment_cash_pickup_enabled","payment_cash_delivery_enabled"];
      const {data}=await supabase.from("site_settings").select("setting_key,setting_value").in("setting_key",settingKeys);
      if(!active||!data)return;
      const values=Object.fromEntries(data.map((row:any)=>[row.setting_key,row.setting_value]));
      setPaymentSettings({
        bank_name:values.payment_bank_name??"",
        account_name:values.payment_account_name??"",
        account_number:values.payment_account_number??"",
        transfer_instructions:values.payment_transfer_instructions??"",
        bank_transfer_enabled:values.payment_bank_transfer_enabled==="true",
        cash_pickup_enabled:values.payment_cash_pickup_enabled!=="false",
        cash_delivery_enabled:values.payment_cash_delivery_enabled!=="false",
      });
    };
    void loadPaymentSettings();
    return ()=>{active=false;};
  },[]);

  const subtotal=useMemo(()=>cart.reduce((sum,item)=>sum+Number(item.price)*item.qty,0),[cart]);
  const cityLocations=locations.filter(x=>x.city===city&&x.id);
  const availableZones=deliveryZones.filter(z=>z.state===state);
  const selectedZone=availableZones.find(z=>z.id===deliveryZoneId);
  const deliveryFee=selectedZone?Number(selectedZone.delivery_fee):0;
  const minOrder=Number(selectedZone?.minimum_order_amount||0);
  const minimumMet=method!=="delivery"||!selectedZone||subtotal>=minOrder;
  const bankTransferReady=paymentSettings.bank_transfer_enabled&&Boolean(paymentSettings.bank_name.trim()&&paymentSettings.account_name.trim()&&/^[0-9]{10}$/.test(paymentSettings.account_number.trim()));
  const cashPaymentReady=method==="pickup"?paymentSettings.cash_pickup_enabled:paymentSettings.cash_delivery_enabled;
  const selectedPaymentReady=paymentMethod==="bank_transfer"?bankTransferReady:cashPaymentReady;
  const missingMinimum=Math.max(0,minOrder-subtotal);
  const stockUnavailable=cart.some(item=>!Number(item.stock_quantity)||Number(item.stock_quantity)<item.qty);
  const canContinue=Boolean(stockChecked&&!stockIssue&&!stockUnavailable&&cart.length>0&&name.trim().length>=2&&phone.trim()&&(method==="pickup"?!!pickup:!!state&&!!deliveryZoneId&&!!street.trim()&&minimumMet)&&selectedPaymentReady);

  async function submitOrder(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    if(!supabase){setError("Checkout is temporarily unavailable. Please contact our team on WhatsApp.");return;}
    if(!stockChecked||stockIssue||stockUnavailable){setError(stockIssue||"The cart quantity is above the latest available stock. Please return to your cart and review it.");return;}
    if(!canContinue){setError("Please complete the required checkout details and check the minimum order for this delivery area.");return;}
    let whatsappTab: Window | null = null;
    try { whatsappTab = window.open("about:blank", "_blank"); } catch { whatsappTab = null; }
    setSubmitting(true);setError("");
    const itemsToSave=cart;
    const payload={
      customer_name:name.trim(),phone:phone.trim(),email:email.trim()||null,
      fulfillment_method:method,payment_method:paymentMethod,pickup_location_id:method==="pickup"?pickup:null,
      delivery_zone_id:method==="delivery"?deliveryZoneId:null,
      street_address:method==="delivery"?street.trim():null,
      house_number_landmark:method==="delivery"?landmark.trim():null,
      order_notes:notes.trim()||null,
      coupon_code:couponCode.trim()||null,
      items:itemsToSave.map(item=>({variant_id:item.variant_id,quantity:item.qty}))
    };
    const {data,error:rpcError}=await supabase.rpc("create_order_request",{p_order:payload});
    if(rpcError){whatsappTab?.close();setError(/available in the requested quantity|no longer available/i.test(rpcError.message)?"Stock changed while you were checking out. Please return to your cart and review the latest available quantity.":rpcError.message);setSubmitting(false);return;}
    const created=data as OrderCreated;
    if(!created?.order_number||!created?.tracking_code){whatsappTab?.close();setError("Your order could not be confirmed as saved. Please retry or contact support.");setSubmitting(false);return;}

    const trackingUrl=window.location.origin+"/track?code="+encodeURIComponent(created.tracking_code);
    const selected=locations.find(l=>l.id===pickup);
    const lines=[
      "Hello eCuisine, I would like to complete my checkout on WhatsApp.",
      "",
      "Order number: #"+created.order_number,
      ...itemsToSave.map(item=>"• "+item.name+" — "+item.pack_size+" × "+item.qty+" = "+money(item.price*item.qty)),
      "",
      "Subtotal: "+money(Number(created.subtotal)),
      "Delivery: "+money(Number(created.delivery_fee)),
      "Total: "+money(Number(created.total)),
      "Payment method: "+(created.payment_method==="bank_transfer"?"Bank transfer":created.payment_method==="cash"?"Cash on pickup":created.payment_method==="cash_on_delivery"?"Cash on delivery":"WhatsApp checkout"),
      created.payment_reference?"Payment reference: "+created.payment_reference:"",
      created.payment_method==="bank_transfer"?"Payment status: Pending verification. Please do not treat this transfer as confirmed until eCuisine confirms receipt.":"Payment status: Unpaid — pay when your order is collected or delivered.",
      created.payment_method==="bank_transfer"?"Bank: "+paymentSettings.bank_name:"",
      created.payment_method==="bank_transfer"?"Account name: "+paymentSettings.account_name:"",
      created.payment_method==="bank_transfer"?"Account number: "+paymentSettings.account_number:"",
      created.payment_method==="bank_transfer"?paymentSettings.transfer_instructions:"",
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
        <p className="mt-4 max-w-2xl text-sm leading-6 text-[#68766b]">{order.payment_method==="bank_transfer"?"Your order is saved. Bank transfer is awaiting manual verification by our team; it has not been marked as paid. WhatsApp should open with the order and payment reference so you can send confirmation.":"Your order is saved as unpaid. Please pay when you collect the order or when delivery arrives. WhatsApp should open with your order details for confirmation."} If WhatsApp does not open automatically, use the button below.</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl bg-white/80 p-4"><p className="text-[10px] font-bold uppercase text-[#879286]">Order subtotal</p><p className="mt-1 text-lg font-bold">{money(order.subtotal)}</p></div><div className="rounded-2xl bg-white/80 p-4"><p className="text-[10px] font-bold uppercase text-[#879286]">Delivery fee</p><p className="mt-1 text-lg font-bold">{money(order.delivery_fee)}</p></div><div className="rounded-2xl bg-[#edf5ea] p-4"><p className="text-[10px] font-bold uppercase text-[#55725a]">Total so far</p><p className="mt-1 text-lg font-bold text-[#245b42]">{money(order.total)}</p></div></div>
        <h3 className="mt-6 font-bold text-[#203329]">Items submitted</h3><div className="mt-2 space-y-2">{submittedItems.map(item=><div key={item.variant_id} className="flex items-center justify-between gap-3 rounded-xl bg-white/70 p-3 text-sm"><div className="flex min-w-0 items-center gap-3"><span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-[#f4f6ed] p-1">{item.image_url?<img src={item.image_url} alt={item.name} className="h-full w-full object-contain"/>:<ShoppingBag size={20}/>}</span><span className="min-w-0"><b className="block">{item.name}</b><small className="text-[#899288]">{item.pack_size} × {item.qty}</small></span></div><b>{money(item.price*item.qty)}</b></div>)}</div>
        {order.payment_method==="bank_transfer"&&<div className="mt-5 rounded-2xl border border-[#dce8d6] bg-[#f2f8ef] p-4"><p className="text-[10px] font-black uppercase tracking-[.15em] text-[#5b785c]">Bank transfer details · Awaiting verification</p><p className="mt-3 text-sm font-bold text-[#244b34]">{paymentSettings.bank_name}</p><p className="mt-1 text-xs text-[#677867]">Account name: <b>{paymentSettings.account_name}</b></p><p className="mt-1 text-xs text-[#677867]">Account number: <b className="font-mono text-sm">{paymentSettings.account_number}</b></p><p className="mt-3 text-xs text-[#677867]">Transfer reference: <b className="font-mono text-[#244b34]">{order.payment_reference}</b></p>{paymentSettings.transfer_instructions&&<p className="mt-2 text-xs leading-5 text-[#677867]">{paymentSettings.transfer_instructions}</p>}<p className="mt-3 text-[11px] font-semibold text-[#8a6122]">Your order remains pending until eCuisine verifies the payment.</p></div>}
        {order.payment_method!=="bank_transfer"&&<div className="mt-5 rounded-2xl bg-[#f6f6ee] p-4 text-xs leading-5 text-[#68766b]">Payment due: {order.payment_method==="cash"?"Cash on pickup":"Cash on delivery"}. No online payment has been taken.</div>}
        <div className="mt-7 flex flex-col gap-3 sm:flex-row"><a href={whatsappUrl} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-full bg-[#1f9d55] px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#1f9d55]/20"><MessageCircle size={16}/> Open WhatsApp to complete checkout</a><Link href={"/track?code="+encodeURIComponent(order.tracking_code)} className="inline-flex items-center justify-center gap-2 rounded-full border border-[#cbd8c8] bg-white/75 px-6 py-3.5 text-sm font-bold text-[#245b42]"><PackageCheck size={16}/> Track this order</Link></div>
        <div className="mt-5 rounded-xl bg-[#f5f4eb] p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-[#8b8b72]">Private tracking code</p><p className="mt-1 break-all font-mono text-sm font-semibold text-[#344b38]">{order.tracking_code}</p><p className="mt-1 text-xs text-[#829080]">Keep this code safe. It is required to view your order progress.</p></div>
      </section>:!cart.length?<div className="mt-6 rounded-2xl border border-[#e8e9e1] bg-white/75 p-8 text-center shadow-xl backdrop-blur-xl"><ShoppingBag className="mx-auto text-[#8a9689]"/><p className="mt-3 font-semibold text-[#526052]">Your cart is empty</p><Link href="/shop" className="mt-4 inline-block rounded-full bg-[#245b42] px-5 py-3 text-sm font-bold text-white">Browse products</Link></div>:<div className="mt-6 grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
        <form className="space-y-5 rounded-3xl border border-white/70 bg-white/70 p-5 shadow-xl shadow-[#506f56]/10 backdrop-blur-2xl sm:p-7" onSubmit={submitOrder}>
          <section className="rounded-2xl border border-[#b9d8c0] bg-[#eff8f0]/90 p-4 shadow-inner shadow-white">
            <div className="flex items-center gap-2"><MessageCircle size={17} className="text-[#16834a]"/><h2 className="font-bold text-[#203329]">Order confirmation</h2></div>
            <p className="mt-2 text-xs leading-5 text-[#617265]">Submit your order details here. We save your order first, then open WhatsApp with the order number and fulfilment details so our team can confirm it with you.</p>
          </section>
          <section><h2 className="font-bold text-[#203329]">Customer information</h2><div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-semibold text-[#68766b]">Full name<input required minLength={2} value={name} onChange={e=>setName(e.target.value)} className="mt-1.5 w-full rounded-xl border border-[#dfe4da] bg-white/85 px-3 py-3 text-sm text-[#203329] outline-none focus:border-[#245b42]" placeholder="Your name"/></label>
            <label className="text-xs font-semibold text-[#68766b]">Phone number<input required type="tel" value={phone} onChange={e=>setPhone(e.target.value)} className="mt-1.5 w-full rounded-xl border border-[#dfe4da] bg-white/85 px-3 py-3 text-sm text-[#203329] outline-none focus:border-[#245b42]" placeholder="080…"/></label>
            <label className="text-xs font-semibold text-[#68766b] sm:col-span-2">Email (optional)<input type="email" value={email} onChange={e=>setEmail(e.target.value)} className="mt-1.5 w-full rounded-xl border border-[#dfe4da] bg-white/85 px-3 py-3 text-sm text-[#203329] outline-none focus:border-[#245b42]" placeholder="you@example.com"/></label>
          </div></section>
          <section className="border-t border-[#edf0e9] pt-5"><h2 className="font-bold text-[#203329]">How would you like to receive your order?</h2><div className="mt-3 grid grid-cols-2 gap-2"><button type="button" onClick={()=>{setMethod("pickup");if(paymentMethod!=="bank_transfer")setPaymentMethod("cash");}} className={`rounded-xl border px-4 py-3 text-sm font-bold ${method==="pickup"?"border-[#245b42] bg-[#edf3e9] text-[#245b42]":"border-[#dfe4da] bg-white/70 text-[#68766b]"}`}>Pickup</button><button type="button" disabled={!deliveryZones.length} onClick={()=>{setMethod("delivery");if(paymentMethod!=="bank_transfer")setPaymentMethod("cash_on_delivery");}} className={`rounded-xl border px-4 py-3 text-sm font-bold ${method==="delivery"?"border-[#245b42] bg-[#edf3e9] text-[#245b42]":"border-[#dfe4da] bg-white/70 text-[#68766b]"} disabled:cursor-not-allowed disabled:opacity-50`}>Home delivery{!deliveryZones.length?" · Not set up":""}</button></div>
            {!deliveryZones.length&&<p className="mt-3 rounded-xl bg-[#fff7e8] p-4 text-xs leading-5 text-[#795b21]">Home delivery cannot be selected yet because no delivery areas or fees have been configured. Please choose one of the active pickup points for this order.</p>}{method==="pickup"?<div className="mt-4 rounded-xl bg-[#fbfaf7]/80 p-4"><label className="text-xs font-semibold text-[#68766b]">Pickup city<select value={city} onChange={e=>{setCity(e.target.value);setPickup("");}} className="mt-1.5 w-full rounded-xl border border-[#dfe4da] bg-white px-3 py-3 text-sm text-[#203329]">{Array.from(new Set(locations.map(l=>l.city))).map(value=><option key={value}>{value}</option>)}</select></label><label className="mt-3 block text-xs font-semibold text-[#68766b]">Pickup location<select required value={pickup} onChange={e=>setPickup(e.target.value)} className="mt-1.5 w-full rounded-xl border border-[#dfe4da] bg-white px-3 py-3 text-sm text-[#203329]"><option value="">Select a location</option>{cityLocations.map(l=><option key={l.id} value={l.id}>{l.location_name}</option>)}</select></label>{pickup&&(()=>{const selected=cityLocations.find(l=>l.id===pickup);return selected?<div className="mt-3 rounded-xl bg-white/75 p-3 text-xs leading-5 text-[#68766b]"><p className="flex gap-2"><MapPin size={14} className="mt-0.5 shrink-0"/>{selected.address||selected.instructions||"Please wait for our order confirmation before visiting."}</p>{selected.opening_hours&&<p className="mt-2">Hours: {selected.opening_hours}</p>}{selected.contact_phone&&<p className="mt-1">Location contact: {selected.contact_phone}</p>}</div>:null;})()}</div>:<div className="mt-4 grid gap-3 rounded-xl bg-[#fbfaf7]/80 p-4 sm:grid-cols-2"><label className="text-xs font-semibold text-[#68766b]">State<select required value={state} onChange={e=>{setState(e.target.value);setDeliveryZoneId("");}} className="mt-1.5 w-full rounded-xl border border-[#dfe4da] bg-white px-3 py-3 text-sm"><option value="">Select state</option>{NIGERIAN_STATES.map(s=><option key={s} value={s}>{s}</option>)}</select></label><label className="text-xs font-semibold text-[#68766b]">Delivery area<select required value={deliveryZoneId} onChange={e=>setDeliveryZoneId(e.target.value)} disabled={!state||!availableZones.length} className="mt-1.5 w-full rounded-xl border border-[#dfe4da] bg-white px-3 py-3 text-sm"><option value="">{!state?"Choose a state first":availableZones.length?"Choose a configured delivery area":"Delivery is not yet available in this state"}</option>{availableZones.map(z=><option key={z.id} value={z.id}>{z.city} — {z.area_name} ({money(Number(z.delivery_fee))})</option>)}</select></label><label className="text-xs font-semibold text-[#68766b] sm:col-span-2">Street address<input required value={street} onChange={e=>setStreet(e.target.value)} className="mt-1.5 w-full rounded-xl border border-[#dfe4da] bg-white px-3 py-3 text-sm" placeholder="Street / area"/></label><label className="text-xs font-semibold text-[#68766b] sm:col-span-2">House number / landmark<input value={landmark} onChange={e=>setLandmark(e.target.value)} className="mt-1.5 w-full rounded-xl border border-[#dfe4da] bg-white px-3 py-3 text-sm" placeholder="House number or nearby landmark"/></label>{selectedZone&&<div className="rounded-xl bg-white/75 p-3 text-xs leading-5 text-[#68766b] sm:col-span-2"><p>Delivery fee: <b>{money(deliveryFee)}</b>{selectedZone.estimated_days?" · Estimated: "+selectedZone.estimated_days:""}</p>{selectedZone.instructions&&<p className="mt-1">{selectedZone.instructions}</p>}{minOrder>0&&<p className={minimumMet?"mt-1 text-green-700":"mt-1 font-bold text-red-700"}>Minimum order: {money(minOrder)}{minimumMet?" — minimum met":" — add "+money(missingMinimum)+" more to continue"}</p>}</div>}</div>}
          </section>
          <section className="border-t border-[#edf0e9] pt-5"><h2 className="font-bold text-[#203329]">How would you like to pay?</h2><div className="mt-3 grid gap-3 sm:grid-cols-2">
            {method==="pickup"&&<button type="button" disabled={!paymentSettings.cash_pickup_enabled} onClick={()=>setPaymentMethod("cash")} className={`rounded-xl border p-4 text-left ${paymentMethod==="cash"?"border-[#245b42] bg-[#edf5ea]":"border-[#dfe4da] bg-white/80"} disabled:cursor-not-allowed disabled:opacity-40`}><b className="block text-sm text-[#315b43]">Cash on pickup</b><span className="mt-1 block text-xs text-[#788678]">Pay when you collect your order.</span></button>}
            {method==="delivery"&&<button type="button" disabled={!paymentSettings.cash_delivery_enabled} onClick={()=>setPaymentMethod("cash_on_delivery")} className={`rounded-xl border p-4 text-left ${paymentMethod==="cash_on_delivery"?"border-[#245b42] bg-[#edf5ea]":"border-[#dfe4da] bg-white/80"} disabled:cursor-not-allowed disabled:opacity-40`}><b className="block text-sm text-[#315b43]">Cash on delivery</b><span className="mt-1 block text-xs text-[#788678]">Pay when your order arrives.</span></button>}
            <button type="button" disabled={!bankTransferReady} onClick={()=>setPaymentMethod("bank_transfer")} className={`rounded-xl border p-4 text-left ${paymentMethod==="bank_transfer"?"border-[#245b42] bg-[#edf5ea]":"border-[#dfe4da] bg-white/80"} disabled:cursor-not-allowed disabled:opacity-45`}><b className="block text-sm text-[#315b43]">Bank transfer</b><span className="mt-1 block text-xs text-[#788678]">{bankTransferReady?"Account details and a unique reference are shown after the order is saved.":"Not available yet. The store owner must add bank details in Admin → Payment settings."}</span></button>
          </div>{!selectedPaymentReady&&<p className="mt-3 text-xs font-semibold text-[#a15b32]">No payment method is enabled for this fulfilment option. Please contact the store team.</p>}</section>
          <section className="border-t border-[#edf0e9] pt-5"><label className="text-xs font-semibold text-[#68766b]">Order notes (optional)<textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={3} className="mt-1.5 w-full rounded-xl border border-[#dfe4da] bg-white/85 px-3 py-3 text-sm text-[#203329] outline-none focus:border-[#245b42]" placeholder="Anything we should know?"/></label></section>
          {stockNotice&&<p role="status" className="rounded-xl bg-[#fff7e8] p-3 text-sm text-[#795b21]">{stockNotice}</p>}
          {stockIssue&&<p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{stockIssue}</p>}
          {error&&<p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <button type="submit" disabled={!canContinue||submitting} className="w-full rounded-full bg-[#245b42] px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#245b42]/20 transition hover:bg-[#173e2d] disabled:cursor-not-allowed disabled:opacity-40">{submitting?"Saving your order…":"Place order & continue to WhatsApp"}</button>
          <p className="text-xs leading-5 text-[#899288]">Your order is saved with the payment option you selected. Bank transfers remain pending until the team verifies receipt; cash orders remain unpaid until collection or delivery. Product prices, stock and delivery fees are checked again when the order is saved.</p>
        </form>
        <aside className="h-fit rounded-3xl border border-white/70 bg-white/70 p-5 shadow-xl shadow-[#506f56]/10 backdrop-blur-2xl sm:p-7"><h2 className="font-bold text-[#203329]">Order summary</h2><div className="mt-4 space-y-3">{cart.map(item=><div key={item.variant_id} className="flex items-center justify-between gap-3 text-sm"><div className="flex min-w-0 items-center gap-3"><span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-[#f4f6ed] p-1">{item.image_url?<img src={item.image_url} alt={item.name} className="h-full w-full object-contain"/>:<ShoppingBag size={20}/>}</span><span className="min-w-0"><b className="block text-[#405044]">{item.name}</b><small className="mt-1 block text-xs text-[#899288]">{item.pack_size} × {item.qty}</small></span></div><span className="shrink-0 font-semibold text-[#405044]">{money(item.price*item.qty)}</span></div>)}</div><div className="mt-5 border-t border-[#edf0e9] pt-4"><div className="flex justify-between text-sm"><span className="text-[#68766b]">Estimated subtotal</span><strong className="text-[#203329]">{money(subtotal)}</strong></div><div className="mt-2 flex justify-between text-sm"><span className="text-[#68766b]">Coupon discount</span><span className="text-[#16834a]">{money(appliedCoupon?.discount||0)}</span></div><div className="mt-2 flex justify-between text-sm"><span className="text-[#68766b]">Delivery fee</span><span className="text-[#899288]">{method==="delivery"&&selectedZone?money(deliveryFee):money(0)}</span></div><div className="mt-4 flex justify-between border-t border-[#edf0e9] pt-4"><strong className="text-[#203329]">Estimated total</strong><strong className="text-lg text-[#245b42]">{money(Math.max(0,subtotal+(method==="delivery"?deliveryFee:0)-(appliedCoupon?.discount||0)))}</strong></div><p className="mt-3 text-[10px] leading-5 text-[#929b90]">Final totals are revalidated against the database when you submit your order.</p></div></aside>
      </div>}
    </div>
  </main>;
}
