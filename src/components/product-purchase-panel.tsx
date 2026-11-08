"use client";

import { useMemo, useState } from "react";
import { ShoppingBag, Check } from "lucide-react";

type Variant = { id: string; pack_size: string; price: number; stock_quantity: number };
type CartItem = { variant_id: string; product_id: string; name: string; pack_size: string; price: number; qty: number };
const KEY = "ecuisinefoods-cart-v1";

export function ProductPurchasePanel({ productId, productName, variants }: { productId: string; productName: string; variants: Variant[] }) {
  const available = useMemo(() => variants.filter(v => v.stock_quantity > 0), [variants]);
  const [selected, setSelected] = useState(available[0]?.id ?? "");
  const [qty, setQty] = useState(1);
  const [notice, setNotice] = useState("");
  const current = variants.find(v => v.id === selected);
  function add() {
    if (!current || current.stock_quantity < 1) return;
    let cart: CartItem[] = [];
    try { cart = JSON.parse(localStorage.getItem(KEY) || "[]") as CartItem[]; } catch { cart = []; }
    const found = cart.find(x => x.variant_id === current.id);
    const next = found
      ? cart.map(x => x.variant_id === current.id ? { ...x, qty: Math.min(x.qty + qty, current.stock_quantity) } : x)
      : [...cart, { variant_id: current.id, product_id: productId, name: productName, pack_size: current.pack_size, price: Number(current.price), qty: Math.min(qty, current.stock_quantity) }];
    localStorage.setItem(KEY, JSON.stringify(next));
    setNotice("Added to your cart.");
  }
  return <div className="mt-7 rounded-2xl bg-[#fbfaf7] p-4 sm:p-5">
    <h2 className="font-bold text-[#203329]">Choose your pack</h2>
    {variants.length ? <div className="mt-3 grid gap-2">{variants.map(v=><button type="button" key={v.id} disabled={v.stock_quantity<=0} onClick={()=>{setSelected(v.id);setQty(1);setNotice("");}} className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left transition ${selected===v.id?"border-[#245b42] bg-[#edf3e9]":"border-[#e5e9df] bg-white"} disabled:cursor-not-allowed disabled:opacity-50`}><span><span className="block text-sm font-semibold text-[#405044]">{v.pack_size}</span><span className="mt-1 block text-[11px] text-[#7b857a]">{v.stock_quantity>0?"Available":"Out of stock"}</span></span><span className="text-sm font-extrabold text-[#245b42]">₦{Number(v.price).toLocaleString("en-NG")}</span></button>)}</div> : <p className="mt-2 text-sm text-[#7b857a]">Pack sizes and pricing will be added soon.</p>}
    {current && <div className="mt-4 flex flex-wrap items-center gap-3"><label className="text-xs font-semibold text-[#526352]">Quantity <select value={qty} onChange={e=>setQty(Number(e.target.value))} className="ml-2 rounded-lg border border-[#dfe7dc] bg-white px-3 py-2 text-sm">{Array.from({length:Math.min(current.stock_quantity,20)},(_,i)=>i+1).map(n=><option key={n} value={n}>{n}</option>)}</select></label><span className="ml-auto text-sm font-extrabold text-[#244b34]">₦{(Number(current.price)*qty).toLocaleString("en-NG")}</span></div>}
    <button type="button" onClick={add} disabled={!current} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#245b42] px-5 py-3.5 text-sm font-bold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-[#173e2d] disabled:cursor-not-allowed disabled:opacity-50"><ShoppingBag size={16}/> Add to cart</button>
    {notice && <p role="status" className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-[#357044]"><Check size={14}/>{notice}</p>}
  </div>;
}
