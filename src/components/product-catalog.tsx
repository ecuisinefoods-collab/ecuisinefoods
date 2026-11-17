"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, PackageCheck, Plus, Search, ShoppingBag, SlidersHorizontal, Sparkles, Tag, Trash2, Minus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getEffectivePrice, getDiscountPercent } from "@/lib/product-pricing";

type Variant = { id: string; pack_size: string; price: number; sale_price: number | null; sale_starts_at: string | null; sale_ends_at: string | null; stock_quantity: number };
type Product = { id: string; name: string; slug: string; category: string; short_description?: string | null; description: string | null; ingredients?: string | null; highlights?: string[] | null; image_url: string | null; is_featured?: boolean; created_at?: string; product_variants?: Variant[] };
type CartItem = { variant_id: string; product_id: string; name: string; pack_size: string; price: number; original_price?: number; qty: number; stock_quantity?: number; image_url?: string | null };
const KEY = "ecuisinefoods-cart-v1";
function readCart(): CartItem[] { try { return JSON.parse(localStorage.getItem(KEY) || "[]") as CartItem[]; } catch { return []; } }
const money = (n:number) => "₦" + Number(n || 0).toLocaleString("en-NG");

export function ProductCatalog({ products, initialCategory = "All products", initialSearch = "" }: { products: Product[]; initialCategory?: string; initialSearch?: string }) {
  const [cart,setCart]=useState<CartItem[]>([]);
  const [filter,setFilter]=useState(initialCategory);
  const [availability,setAvailability]=useState<"all"|"in-stock"|"on-sale">("all");
  const [search,setSearch]=useState(initialSearch);
  const [sort,setSort]=useState("featured");
  const [notice,setNotice]=useState("");
  const [buyingProduct,setBuyingProduct]=useState<Product|null>(null);
  const [selectedVariantId,setSelectedVariantId]=useState("");
  const [buyQuantity,setBuyQuantity]=useState(1);
  useEffect(()=>{setCart(readCart());},[]);
  useEffect(()=>{
    if(!buyingProduct)return;
    const closeOnEscape=(event:KeyboardEvent)=>{if(event.key==="Escape")setBuyingProduct(null);};
    window.addEventListener("keydown",closeOnEscape);
    return ()=>window.removeEventListener("keydown",closeOnEscape);
  },[buyingProduct]);

  function save(next:CartItem[]) {
    setCart(next);
    try { localStorage.setItem(KEY,JSON.stringify(next)); } catch {}
  }
  function add(product:Product,variant:Variant,quantity:number) {
    const found=cart.find(item=>item.variant_id===variant.id);
    const alreadyInCart=found?.qty??0;
    const quantityToAdd=Math.min(Math.max(0,Math.floor(quantity)),Math.max(0,variant.stock_quantity-alreadyInCart));
    if(quantityToAdd<=0){setNotice("You already have all available "+variant.pack_size+" units in your cart.");return;}
    save(found
      ? cart.map(item=>item.variant_id===variant.id
        ? {...item,qty:item.qty+quantityToAdd,price:getEffectivePrice(variant),original_price:Number(variant.price),stock_quantity:variant.stock_quantity}
        : item)
      : [...cart,{variant_id:variant.id,product_id:product.id,name:product.name,pack_size:variant.pack_size,price:getEffectivePrice(variant),original_price:Number(variant.price),qty:quantityToAdd,stock_quantity:variant.stock_quantity,image_url:product.image_url}]
    );
    setNotice(product.name+" · "+variant.pack_size+" × "+quantityToAdd+" added to your cart");
    window.setTimeout(()=>setNotice(""),3200);
  }
  function openBuyOptions(product:Product) {
    const variants=product.product_variants??[];
    const firstAvailable=variants.find(variant=>variant.stock_quantity>0)??variants[0];
    setBuyingProduct(product);
    setSelectedVariantId(firstAvailable?.id??"");
    setBuyQuantity(1);
  }

  const categories=["All products",...Array.from(new Set(products.map(product=>product.category).filter(Boolean)))];
  const safeFilter=categories.includes(filter)?filter:"All products";
  const shown=useMemo(()=>{
    const q=search.trim().toLowerCase();
    const list=products.filter(product=>{
      const variants=product.product_variants??[];
      const categoryMatch=filter==="All products"||product.category===filter;
      const availabilityMatch=availability==="all"||(availability==="in-stock"?variants.some(v=>v.stock_quantity>0):variants.some(v=>getDiscountPercent(v)>0));
      const searchable=[product.name,product.category,product.short_description||"",product.description||"",product.ingredients||"",...(product.highlights||[])].join(" ").toLowerCase();
      return categoryMatch&&availabilityMatch&&(!q||searchable.includes(q));
    });
    if(sort==="name")list.sort((a,b)=>a.name.localeCompare(b.name));
    if(sort==="newest")list.sort((a,b)=>new Date(b.created_at||0).getTime()-new Date(a.created_at||0).getTime());
    if(sort==="price-low")list.sort((a,b)=>Math.min(...(a.product_variants??[]).map(v=>getEffectivePrice(v)),Infinity)-Math.min(...(b.product_variants??[]).map(v=>getEffectivePrice(v)),Infinity));
    if(sort==="price-high")list.sort((a,b)=>Math.min(...(b.product_variants??[]).map(v=>getEffectivePrice(v)),Infinity)-Math.min(...(a.product_variants??[]).map(v=>getEffectivePrice(v)),Infinity));
    if(sort==="featured")list.sort((a,b)=>Number(Boolean(b.is_featured))-Number(Boolean(a.is_featured))||new Date(b.created_at||0).getTime()-new Date(a.created_at||0).getTime());
    return list;
  },[products,filter,availability,search,sort]);

  const totalQty=cart.reduce((sum,item)=>sum+item.qty,0);
  const stockCount=shown.reduce((sum,product)=>sum+(product.product_variants||[]).filter(variant=>variant.stock_quantity>0).length,0);
  const saleLabel=(product:Product)=>Math.max(0,...(product.product_variants??[]).map(getDiscountPercent));
  const selectedVariant=buyingProduct?.product_variants?.find(variant=>variant.id===selectedVariantId)??null;
  const selectedAlreadyInCart=selectedVariant?cart.find(item=>item.variant_id===selectedVariant.id)?.qty??0:0;
  const remainingSelectedStock=selectedVariant?Math.max(0,selectedVariant.stock_quantity-selectedAlreadyInCart):0;

  return <div className="ec-catalogue">
    <div className="ec-catalogue-toolbar rounded-3xl border bg-white p-3 shadow-sm sm:p-4">
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto]">
        <label className="ec-catalogue-search flex min-w-0 items-center gap-3 rounded-2xl border px-4 py-3.5">
          <Search size={18} className="shrink-0"/>
          <input value={search} onChange={event=>setSearch(event.target.value)} placeholder="Search products, ingredients or categories" aria-label="Search products" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#9aa397]"/>
          {search&&<button type="button" onClick={()=>setSearch("")} className="text-[10px] font-bold">Clear</button>}
        </label>
        <label className="flex items-center gap-2 rounded-2xl border bg-white px-4 py-3.5 text-xs font-bold text-[#617366]">
          <SlidersHorizontal size={15}/>
          <select value={sort} onChange={event=>setSort(event.target.value)} aria-label="Sort products" className="min-w-0 bg-transparent outline-none">
            <option value="featured">Recommended</option><option value="newest">Newest first</option><option value="name">Name: A–Z</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option>
          </select>
        </label>
        <Link href="/cart" className="ec-catalogue-cart inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-extrabold">
          <ShoppingBag size={17}/> Cart <span className="ec-cart-count">{totalQty}</span>
        </Link>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="mr-1 text-[10px] font-black uppercase tracking-[.16em] text-[#8a9689]">Shop category</span>
        {categories.map(category=><button type="button" key={category} onClick={()=>setFilter(category)} aria-pressed={safeFilter===category} className={"ec-filter-chip "+(safeFilter===category?"is-active":"")}>{category}</button>)}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[#eef1e9] pt-3">
        <span className="mr-1 text-[10px] font-black uppercase tracking-[.16em] text-[#8a9689]">Availability</span>
        {([{id:"all",label:"All availability"},{id:"in-stock",label:"In stock"},{id:"on-sale",label:"On offer"}] as const).map(option=><button type="button" key={option.id} onClick={()=>setAvailability(option.id)} aria-pressed={availability===option.id} className={"ec-availability-chip "+(availability===option.id?"is-active":"")}>{option.label}</button>)}
        {(filter!=="All products"||availability!=="all"||search)&&<button type="button" onClick={()=>{setSearch("");setFilter("All products");setAvailability("all");}} className="ml-auto text-[11px] font-extrabold text-[#9a792e]">Reset filters</button>}
      </div>
    </div>

    {notice&&<p role="status" className="mt-4 flex items-center gap-2 rounded-2xl border border-[#dcebd8] bg-[#f1f8ed] px-4 py-3 text-sm font-semibold text-[#245b42]"><Check size={16}/>{notice}</p>}

    <div className="mt-6 flex flex-wrap items-end justify-between gap-3">
      <div><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#9a792e]">Your collection</p><p className="mt-1 text-sm font-semibold text-[#344b3a]">{shown.length} {shown.length===1?"product":"products"} {search?"found":"in this view"}</p></div>
      <p className="inline-flex items-center gap-2 text-[11px] font-semibold text-[#849184]"><PackageCheck size={14}/>{stockCount} pack options currently in stock</p>
    </div>

    {shown.length ? (
      <div className="ec-product-grid mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {shown.map(product=>{
          const variants=product.product_variants??[];
          const available=variants.some(variant=>variant.stock_quantity>0);
          const discount=saleLabel(product);
          const prices=variants.map(getEffectivePrice).filter(price=>Number.isFinite(price)&&price>0);
          const startingPrice=prices.length?Math.min(...prices):null;
          const highestPrice=prices.length?Math.max(...prices):null;
          const packSizes=Array.from(new Set(variants.map(variant=>variant.pack_size).filter(Boolean)));
          return <article key={product.id} className="ec-product-card group overflow-hidden rounded-[1.45rem] border bg-white transition duration-300">
            <Link href={"/products/"+product.slug} className="ec-product-card-image relative flex aspect-[4/3] items-center justify-center overflow-hidden p-5">
              {product.image_url
                ? <img src={product.image_url} alt={product.name} loading="lazy" className="relative z-10 h-full w-full object-contain transition duration-500 group-hover:scale-105"/>
                : <div className="ec-product-placeholder relative z-10 flex flex-col items-center">
                  <span aria-hidden="true" className="ec-product-placeholder__bag"><span className="ec-product-placeholder__handle"/></span>
                  <p className="mt-3 text-[10px] font-black uppercase tracking-[.2em] text-[#8a744b]">eCuisine</p>
                  <p className="mt-1 text-xs font-semibold text-[#6e8167]">Product image coming soon</p>
                </div>}
              <div className="absolute left-3 top-3 flex flex-col items-start gap-2">
                {product.is_featured&&<span className="inline-flex items-center gap-1 rounded-full bg-white/95 px-3 py-1.5 text-[9px] font-black text-[#6e633b] shadow-sm"><Sparkles size={11}/> Featured</span>}
                {discount>0&&<span className="inline-flex items-center gap-1 rounded-full bg-[#bd5636] px-3 py-1.5 text-[9px] font-black text-white shadow-sm"><Tag size={11}/> Up to {discount}% off</span>}
              </div>
              <span className={"ec-stock-pill absolute bottom-3 right-3 "+(available?"is-in-stock":"is-unavailable")}>{available?"Available now":"Currently unavailable"}</span>
            </Link>
            <div className="p-5">
              <p className="text-[10px] font-black uppercase tracking-[.17em] text-[#8a9689]">{product.category}</p>
              <h3 className="mt-2 text-base font-extrabold leading-snug text-[#203329]">{product.name}</h3>
              <p className="mt-2 line-clamp-2 min-h-10 text-xs leading-5 text-[#778176]">{product.short_description||product.description||"View product information and the pack sizes currently listed."}</p>
              <div className="mt-4 flex items-end justify-between gap-3 border-t border-[#eef1e9] pt-3">
                <div className="min-w-0">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-[#788579]">{startingPrice!==null?(startingPrice===highestPrice?"Price":"Price range"):"Price"}</p>
                  <p className="mt-1 whitespace-nowrap font-sans text-[19px] font-semibold leading-tight tracking-normal tabular-nums text-[#087f5b]">{startingPrice!==null?(startingPrice===highestPrice?money(startingPrice):money(startingPrice)+" – "+money(highestPrice!)):"To be announced"}</p>
                  {packSizes.length>0&&<p className="mt-1.5 text-[11px] font-medium text-[#667568]">Available sizes: <span className="font-semibold text-[#344b3a]">{packSizes.join(" · ")}</span></p>}
                </div>
                <Link href={"/products/"+product.slug} className="inline-flex shrink-0 items-center gap-1 text-[11px] font-extrabold text-[#245b42]">Product details <ArrowRight size={13}/></Link>
              </div>
              <div className="mt-5 border-t border-[#eef1e9] pt-4">
                <button type="button" onClick={()=>openBuyOptions(product)} className="ec-shop-buy-button flex w-full items-center justify-center gap-2 rounded-xl bg-[#087f5b] px-5 py-3.5 text-sm font-extrabold text-white shadow-lg transition hover:-translate-y-0.5">
                  <ShoppingBag size={17}/> Buy
                  <span className="ml-1 text-[10px] font-semibold text-white/80">{available?"Choose size & quantity":"View availability"}</span>
                </button>
                {!variants.length&&<p className="mt-2 text-center text-[10px] font-medium text-[#899288]">Pack sizes and prices will be announced soon.</p>}
              </div>
            </div>
          </article>;
        })}
      </div>
    ) : (
      <div className="ec-catalogue-empty mt-7 rounded-3xl border border-dashed p-10 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#edf5e7] text-[#087f5b]"><Search size={22}/></span>
        <h3 className="mt-4 text-lg font-extrabold text-[#344b3a]">No products match those filters.</h3>
        <p className="mt-2 text-sm text-[#849184]">Try a different search or reset your category and availability filters.</p>
        <button type="button" onClick={()=>{setSearch("");setFilter("All products");setAvailability("all");}} className="mt-5 rounded-xl bg-[#087f5b] px-5 py-3 text-xs font-extrabold text-white">Show all products</button>
      </div>
    )}
  </div>;
    {buyingProduct&&<div className="ec-buy-options-backdrop fixed inset-0 z-[100] flex items-end justify-center bg-[#10251a]/55 p-0 backdrop-blur-sm sm:items-center sm:p-5" onMouseDown={event=>{if(event.target===event.currentTarget)setBuyingProduct(null);}}>
      <section role="dialog" aria-modal="true" aria-labelledby="ec-buy-options-title" className="ec-buy-options-panel w-full max-w-md rounded-t-[1.8rem] border border-white/80 bg-[#fffefa] p-5 shadow-2xl sm:rounded-[1.8rem] sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div><p className="text-[9px] font-black uppercase tracking-[.18em] text-[#a17c20]">eCuisine · Your selection</p><h2 id="ec-buy-options-title" className="mt-1 text-xl font-black text-[#173e2d]">{buyingProduct.name}</h2><p className="mt-1 text-xs text-[#778477]">Choose the pack size and quantity you need.</p></div>
          <button type="button" onClick={()=>setBuyingProduct(null)} aria-label="Close product options" className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[#dfe8dc] bg-white text-[#4c6651]"><span aria-hidden="true" className="text-xl leading-none">×</span></button>
        </div>
        {buyingProduct.product_variants?.length?<>
          <label className="mt-6 block text-xs font-bold text-[#405443]">Pack size
            <select value={selectedVariantId} onChange={event=>{setSelectedVariantId(event.target.value);setBuyQuantity(1);}} className="mt-2 w-full rounded-xl border border-[#dfe7dc] bg-white px-4 py-3 text-sm font-semibold text-[#25392b] outline-none focus:border-[#4c805b]">
              {buyingProduct.product_variants.map(variant=><option key={variant.id} value={variant.id} disabled={variant.stock_quantity<=0}>{variant.pack_size} · {money(getEffectivePrice(variant))}{variant.stock_quantity>0?" · "+variant.stock_quantity+" available":" · Out of stock"}</option>)}
            </select>
          </label>
          {selectedVariant&&<div className="mt-4 flex items-center justify-between gap-4 rounded-2xl bg-[#f1f7ed] p-4">
            <div><p className="text-[10px] font-bold uppercase tracking-wider text-[#71816f]">Price per pack</p><p className="mt-1 text-xl font-black tabular-nums text-[#087f5b]">{money(getEffectivePrice(selectedVariant))}</p>{getDiscountPercent(selectedVariant)>0&&<p className="mt-1 text-[10px] font-semibold text-[#ad5a3e]">{getDiscountPercent(selectedVariant)}% off · <span className="line-through">{money(Number(selectedVariant.price))}</span></p>}<p className="mt-1 text-[10px] text-[#71816f]">{remainingSelectedStock>0?remainingSelectedStock+" more available to add":selectedVariant.stock_quantity>0?"All available units are already in your cart":"Currently out of stock"}</p></div>
            <div className="shrink-0 text-right"><p className="text-[10px] font-bold uppercase tracking-wider text-[#71816f]">Quantity</p><div className="mt-2 flex items-center gap-3">
              <button type="button" onClick={()=>setBuyQuantity(value=>Math.max(1,value-1))} disabled={buyQuantity<=1} aria-label="Decrease quantity" className="grid h-9 w-9 place-items-center rounded-full border border-[#d4e2d0] bg-white text-[#315b43] disabled:opacity-35"><Minus size={14}/></button>
              <span aria-live="polite" className="min-w-5 text-center text-base font-black tabular-nums text-[#203b2a]">{buyQuantity}</span>
              <button type="button" onClick={()=>setBuyQuantity(value=>Math.min(remainingSelectedStock,value+1))} disabled={buyQuantity>=remainingSelectedStock} aria-label="Increase quantity" className="grid h-9 w-9 place-items-center rounded-full border border-[#d4e2d0] bg-white text-[#315b43] disabled:opacity-35"><Plus size={14}/></button>
            </div></div>
          </div>}
          <div className="mt-5 flex items-center justify-between gap-3 border-t border-[#edf0e9] pt-4"><span className="text-xs font-semibold text-[#667568]">Total for this selection</span><strong className="text-lg font-black tabular-nums text-[#173e2d]">{selectedVariant?money(getEffectivePrice(selectedVariant)*buyQuantity):"—"}</strong></div>
          <button type="button" disabled={!selectedVariant||remainingSelectedStock<1} onClick={()=>{if(selectedVariant){add(buyingProduct,selectedVariant,buyQuantity);setBuyingProduct(null);}}} className="ec-shop-buy-confirm mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#087f5b] px-5 py-3.5 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-45"><ShoppingBag size={16}/> Add to cart</button>
        </>:<div className="mt-6 rounded-2xl bg-[#fff7e7] p-4 text-sm leading-6 text-[#856c36]">Pack sizes and prices are not available for this product yet. Please check back soon.</div>}
        <button type="button" onClick={()=>setBuyingProduct(null)} className="mt-3 w-full rounded-xl px-4 py-3 text-xs font-bold text-[#6e7c70] hover:bg-[#f3f6f1]">Continue shopping</button>
      </section>
    </div>}
}

export function CartPage(){
 const [items,setItems]=useState<CartItem[]>([]);
 const [stockChecked,setStockChecked]=useState(false);
 const [checking,setChecking]=useState(false);
 const [stockError,setStockError]=useState("");
 const [notice,setNotice]=useState("");
 const [refreshKey,setRefreshKey]=useState(0);
 useEffect(()=>{
   let active=true;
   const checkStock=async()=>{
     setChecking(true);setStockChecked(false);setStockError("");
     const saved=readCart();
     if(!active)return;
     setItems(saved);
     if(!saved.length){setStockChecked(true);setChecking(false);return;}
     if(!supabase){setStockError("We cannot verify live stock right now. Please try again shortly.");setStockChecked(true);setChecking(false);return;}
     const ids=saved.map(item=>item.variant_id);
     const {data,error}=await supabase.from("product_variants").select("id,pack_size,price,sale_price,sale_starts_at,sale_ends_at,stock_quantity").in("id",ids);
     if(!active)return;
     if(error){setStockError("We could not verify the latest stock. Please check again before placing your order.");setStockChecked(true);setChecking(false);return;}
     const rows=new Map((data??[]).map((v:any)=>[v.id,v]));
     const {data:products}=await supabase.from("products").select("id,image_url").in("id",saved.map(item=>item.product_id));
     if(!active)return;
     const images=new Map((products??[]).map((product:any)=>[product.id,product.image_url]));
     let adjusted=false;
     const refreshed=saved.map(item=>{
       const variant=rows.get(item.variant_id) as {id:string;pack_size:string;price:number;sale_price:number|null;sale_starts_at:string|null;sale_ends_at:string|null;stock_quantity:number}|undefined;
       const image=images.get(item.product_id) as string|null|undefined;
       if(!variant)return {...item,image_url:image??item.image_url??null,stock_quantity:0};
       const available=Math.max(0,Number(variant.stock_quantity)||0);
       const qty=available>0?Math.min(item.qty,available):item.qty;
       if(qty!==item.qty)adjusted=true;
       return {...item,image_url:image??item.image_url??null,pack_size:variant.pack_size,price:getEffectivePrice(variant),original_price:Number(variant.price),stock_quantity:available,qty};
     });
     setItems(refreshed);
     try{localStorage.setItem(KEY,JSON.stringify(refreshed));}catch{}
     if(adjusted)setNotice("Some quantities were adjusted to match the latest available stock.");
     if(refreshed.some(item=>!item.stock_quantity))setNotice("An item is unavailable. Remove it before continuing to checkout.");
     setStockChecked(true);setChecking(false);
   };
   void checkStock();
   return ()=>{active=false;};
 },[refreshKey]);
 function save(next:CartItem[]){setItems(next);try{localStorage.setItem(KEY,JSON.stringify(next));}catch{}}
 const total=items.reduce((sum,item)=>sum+item.price*item.qty,0);
 const totalQty=items.reduce((sum,item)=>sum+item.qty,0);
 const canCheckout=stockChecked&&!stockError&&items.length>0&&items.every(item=>Number(item.stock_quantity)>0&&Number(item.stock_quantity)>=item.qty);
 return <main className="storefront-glass min-h-screen bg-[#fffdf7] px-4 py-8 text-[#203329] sm:px-6 sm:py-12">
  <div className="mx-auto max-w-6xl">
   <div className="flex flex-wrap items-center justify-between gap-3">
    <Link href="/shop" className="inline-flex items-center gap-2 text-sm font-bold text-[#245b42] transition hover:text-[#087f5b]">← Continue shopping</Link>
    {items.length>0&&<button type="button" onClick={()=>save([])} className="text-xs font-bold text-[#9a5143] hover:text-[#783b32]">Clear cart</button>}
   </div>
   <div className="mt-7 flex flex-wrap items-end justify-between gap-3">
    <div><p className="text-[10px] font-black uppercase tracking-[.2em] text-[#a17c20]">eCuisine · Your basket</p><h1 className="mt-2 text-3xl font-black tracking-tight text-[#173e2d] sm:text-4xl">Your shopping cart</h1><p className="mt-2 text-sm text-[#7b887c]">{totalQty} {totalQty===1?"item":"items"} ready for review</p></div>
    <span className="rounded-full border border-[#e5ebdf] bg-white px-4 py-2 text-[11px] font-bold text-[#5c705f]">Prices in Nigerian naira (₦)</span>
   </div>
   {items.length?<>
    <div className="mt-7 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
     <section className="space-y-3" aria-label="Cart items">
      {items.map(item=><article key={item.variant_id} className="grid grid-cols-[88px_minmax(0,1fr)] gap-4 rounded-3xl border border-[#e6ebdf] bg-white p-3 shadow-sm sm:grid-cols-[112px_minmax(0,1fr)_auto] sm:items-center sm:gap-5 sm:p-5">
       <div className="grid aspect-square place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-[#fff8df] to-[#edf5e8] p-2">
        {item.image_url?<img src={item.image_url} alt={item.name} className="h-full w-full object-contain"/>:<ShoppingBag size={28} className="text-[#8a9b86]"/>}
       </div>
       <div className="min-w-0">
        <h2 className="font-extrabold leading-snug text-[#203329]">{item.name}</h2>
        <p className="mt-1 text-xs font-semibold text-[#7b857a]">{item.pack_size} · {money(item.price)} each</p>
        {item.original_price!=null&&item.original_price>item.price&&<p className="mt-1 text-[11px] text-[#899288] line-through">{money(item.original_price)}</p>}
        <p className={Number(item.stock_quantity)>0?"mt-2 text-[10px] font-bold text-[#54805a]":"mt-2 text-[10px] font-bold text-[#a34b42]"}>{Number(item.stock_quantity)>0?item.stock_quantity+" available":"Out of stock or no longer available"}</p>
        <div className="mt-3 flex items-center gap-2">
         <button type="button" onClick={()=>save(item.qty===1?items.filter(row=>row.variant_id!==item.variant_id):items.map(row=>row.variant_id===item.variant_id?{...row,qty:row.qty-1}:row))} className="grid h-9 w-9 place-items-center rounded-full border border-[#dce3d7] text-[#315b43] hover:bg-[#f1f7ed]" aria-label={"Decrease "+item.name+" quantity"}><Minus size={14}/></button>
         <span className="min-w-7 text-center text-sm font-black tabular-nums">{item.qty}</span>
         <button type="button" disabled={item.qty>=Number(item.stock_quantity||0)} onClick={()=>save(items.map(row=>row.variant_id===item.variant_id?{...row,qty:Math.min(row.qty+1,Number(row.stock_quantity||0))}:row))} className="grid h-9 w-9 place-items-center rounded-full border border-[#dce3d7] text-[#315b43] hover:bg-[#f1f7ed] disabled:cursor-not-allowed disabled:opacity-30" aria-label={"Increase "+item.name+" quantity"}><Plus size={14}/></button>
         <button type="button" onClick={()=>save(items.filter(row=>row.variant_id!==item.variant_id))} className="ml-2 inline-flex items-center gap-1.5 px-2 py-2 text-[10px] font-bold text-[#a34b42] hover:text-[#783b32]"><Trash2 size={13}/> Remove</button>
        </div>
       </div>
       <p className="col-span-2 text-right text-base font-black text-[#245b42] sm:col-span-1">{money(item.price*item.qty)}</p>
      </article>)}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#f1f7ed] px-4 py-3 text-xs text-[#617363]">
       <span>Stock is checked again before checkout.</span>
       <button type="button" onClick={()=>setRefreshKey(value=>value+1)} disabled={checking} className="font-extrabold text-[#087f5b] disabled:opacity-50">{checking?"Checking…":"Refresh stock"}</button>
      </div>
      {notice&&<p role="status" className="rounded-xl bg-[#fff7e8] px-4 py-3 text-xs font-semibold text-[#795b21]">{notice}</p>}
      {stockError&&<p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">{stockError}</p>}
     </section>
     <aside className="rounded-3xl bg-[#173e2d] p-5 text-white shadow-xl shadow-[#173e2d]/10 sm:p-6 lg:sticky lg:top-28">
      <p className="text-[10px] font-black uppercase tracking-[.18em] text-[#d8e8d5]">Order summary</p>
      <div className="mt-5 flex items-center justify-between text-sm"><span className="text-[#dce8dc]">Subtotal ({totalQty} items)</span><strong className="text-lg tabular-nums">{money(total)}</strong></div>
      <div className="mt-4 flex items-start justify-between gap-4 border-t border-white/15 pt-4 text-xs"><span className="text-[#dce8dc]">Delivery or pickup</span><span className="text-right font-semibold">Selected at checkout</span></div>
      <p className="mt-4 text-[11px] leading-5 text-[#cbd8ca]">Any applicable delivery fee is confirmed after you choose your delivery area. Pickup options are available in Jos and Bauchi.</p>
      {canCheckout?<Link href="/checkout" className="mt-6 block w-full rounded-full bg-[#f6c944] px-5 py-3.5 text-center text-sm font-black text-[#183b27] transition hover:bg-[#ffda63]">Continue to checkout <ArrowRight className="ml-1 inline" size={15}/></Link>:<button type="button" disabled className="mt-6 block w-full cursor-not-allowed rounded-full bg-white/25 px-5 py-3.5 text-center text-sm font-bold text-white/80">{checking||!stockChecked?"Checking availability…":stockError?"Checkout temporarily unavailable":"Remove unavailable items to continue"}</button>}
      <p className="mt-4 text-center text-[10px] text-[#dce8dc]">No payment is taken on this page.</p>
      <Link href="/shop" className="mt-4 block text-center text-xs font-bold text-[#f6d978] hover:text-white">Add more products</Link>
     </aside>
    </div>
   </>:<div className="mt-8 rounded-[2rem] border border-dashed border-[#d9e4d4] bg-white px-6 py-14 text-center shadow-sm">
    <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-[#edf6e8] text-[#087f5b]"><ShoppingBag size={27}/></span>
    <h2 className="mt-5 text-xl font-black text-[#203b2a]">Your cart is waiting for something good.</h2>
    <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#7b887c]">Explore the eCuisine collection and add the products you would like to order.</p>
    <Link href="/shop" className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#087f5b] px-6 py-3 text-sm font-extrabold text-white hover:bg-[#07543f]">Explore the shop <ArrowRight size={15}/></Link>
   </div>}
  </div>
 </main>;
}
