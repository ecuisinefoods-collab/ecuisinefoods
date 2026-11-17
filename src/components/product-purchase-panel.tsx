"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, ChevronRight, Minus, Plus, ShoppingBag, Tag, Zap } from "lucide-react";
import { getEffectivePrice, getDiscountPercent } from "@/lib/product-pricing";

type Variant = { id:string; pack_size:string; price:number; sale_price:number|null; sale_starts_at:string|null; sale_ends_at:string|null; stock_quantity:number };
type CartItem = { variant_id:string; product_id:string; name:string; pack_size:string; price:number; original_price?:number; qty:number; stock_quantity?:number };
const KEY="ecuisinefoods-cart-v1";
const money=(value:number)=>"₦"+Number(value||0).toLocaleString("en-NG");

export function ProductPurchasePanel({productId,productName,variants}:{productId:string;productName:string;variants:Variant[]}) {
  const router=useRouter();
  const available=useMemo(()=>variants.filter(variant=>variant.stock_quantity>0),[variants]);
  const [selected,setSelected]=useState(available[0]?.id??"");
  const [qty,setQty]=useState(1);
  const [notice,setNotice]=useState(false);
  const [storageError,setStorageError]=useState("");
  const current=variants.find(variant=>variant.id===selected);
  const discount=current?getDiscountPercent(current):0;
  const lineTotal=current?getEffectivePrice(current)*qty:0;

  function saveSelection(goToCheckout:boolean) {
    if(!current||current.stock_quantity<1)return;
    try {
      let cart:CartItem[]=[];
      try{cart=JSON.parse(localStorage.getItem(KEY)||"[]") as CartItem[];}catch{cart=[];}
      const found=cart.find(item=>item.variant_id===current.id);
      const safeQty=Math.min(Math.max(1,qty),current.stock_quantity);
      const next=found
        ?cart.map(item=>item.variant_id===current.id?{...item,qty:Math.min(item.qty+safeQty,current.stock_quantity),price:getEffectivePrice(current),original_price:Number(current.price),stock_quantity:current.stock_quantity}:item)
        :[...cart,{variant_id:current.id,product_id:productId,name:productName,pack_size:current.pack_size,price:getEffectivePrice(current),original_price:Number(current.price),qty:safeQty,stock_quantity:current.stock_quantity}];
      localStorage.setItem(KEY,JSON.stringify(next));
      setStorageError("");
      if(goToCheckout){
        router.push("/checkout");
        return;
      }
      setNotice(true);
    } catch {
      setStorageError("We could not save your selection. Please enable browser storage and try again.");
      setNotice(false);
    }
  }

  return <section className="ec-purchase-panel mt-7 rounded-[1.5rem] border p-4 sm:p-5">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 className="text-sm font-black text-[#203b2a]">Choose your pack size</h2>
      {available.length>0?<span className="inline-flex items-center gap-1 rounded-full bg-[#eaf5e7] px-3 py-1.5 text-[9px] font-black uppercase tracking-wider text-[#47764a]"><Check size={11}/> {available.length} option{available.length===1?"":"s"} available</span>:<span className="rounded-full bg-[#fbece5] px-3 py-1.5 text-[9px] font-black uppercase tracking-wider text-[#a34b42]">Currently unavailable</span>}
    </div>

    {current&&current.stock_quantity>0&&<div className="mt-4 flex flex-wrap items-end justify-between gap-2 border-b border-[#e6ece2] pb-4">
      <div><p className="text-[9px] font-black uppercase tracking-[.16em] text-[#879286]">Selected price · {current.pack_size}</p><p className="mt-1 text-3xl font-black tracking-tight text-[#d47b1e] sm:text-4xl">{money(getEffectivePrice(current))}</p></div>
      {discount>0&&<div className="pb-1 text-right"><p className="text-xs text-[#92998e] line-through">{money(Number(current.price))}</p><span className="mt-1 inline-flex items-center gap-1 rounded-full bg-[#fff0e6] px-2.5 py-1 text-[9px] font-black text-[#a64e30]"><Tag size={10}/>{discount}% OFF</span></div>}
    </div>}

    {variants.length>0?(
      <div className="mt-4 grid gap-2">
        {variants.map(variant=>{
          const isSelected=selected===variant.id;
          const off=getDiscountPercent(variant);
          const canBuy=variant.stock_quantity>0;
          return <button type="button" key={variant.id} disabled={!canBuy} aria-pressed={isSelected} onClick={()=>{setSelected(variant.id);setQty(1);setNotice(false);setStorageError("");}} className={"ec-pack-choice flex items-center justify-between gap-4 rounded-xl border p-3.5 text-left transition "+(isSelected?"is-selected":"")+(canBuy?"":" is-sold-out")}>
            <span className="min-w-0"><span className="block text-sm font-extrabold text-[#304936]">{variant.pack_size}</span><span className="mt-1 block text-[10px] font-semibold text-[#829083]">{canBuy?variant.stock_quantity+" available":"Out of stock"}</span></span>
            <span className="shrink-0 text-right"><span className="block text-base font-black text-[#087f5b]">{money(getEffectivePrice(variant))}</span>{off>0&&<><span className="mt-0.5 block text-[10px] text-[#92998e] line-through">{money(Number(variant.price))}</span><span className="mt-1 inline-flex items-center gap-1 rounded-full bg-[#fff0e6] px-2 py-1 text-[9px] font-black text-[#a64e30]"><Tag size={10}/>{off}% OFF</span></>}</span>
          </button>;
        })}
      </div>
    ):<div className="mt-3 rounded-xl border border-dashed border-[#d8e1d5] bg-white p-4 text-sm leading-6 text-[#788577]">Pack sizes and prices are being added. Please contact our team for availability.</div>}

    {current&&current.stock_quantity>0&&<div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#e6ece2] pt-4">
      <label className="text-xs font-bold text-[#526352]">Quantity
        <span className="ml-2 inline-flex items-center gap-1 rounded-xl border border-[#dce5d8] bg-white px-2 py-1"><button type="button" onClick={()=>setQty(Math.max(1,qty-1))} disabled={qty<=1} aria-label="Decrease quantity" className="grid h-7 w-7 place-items-center rounded-lg text-[#58705b] disabled:opacity-30"><Minus size={13}/></button><select value={qty} onChange={event=>setQty(Math.min(Number(event.target.value),current.stock_quantity))} aria-label="Quantity" className="bg-transparent px-1 text-sm font-bold outline-none">{Array.from({length:Math.min(current.stock_quantity,20)},(_,index)=>index+1).map(number=><option key={number} value={number}>{number}</option>)}</select><button type="button" onClick={()=>setQty(Math.min(current.stock_quantity,qty+1))} disabled={qty>=current.stock_quantity} aria-label="Increase quantity" className="grid h-7 w-7 place-items-center rounded-lg text-[#58705b] disabled:opacity-30"><Plus size={13}/></button></span>
      </label>
      <div className="text-right"><p className="text-[9px] font-bold uppercase tracking-wider text-[#8a9689]">Your selection</p><p className="mt-1 text-lg font-black text-[#244b34]">{money(lineTotal)}</p></div>
    </div>}

    <div className="ec-purchase-actions mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
      <button type="button" onClick={()=>saveSelection(false)} disabled={!current||current.stock_quantity<1} className="ec-purchase-add inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#9bcaa2] bg-[#e7f5e4] px-4 py-3.5 text-sm font-extrabold text-[#167344] shadow-sm transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"><ShoppingBag size={17}/> Add to cart</button>
      <button type="button" onClick={()=>saveSelection(true)} disabled={!current||current.stock_quantity<1} className="ec-buy-now inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-extrabold text-white shadow-lg transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"><Zap size={16} fill="currentColor"/> Buy Now <ArrowRight size={16}/></button>
    </div>
    {notice&&<div role="status" className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#dcebd8] bg-[#f1f8ed] px-3.5 py-3"><span className="inline-flex items-center gap-2 text-xs font-bold text-[#357044]"><Check size={14}/> Added to your cart</span><Link href="/cart" className="inline-flex items-center gap-1 text-xs font-black text-[#245b42]">View cart <ChevronRight size={13}/></Link></div>}
    {storageError&&<p role="alert" className="mt-3 rounded-xl bg-red-50 px-3.5 py-3 text-xs font-semibold text-red-700">{storageError}</p>}
    <p className="mt-3 text-center text-[10px] leading-5 text-[#899488]">Your cart and checkout will check the latest stock before an order is submitted.</p>
  </section>;
}
