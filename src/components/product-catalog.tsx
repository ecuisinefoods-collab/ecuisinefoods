"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShoppingBag, Plus, Minus, Trash2 } from "lucide-react";

type Variant = { id: string; pack_size: string; price: number; stock_quantity: number };
type Product = { id: string; name: string; slug: string; category: string; description: string | null; image_url: string | null; product_variants?: Variant[] };
type CartItem = { variant_id: string; product_id: string; name: string; pack_size: string; price: number; qty: number };

const KEY = "ecuisinefoods-cart-v1";
function readCart(): CartItem[] {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]") as CartItem[]; } catch { return []; }
}

export function ProductCatalog({ products }: { products: Product[] }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [filter, setFilter] = useState("All products");
  const [notice, setNotice] = useState("");

  useEffect(() => { setCart(readCart()); }, []);
  function save(next: CartItem[]) { setCart(next); localStorage.setItem(KEY, JSON.stringify(next)); }
  function add(product: Product, variant: Variant) {
    if (variant.stock_quantity <= 0) return;
    const found = cart.find(x => x.variant_id === variant.id);
    save(found ? cart.map(x => x.variant_id === variant.id ? { ...x, qty: Math.min(x.qty + 1, variant.stock_quantity) } : x) : [...cart, { variant_id: variant.id, product_id: product.id, name: product.name, pack_size: variant.pack_size, price: Number(variant.price), qty: 1 }]);
    setNotice(product.name + " added to cart");
    window.setTimeout(() => setNotice(""), 2200);
  }
  const totalQty = cart.reduce((s,x)=>s+x.qty,0);
  const categories = ["All products", ...Array.from(new Set(products.map(p=>p.category).filter(Boolean)))];
  const shown = filter === "All products" ? products : products.filter(p=>p.category===filter);
  return <div>
    <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
      <div className="flex gap-2 overflow-x-auto pb-1">{categories.map(category=><button key={category} onClick={()=>setFilter(category)} className={`shrink-0 rounded-full border px-4 py-2 text-xs font-semibold transition ${filter===category?"border-[#245b42] bg-[#245b42] text-white":"border-[#e0e5db] bg-white text-[#657266] hover:border-[#a8b8a4]"}`}>{category}</button>)}</div>
      <Link href="/cart" className="inline-flex items-center gap-2 rounded-full border border-[#dce3d7] bg-white px-4 py-2.5 text-sm font-bold text-[#245b42]"><ShoppingBag size={16}/> Cart {totalQty>0 && <span className="rounded-full bg-[#245b42] px-2 py-0.5 text-xs text-white">{totalQty}</span>}</Link>
    </div>
    {notice && <p role="status" className="mt-3 rounded-xl bg-[#eaf2e5] px-4 py-2 text-sm font-semibold text-[#245b42]">{notice}</p>}
    {shown.length ? <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{shown.map(product=>{
      const variants = product.product_variants ?? [];
      return <article key={product.id} className="overflow-hidden rounded-2xl border border-[#e8e9e1] bg-white">
        <div className="flex aspect-[4/3] items-center justify-center bg-[#f1eee5] p-5">{product.image_url?<img src={product.image_url} alt={product.name} className="h-full w-full object-contain"/>:<div className="text-center"><div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#dfe8d7] text-[#245b42]"><ShoppingBag size={26}/></div><p className="mt-3 text-xs font-bold uppercase tracking-widest text-[#6e8167]">eCuisinefoods</p></div>}</div>
        <div className="p-5"><p className="text-[10px] font-bold uppercase tracking-widest text-[#8a9689]">{product.category}</p><h3 className="mt-2 font-bold text-[#203329]">{product.name}</h3><p className="mt-2 line-clamp-2 text-sm leading-5 text-[#778176]">{product.description || "Wholesome food, thoughtfully made."}</p>
          <Link href={`/products/${product.slug}`} className="mt-3 inline-flex text-xs font-bold text-[#245b42]">Product details →</Link>
          {variants.length ? <div className="mt-4 space-y-2">{variants.map(v=><div key={v.id} className="flex items-center justify-between gap-2 rounded-xl bg-[#fbfaf7] px-3 py-2"><div><p className="text-xs font-semibold text-[#405044]">{v.pack_size}</p><p className="text-xs font-bold text-[#245b42]">₦{Number(v.price).toLocaleString("en-NG")}</p></div><button disabled={v.stock_quantity<=0} onClick={()=>add(product,v)} aria-label={`Add ${product.name} ${v.pack_size} to cart`} className="grid h-9 w-9 place-items-center rounded-full bg-[#245b42] text-white hover:bg-[#173e2d] disabled:cursor-not-allowed disabled:bg-gray-300"><Plus size={15}/></button></div>)}</div>:<p className="mt-4 text-xs text-[#899288]">Pack sizes and pricing coming soon</p>}
        </div></article>;
    })}</div>:<div className="mt-8 rounded-2xl border border-dashed border-[#d9dfd3] bg-white p-8 text-center"><p className="font-semibold text-[#526052]">No products in this category yet.</p><p className="mt-2 text-sm text-[#899288]">Products will appear here when they are added to the catalog.</p></div>}
  </div>;
}

export function CartPage() {
  const [items,setItems] = useState<CartItem[]>([]);
  useEffect(()=>{setItems(readCart());},[]);
  function save(next:CartItem[]){setItems(next);localStorage.setItem(KEY,JSON.stringify(next));}
  const total=items.reduce((s,x)=>s+x.price*x.qty,0);
  return <main className="min-h-screen bg-[#fbfaf7] px-5 py-10"><div className="mx-auto max-w-4xl"><Link href="/" className="text-sm font-semibold text-[#245b42]">← Continue shopping</Link><h1 className="mt-5 text-3xl font-semibold text-[#173e2d]">Your cart</h1>{items.length?<><div className="mt-6 space-y-3">{items.map(item=><article key={item.variant_id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#e8e9e1] bg-white p-4"><div><h2 className="font-bold text-[#203329]">{item.name}</h2><p className="mt-1 text-sm text-[#7b857a]">{item.pack_size} · ₦{item.price.toLocaleString("en-NG")}</p></div><div className="flex items-center gap-2"><button onClick={()=>save(item.qty===1?items.filter(x=>x.variant_id!==item.variant_id):items.map(x=>x.variant_id===item.variant_id?{...x,qty:x.qty-1}:x))} className="grid h-8 w-8 place-items-center rounded-full border border-[#dce3d7]" aria-label="Decrease quantity"><Minus size={14}/></button><span className="w-6 text-center text-sm font-bold">{item.qty}</span><button onClick={()=>save(items.map(x=>x.variant_id===item.variant_id?{...x,qty:x.qty+1}:x))} className="grid h-8 w-8 place-items-center rounded-full border border-[#dce3d7]" aria-label="Increase quantity"><Plus size={14}/></button><button onClick={()=>save(items.filter(x=>x.variant_id!==item.variant_id))} className="ml-2 grid h-8 w-8 place-items-center rounded-full text-[#a34b42]" aria-label="Remove item"><Trash2 size={14}/></button></div><p className="w-full text-right text-sm font-bold text-[#245b42]">₦{(item.price*item.qty).toLocaleString("en-NG")}</p></article>)}</div><div className="mt-6 rounded-2xl bg-[#173e2d] p-5 text-white"><div className="flex justify-between text-sm"><span>Subtotal</span><strong>₦{total.toLocaleString("en-NG")}</strong></div><p className="mt-2 text-xs text-[#cbd8ca]">Delivery fees, if applicable, will be confirmed separately.</p><Link href="/checkout" className="mt-5 block w-full rounded-full bg-white px-5 py-3 text-center text-sm font-bold text-[#173e2d] transition hover:bg-[#edf3e9]">Continue to checkout</Link><p className="mt-3 text-center text-xs text-[#cbd8ca]">Online order submission is being secured before checkout opens.</p></div></>:<div className="mt-6 rounded-2xl border border-[#e8e9e1] bg-white p-8 text-center"><ShoppingBag className="mx-auto text-[#8a9689]"/><p className="mt-3 font-semibold text-[#526052]">Your cart is empty</p><Link href="/#shop" className="mt-4 inline-block rounded-full bg-[#245b42] px-5 py-3 text-sm font-bold text-white">Browse products</Link></div>}</div></main>;
}
