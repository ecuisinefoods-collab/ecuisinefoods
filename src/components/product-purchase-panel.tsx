"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, ChevronRight, Minus, Plus, ShoppingBag, Tag, X } from "lucide-react";
import { getEffectivePrice, getDiscountPercent } from "@/lib/product-pricing";

type Variant = { id:string; pack_size:string; price:number; sale_price:number|null; sale_starts_at:string|null; sale_ends_at:string|null; stock_quantity:number };
type CartItem = { variant_id:string; product_id:string; name:string; pack_size:string; price:number; original_price?:number; qty:number; stock_quantity?:number; image_url?:string|null };
const KEY="ecuisinefoods-cart-v1";
const money=(value:number)=>"₦"+Number(value||0).toLocaleString("en-NG");

export function ProductPurchasePanel({productId,productName,productImage,variants}:{productId:string;productName:string;productImage:string|null;variants:Variant[]}) {
  const router=useRouter();
  const available=useMemo(()=>variants.filter(variant=>variant.stock_quantity>0),[variants]);
  const [selected,setSelected]=useState(available[0]?.id??"");
  const [qty,setQty]=useState(1);
  const [showOptions,setShowOptions]=useState(false);
  const [askCheckout,setAskCheckout]=useState(false);
  const [storageError,setStorageError]=useState("");
  const current=variants.find(variant=>variant.id===selected);
  const discount=current?getDiscountPercent(current):0;
  const lineTotal=current?getEffectivePrice(current)*qty:0;
  const startingPrice=available.length?Math.min(...available.map(getEffectivePrice)):null;

  useEffect(()=>{
    if(!showOptions)return;
    const previousOverflow=document.body.style.overflow;
    document.body.style.overflow="hidden";
    const closeOnEscape=(event:KeyboardEvent)=>{if(event.key==="Escape")setShowOptions(false);};
    window.addEventListener("keydown",closeOnEscape);
    return ()=>{document.body.style.overflow=previousOverflow;window.removeEventListener("keydown",closeOnEscape);};
  },[showOptions]);

  function openOptions(){
    setSelected(available[0]?.id??"");
    setQty(1);
    setStorageError("");
    setShowOptions(true);
  }

  function saveSelection() {
    if(!current||current.stock_quantity<1)return;
    try {
      let cart:CartItem[]=[];
      try{cart=JSON.parse(localStorage.getItem(KEY)||"[]") as CartItem[];}catch{cart=[];}
      const found=cart.find(item=>item.variant_id===current.id);
      const safeQty=Math.min(Math.max(1,qty),Math.max(0,current.stock_quantity-(found?.qty??0)));
      if(safeQty<1){setStorageError("Your cart already contains all currently available units of this pack size.");return;}
      const next=found
        ?cart.map(item=>item.variant_id===current.id?{...item,qty:item.qty+safeQty,price:getEffectivePrice(current),original_price:Number(current.price),stock_quantity:current.stock_quantity,image_url:productImage}:item)
        :[...cart,{variant_id:current.id,product_id:productId,name:productName,pack_size:current.pack_size,price:getEffectivePrice(current),original_price:Number(current.price),qty:safeQty,stock_quantity:current.stock_quantity,image_url:productImage}];
      localStorage.setItem(KEY,JSON.stringify(next));
      setStorageError("");
      setAskCheckout(true);
      setShowOptions(false);
    } catch {
      setStorageError("We could not save your selection. Please enable browser storage and try again.");
    }
  }

  const remaining=current?Math.max(0,current.stock_quantity-(()=>{try{const cart=JSON.parse(localStorage.getItem(KEY)||"[]") as CartItem[];return cart.find(item=>item.variant_id===current.id)?.qty??0;}catch{return 0;}})()):0;

  return <>
    <section className="ec-purchase-panel mt-7 rounded-[1.5rem] border p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div><p className="text-[10px] font-black uppercase tracking-[.16em] text-[#879286]">Ready to order?</p><p className="mt-1 text-sm font-extrabold text-[#203b2a]">{startingPrice!==null?"From "+money(startingPrice):"Currently unavailable"}</p></div>
        {available.length>0?<span className="inline-flex items-center gap-1 rounded-full bg-[#eaf5e7] px-3 py-1.5 text-[9px] font-black uppercase tracking-wider text-[#47764a]"><Check size={11}/> {available.length} pack option{available.length===1?"":"s"} available</span>:<span className="rounded-full bg-[#fbece5] px-3 py-1.5 text-[9px] font-black uppercase tracking-wider text-[#a34b42]">Currently unavailable</span>}
      </div>
      <button type="button" onClick={openOptions} disabled={!available.length} className="ec-buy-now mt-5 inline-flex min-h-[56px] w-full items-center justify-center gap-2 rounded-xl px-5 py-4 text-sm font-black uppercase tracking-[.09em] text-white transition disabled:cursor-not-allowed disabled:opacity-50">
        <ShoppingBag size={19} strokeWidth={2.5}/> Buy now <ArrowRight size={17}/>
      </button>
      
    </section>

    {showOptions&&<div className="ec-buy-options-backdrop fixed inset-0 z-[110] flex items-end justify-center bg-[#10251a]/60 p-0 backdrop-blur-sm sm:items-center sm:p-5" onMouseDown={event=>{if(event.target===event.currentTarget)setShowOptions(false);}}>
      <section role="dialog" aria-modal="true" aria-labelledby="ec-product-buy-title" className="ec-buy-options-panel w-full max-w-lg rounded-t-[1.8rem] border border-white/80 bg-[#fffefa] p-5 shadow-2xl sm:rounded-[1.8rem] sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div><p className="text-[9px] font-black uppercase tracking-[.18em] text-[#a17c20]">eCuisine · Your selection</p><h2 id="ec-product-buy-title" className="mt-1 text-xl font-black text-[#173e2d]">{productName}</h2><p className="mt-1 text-xs text-[#778477]">Choose your pack size and quantity.</p></div>
          <button type="button" onClick={()=>setShowOptions(false)} aria-label="Close product options" className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[#dfe8dc] bg-white text-[#4c6651]"><X size={17}/></button>
        </div>
        {current&&current.stock_quantity>0?<div className="mt-5">
          <div className="mb-4 flex items-center gap-4 rounded-2xl border border-[#e7ecdf] bg-white p-3">{productImage?<img src={productImage} alt={productName} className="h-24 w-24 rounded-xl bg-[#f4f7ef] object-contain p-2"/>:<div className="grid h-24 w-24 place-items-center rounded-xl bg-[#f4f7ef] text-[#8a9b86]"><ShoppingBag size={26}/></div>}<div className="min-w-0 flex-1"><p className="font-extrabold text-[#203b2a]">{productName}</p><p className="mt-1 text-xs text-[#71816f]">{current.pack_size} · {qty} × {money(getEffectivePrice(current))}</p><p className="mt-1 text-lg font-black tabular-nums text-[#087f5b]">{money(lineTotal)}</p></div></div>
          <button type="button" onClick={()=>saveSelection()} disabled={qty>remaining||remaining<1} className="ec-buy-now inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-black uppercase tracking-wide text-white disabled:cursor-not-allowed disabled:opacity-50"><ShoppingBag size={17}/> Add to Cart <ArrowRight size={16}/></button>
        </div>:<p className="mt-4 rounded-xl bg-[#fff7e7] p-4 text-sm text-[#856c36]">This product is currently unavailable in all pack sizes.</p>}
        <button type="button" onClick={()=>setShowOptions(false)} className="mt-3 w-full rounded-xl px-4 py-3 text-xs font-bold text-[#6e7c70] hover:bg-[#f3f6f1]">Continue browsing</button>
      </section>
    </div>}
    {askCheckout&&<div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#10251a]/65 p-4 backdrop-blur-sm"><section role="dialog" aria-modal="true" aria-labelledby="ec-added-title" className="w-full max-w-sm rounded-[1.6rem] bg-[#fffefa] p-6 text-center shadow-2xl"><span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#eaf5e7] text-[#287548]"><Check size={23}/></span><h2 id="ec-added-title" className="mt-4 text-xl font-black text-[#173e2d]">Added to your cart!</h2><p className="mt-2 text-sm leading-6 text-[#71816f]">Would you like to check out now?</p><div className="mt-5 grid grid-cols-2 gap-3"><button type="button" onClick={()=>setAskCheckout(false)} className="rounded-xl border border-[#dce5d8] px-4 py-3 text-sm font-bold text-[#45634d]">No, keep shopping</button><button type="button" onClick={()=>{setAskCheckout(false);router.push("/checkout");}} className="rounded-xl bg-[#087f5b] px-4 py-3 text-sm font-black text-white">Yes, check out</button></div></section></div>}
  </>;
}
