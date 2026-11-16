"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, BadgePercent, Check, PackageCheck, Plus, Search, ShoppingBag, SlidersHorizontal, Sparkles, Tag, Trash2, Minus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getEffectivePrice, getDiscountPercent } from "@/lib/product-pricing";

type Variant = { id: string; pack_size: string; price: number; sale_price: number | null; sale_starts_at: string | null; sale_ends_at: string | null; stock_quantity: number };
type Product = { id: string; name: string; slug: string; category: string; short_description?: string | null; description: string | null; ingredients?: string | null; highlights?: string[] | null; image_url: string | null; is_featured?: boolean; created_at?: string; product_variants?: Variant[] };
type CartItem = { variant_id: string; product_id: string; name: string; pack_size: string; price: number; original_price?: number; qty: number; stock_quantity?: number };
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
  useEffect(()=>{setCart(readCart());},[]);

  function save(next:CartItem[]) {
    setCart(next);
    try { localStorage.setItem(KEY,JSON.stringify(next)); } catch {}
  }
  function add(product:Product,variant:Variant) {
    if(variant.stock_quantity<=0)return;
    const found=cart.find(item=>item.variant_id===variant.id);
    save(found
      ? cart.map(item=>item.variant_id===variant.id
        ? {...item,qty:Math.min(item.qty+1,variant.stock_quantity),price:getEffectivePrice(variant),original_price:Number(variant.price),stock_quantity:variant.stock_quantity}
        : item)
      : [...cart,{variant_id:variant.id,product_id:product.id,name:product.name,pack_size:variant.pack_size,price:getEffectivePrice(variant),original_price:Number(variant.price),qty:1,stock_quantity:variant.stock_quantity}]
    );
    setNotice(product.name+" · "+variant.pack_size+" added to your cart");
    window.setTimeout(()=>setNotice(""),2600);
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
          const startingPrice=variants.length?Math.min(...variants.map(getEffectivePrice)):null;
          return <article key={product.id} className="ec-product-card group overflow-hidden rounded-[1.45rem] border bg-white transition duration-300">
            <Link href={"/products/"+product.slug} className="ec-product-card-image relative flex aspect-[4/3] items-center justify-center overflow-hidden p-5">
              {product.image_url
                ? <img src={product.image_url} alt={product.name} loading="lazy" className="relative z-10 h-full w-full object-contain transition duration-500 group-hover:scale-105"/>
                : <div className="relative z-10 text-center"><span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-white text-[#087f5b] shadow-md"><ShoppingBag size={25}/></span><p className="mt-3 text-[10px] font-black uppercase tracking-[.2em] text-[#8a744b]">eCuisinefoods</p><p className="mt-1 text-xs font-semibold text-[#6e8167]">Product image coming soon</p></div>}
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
                <div><p className="text-[9px] font-bold uppercase tracking-wider text-[#9aa397]">{startingPrice!==null?"From":"Price"}</p><p className="mt-1 text-lg font-black text-[#087f5b]">{startingPrice!==null?money(startingPrice):"To be announced"}</p></div>
                <Link href={"/products/"+product.slug} className="inline-flex items-center gap-1 text-[11px] font-extrabold text-[#245b42]">Product details <ArrowRight size={13}/></Link>
              </div>
              {variants.length ? <div className="mt-4 space-y-2">
                {variants.map(variant=><div key={variant.id} className="ec-pack-row flex items-center justify-between gap-3 rounded-xl px-3 py-2.5">
                  <div className="min-w-0"><p className="text-xs font-bold text-[#405044]">{variant.pack_size}</p><p className="mt-1 text-sm font-black text-[#245b42]">{money(getEffectivePrice(variant))}{getDiscountPercent(variant)>0&&<span className="ml-2 text-[9px] font-black text-[#b45a3c]">{getDiscountPercent(variant)}% OFF</span>}</p>{getDiscountPercent(variant)>0&&<p className="text-[10px] text-[#899288] line-through">{money(Number(variant.price))}</p>}<p className={"mt-0.5 text-[9px] font-semibold "+(variant.stock_quantity>0?"text-[#648064]":"text-[#a34b42]")}>{variant.stock_quantity>0?variant.stock_quantity+" available":"Out of stock"}</p></div>
                  <button type="button" disabled={variant.stock_quantity<=0} onClick={()=>add(product,variant)} aria-label={"Add "+product.name+" "+variant.pack_size+" to cart"} className="ec-add-pack grid h-10 w-10 shrink-0 place-items-center rounded-full text-white transition hover:scale-105 disabled:cursor-not-allowed disabled:bg-[#d8ddd7]"><Plus size={16}/></button>
                </div>)}
              </div> : <p className="mt-4 rounded-xl bg-[#fff9e8] px-3 py-3 text-[11px] font-semibold text-[#8b7441]">Pack sizes and prices will be announced soon.</p>}
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
}

export function CartPage(){
 const [items,setItems]=useState<CartItem[]>([]);
 const [stockChecked,setStockChecked]=useState(false);
 const [stockError,setStockError]=useState("");
 const [notice,setNotice]=useState("");
 useEffect(()=>{
   let active=true;
   const load=async()=>{
     const saved=readCart();
     if(!active)return;
     setItems(saved);
     if(!saved.length){setStockChecked(true);return;}
     if(!supabase){setStockError("Stock could not be checked. Please refresh or contact our team.");setStockChecked(true);return;}
     const ids=saved.map(item=>item.variant_id);
     const {data,error}=await supabase.from("product_variants").select("id,pack_size,price,sale_price,sale_starts_at,sale_ends_at,stock_quantity").in("id",ids);
     if(!active)return;
     if(error){setStockError("We could not verify the latest stock. Please refresh this page before checkout.");setStockChecked(true);return;}
     const rows=new Map((data??[]).map((v:any)=>[v.id,v]));
     let adjusted=false;
     const refreshed=saved.map(item=>{
       const variant=rows.get(item.variant_id) as {id:string;pack_size:string;price:number;sale_price:number|null;sale_starts_at:string|null;sale_ends_at:string|null;stock_quantity:number}|undefined;
       if(!variant)return {...item,stock_quantity:0};
       const available=Math.max(0,Number(variant.stock_quantity)||0);
       const qty=available>0?Math.min(item.qty,available):item.qty;
       if(qty!==item.qty)adjusted=true;
       return {...item,pack_size:variant.pack_size,price:getEffectivePrice(variant),original_price:Number(variant.price),stock_quantity:available,qty};
     });
     setItems(refreshed);
     localStorage.setItem(KEY,JSON.stringify(refreshed));
     if(adjusted)setNotice("Your cart quantity was adjusted to match the latest available stock.");
     if(refreshed.some(item=>!item.stock_quantity))setNotice("Some cart items are out of stock. Remove them before continuing.");
     setStockChecked(true);
   };
   void load();
   return ()=>{active=false;};
 },[]);
 function save(next:CartItem[]){setItems(next);localStorage.setItem(KEY,JSON.stringify(next));}
 const total=items.reduce((s,x)=>s+x.price*x.qty,0);
 const canCheckout=stockChecked&&!stockError&&items.length>0&&items.every(x=>Number(x.stock_quantity)>0&&Number(x.stock_quantity)>=x.qty);
 return <main className="storefront-glass min-h-screen bg-[#fbfaf7] px-5 py-10"><div className="mx-auto max-w-4xl"><Link href="/" className="text-sm font-semibold text-[#245b42]">← Continue shopping</Link><h1 className="mt-5 text-3xl font-semibold text-[#173e2d]">Your cart</h1>{items.length?<><div className="mt-6 space-y-3">{items.map(item=><article key={item.variant_id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#e8e9e1] bg-white p-4"><div className="min-w-0"><h2 className="font-bold text-[#203329]">{item.name}</h2><p className="mt-1 text-sm text-[#7b857a]">{item.pack_size} · {money(item.price)}{item.original_price!=null&&item.original_price>item.price&&<span className="ml-2 text-xs line-through">{money(item.original_price)}</span>}</p><p className={Number(item.stock_quantity)>0?"mt-1 text-xs text-[#648064]":"mt-1 text-xs font-semibold text-[#a34b42]"}>{Number(item.stock_quantity)>0?Number(item.stock_quantity)+" available":"Out of stock or unavailable"}</p></div><div className="flex items-center gap-2"><button onClick={()=>save(item.qty===1?items.filter(x=>x.variant_id!==item.variant_id):items.map(x=>x.variant_id===item.variant_id?{...x,qty:x.qty-1}:x))} className="grid h-8 w-8 place-items-center rounded-full border border-[#dce3d7]" aria-label="Decrease quantity"><Minus size={14}/></button><span className="w-6 text-center text-sm font-bold">{item.qty}</span><button disabled={item.qty>=Number(item.stock_quantity||0)} onClick={()=>save(items.map(x=>x.variant_id===item.variant_id?{...x,qty:Math.min(x.qty+1,Number(x.stock_quantity||0))}:x))} className="grid h-8 w-8 place-items-center rounded-full border border-[#dce3d7] disabled:cursor-not-allowed disabled:opacity-30" aria-label="Increase quantity"><Plus size={14}/></button><button onClick={()=>save(items.filter(x=>x.variant_id!==item.variant_id))} className="ml-2 grid h-8 w-8 place-items-center rounded-full text-[#a34b42]" aria-label="Remove item"><Trash2 size={14}/></button></div><p className="w-full text-right text-sm font-bold text-[#245b42]">{money(item.price*item.qty)}</p></article>)}</div>{notice&&<p role="status" className="mt-4 rounded-xl bg-[#fff7e8] px-4 py-3 text-sm text-[#795b21]">{notice}</p>}{stockError&&<p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{stockError}</p>}<div className="mt-6 rounded-2xl bg-[#173e2d] p-5 text-white"><div className="flex justify-between text-sm"><span>Subtotal</span><strong>{money(total)}</strong></div><p className="mt-2 text-xs text-[#cbd8ca]">Delivery fees, if applicable, are confirmed separately.</p>{canCheckout?<Link href="/checkout" className="mt-5 block w-full rounded-full bg-white px-5 py-3 text-center text-sm font-bold text-[#173e2d] transition hover:bg-[#edf3e9]">Continue to WhatsApp checkout</Link>:<button disabled className="mt-5 block w-full cursor-not-allowed rounded-full bg-white/50 px-5 py-3 text-center text-sm font-bold text-[#173e2d]">{!stockChecked?"Checking stock…":stockError?"Checkout unavailable":"Remove unavailable items to continue"}</button>}<p className="mt-3 text-center text-[10px] text-[#dce8dc]">Online payments · Coming soon</p></div></>:<div className="mt-6 rounded-2xl border border-[#e8e9e1] bg-white p-8 text-center"><ShoppingBag className="mx-auto text-[#8a9689]"/><p className="mt-3 font-semibold text-[#526052]">Your cart is empty</p><Link href="/#shop" className="mt-4 inline-block rounded-full bg-[#245b42] px-5 py-3 text-sm font-bold text-white">Browse products</Link></div>}</div></main>;
}