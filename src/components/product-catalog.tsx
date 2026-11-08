"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, ShoppingBag, Plus, Minus, Trash2, SlidersHorizontal } from "lucide-react";

type Variant = { id: string; pack_size: string; price: number; stock_quantity: number };
type Product = { id: string; name: string; slug: string; category: string; description: string | null; image_url: string | null; product_variants?: Variant[] };
type CartItem = { variant_id: string; product_id: string; name: string; pack_size: string; price: number; qty: number };
const KEY = "ecuisinefoods-cart-v1";
function readCart(): CartItem[] { try { return JSON.parse(localStorage.getItem(KEY) || "[]") as CartItem[]; } catch { return []; } }
const money = (n:number) => "₦" + n.toLocaleString("en-NG");

export function ProductCatalog({ products }: { products: Product[] }) {
  const [cart,setCart]=useState<CartItem[]>([]);
  const [filter,setFilter]=useState("All products");
  const [search,setSearch]=useState("");
  const [sort,setSort]=useState("featured");
  const [notice,setNotice]=useState("");
  useEffect(()=>{setCart(readCart());},[]);
  function save(next:CartItem[]){setCart(next);localStorage.setItem(KEY,JSON.stringify(next));}
  function add(product:Product,variant:Variant){
    if(variant.stock_quantity<=0)return;
    const found=cart.find(x=>x.variant_id===variant.id);
    save(found?cart.map(x=>x.variant_id===variant.id?{...x,qty:Math.min(x.qty+1,variant.stock_quantity)}:x):[...cart,{variant_id:variant.id,product_id:product.id,name:product.name,pack_size:variant.pack_size,price:Number(variant.price),qty:1}]);
    setNotice(product.name+" added to your cart");
    window.setTimeout(()=>setNotice(""),2200);
  }
  const categories=["All products",...Array.from(new Set(products.map(p=>p.category).filter(Boolean)))];
  const shown=useMemo(()=>{
    const q=search.trim().toLowerCase();
    const list=products.filter(p=>(filter==="All products"||p.category===filter)&&(!q||[p.name,p.category,p.description||""].join(" ").toLowerCase().includes(q)));
    if(sort==="name")list.sort((a,b)=>a.name.localeCompare(b.name));
    if(sort==="price-low")list.sort((a,b)=>Math.min(...(a.product_variants??[]).map(v=>Number(v.price)),Infinity)-Math.min(...(b.product_variants??[]).map(v=>Number(v.price)),Infinity));
    if(sort==="price-high")list.sort((a,b)=>Math.min(...(b.product_variants??[]).map(v=>Number(v.price)),Infinity)-Math.min(...(a.product_variants??[]).map(v=>Number(v.price)),Infinity));
    return list;
  },[products,filter,search,sort]);
  const totalQty=cart.reduce((s,x)=>s+x.qty,0);
  return <div>
    <div className="mt-7 grid gap-3 md:grid-cols-[1fr_auto_auto]">
      <label className="flex items-center gap-3 rounded-full border border-[#e0e5db] bg-white px-4 py-3"><Search size={17} className="text-[#849184]"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search products, ingredients or categories" aria-label="Search products" className="w-full bg-transparent text-sm text-[#203329] outline-none placeholder:text-[#9aa397]"/></label>
      <label className="flex items-center gap-2 rounded-full border border-[#e0e5db] bg-white px-4 py-3 text-xs font-semibold text-[#657266]"><SlidersHorizontal size={15}/><select value={sort} onChange={e=>setSort(e.target.value)} aria-label="Sort products" className="bg-transparent outline-none"><option value="featured">Default order</option><option value="name">Name: A–Z</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option></select></label>
      <Link href="/cart" className="inline-flex items-center justify-center gap-2 rounded-full border border-[#dce3d7] bg-white px-5 py-3 text-sm font-bold text-[#245b42]"><ShoppingBag size={16}/> Cart {totalQty>0&&<span className="rounded-full bg-[#245b42] px-2 py-0.5 text-xs text-white">{totalQty}</span>}</Link>
    </div>
    <div className="mt-4 flex gap-2 overflow-x-auto pb-1">{categories.map(category=><button key={category} onClick={()=>setFilter(category)} className={`shrink-0 rounded-full border px-4 py-2 text-xs font-semibold transition ${filter===category?"border-[#245b42] bg-[#245b42] text-white":"border-[#e0e5db] bg-white text-[#657266] hover:border-[#a8b8a4]"}`}>{category}</button>)}</div>
    {notice&&<p role="status" className="mt-3 rounded-xl bg-[#eaf2e5] px-4 py-2 text-sm font-semibold text-[#245b42]">{notice}</p>}
    <p className="mt-4 text-xs text-[#899288]">{shown.length} {shown.length===1?"product":"products"}{search? ` matching “${search}”`:" available in the catalogue"}</p>
    {shown.length?<div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{shown.map(product=>{
      const variants=product.product_variants??[];
      const available=variants.some(v=>v.stock_quantity>0);
      return <article key={product.id} className="product-card group overflow-hidden rounded-[1.35rem] border border-[#e8e9e1] bg-white shadow-[0_8px_24px_rgba(34,53,37,.06)] transition duration-500 hover:-translate-y-2 hover:shadow-[0_24px_48px_rgba(34,53,37,.14)]">
        <Link href={`/products/${product.slug}`} className="product-card-media relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_50%_38%,#fffdf5,#eee8d8)] p-5">{product.image_url?<img src={product.image_url} alt={product.name} className="h-full w-full object-contain drop-shadow-[0_18px_14px_rgba(30,25,18,.2)] transition duration-500 group-hover:scale-105"/>:<div className="text-center"><div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#dfe8d7] text-[#245b42]"><ShoppingBag size={26}/></div><p className="mt-3 text-xs font-bold uppercase tracking-widest text-[#6e8167]">eCuisinefoods</p></div>}</Link>
        <div className="p-5"><p className="text-[10px] font-bold uppercase tracking-widest text-[#8a9689]">{product.category}</p><h3 className="mt-2 font-bold text-[#203329]">{product.name}</h3><p className="mt-2 line-clamp-2 text-sm leading-5 text-[#778176]">{product.description||"Discover product details and available pack sizes."}</p><Link href={`/products/${product.slug}`} className="mt-3 inline-flex text-xs font-bold text-[#245b42]">View product details →</Link>
          {variants.length?<div className="mt-4 space-y-2">{variants.map(v=><div key={v.id} className="flex items-center justify-between gap-2 rounded-xl bg-[#fbfaf7] px-3 py-2"><div><p className="text-xs font-semibold text-[#405044]">{v.pack_size}</p><p className="text-xs font-bold text-[#245b42]">{money(Number(v.price))}</p><p className={`mt-0.5 text-[10px] ${v.stock_quantity>0?"text-[#648064]":"text-[#a34b42]"}`}>{v.stock_quantity>0?"Available":"Out of stock"}</p></div><button disabled={v.stock_quantity<=0} onClick={()=>add(product,v)} aria-label={`Add ${product.name} ${v.pack_size} to cart`} className="grid h-9 w-9 place-items-center rounded-full bg-[#245b42] text-white shadow-md transition hover:scale-110 hover:bg-[#173e2d] disabled:cursor-not-allowed disabled:bg-gray-300"><Plus size={15}/></button></div>)}</div>:<p className="mt-4 text-xs text-[#899288]">Pack sizes and pricing will be announced soon.</p>}
          
        </div></article>;
    })}</div>:<div className="mt-8 rounded-2xl border border-dashed border-[#d9dfd3] bg-white p-8 text-center"><p className="font-semibold text-[#526052]">No matching products found.</p><p className="mt-2 text-sm text-[#899288]">Try another search or choose a different category.</p><button onClick={()=>{setSearch("");setFilter("All products");}} className="mt-4 text-sm font-bold text-[#245b42]">Clear filters</button></div>}
  </div>;
}

export function CartPage(){
 const [items,setItems]=useState<CartItem[]>([]);
 useEffect(()=>{setItems(readCart());},[]);
 function save(next:CartItem[]){setItems(next);localStorage.setItem(KEY,JSON.stringify(next));}
 const total=items.reduce((s,x)=>s+x.price*x.qty,0);
 return <main className="min-h-screen bg-[#fbfaf7] px-5 py-10"><div className="mx-auto max-w-4xl"><Link href="/" className="text-sm font-semibold text-[#245b42]">← Continue shopping</Link><h1 className="mt-5 text-3xl font-semibold text-[#173e2d]">Your cart</h1>{items.length?<><div className="mt-6 space-y-3">{items.map(item=><article key={item.variant_id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#e8e9e1] bg-white p-4"><div><h2 className="font-bold text-[#203329]">{item.name}</h2><p className="mt-1 text-sm text-[#7b857a]">{item.pack_size} · {money(item.price)}</p></div><div className="flex items-center gap-2"><button onClick={()=>save(item.qty===1?items.filter(x=>x.variant_id!==item.variant_id):items.map(x=>x.variant_id===item.variant_id?{...x,qty:x.qty-1}:x))} className="grid h-8 w-8 place-items-center rounded-full border border-[#dce3d7]" aria-label="Decrease quantity"><Minus size={14}/></button><span className="w-6 text-center text-sm font-bold">{item.qty}</span><button onClick={()=>save(items.map(x=>x.variant_id===item.variant_id?{...x,qty:x.qty+1}:x))} className="grid h-8 w-8 place-items-center rounded-full border border-[#dce3d7]" aria-label="Increase quantity"><Plus size={14}/></button><button onClick={()=>save(items.filter(x=>x.variant_id!==item.variant_id))} className="ml-2 grid h-8 w-8 place-items-center rounded-full text-[#a34b42]" aria-label="Remove item"><Trash2 size={14}/></button></div><p className="w-full text-right text-sm font-bold text-[#245b42]">{money(item.price*item.qty)}</p></article>)}</div><div className="mt-6 rounded-2xl bg-[#173e2d] p-5 text-white"><div className="flex justify-between text-sm"><span>Subtotal</span><strong>{money(total)}</strong></div><p className="mt-2 text-xs text-[#cbd8ca]">Delivery fees, if applicable, are confirmed separately.</p><Link href="/checkout" className="mt-5 block w-full rounded-full bg-white px-5 py-3 text-center text-sm font-bold text-[#173e2d] transition hover:bg-[#edf3e9]">Continue to checkout</Link></div></>:<div className="mt-6 rounded-2xl border border-[#e8e9e1] bg-white p-8 text-center"><ShoppingBag className="mx-auto text-[#8a9689]"/><p className="mt-3 font-semibold text-[#526052]">Your cart is empty</p><Link href="/#shop" className="mt-4 inline-block rounded-full bg-[#245b42] px-5 py-3 text-sm font-bold text-white">Browse products</Link></div>}</div></main>;
}
