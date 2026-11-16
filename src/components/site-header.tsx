"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Search, ShoppingBag, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export function SiteHeader() {
 const [logoUrl,setLogoUrl]=useState<string|null>(null);
 const [search,setSearch]=useState("");
 const router=useRouter();
 useEffect(()=>{let alive=true;if(!supabase)return;supabase.from("site_settings").select("setting_key,setting_value").in("setting_key",["store_logo_url","storefront_config"]).then(({data})=>{if(!alive)return;const logo=data?.find(x=>x.setting_key==="store_logo_url")?.setting_value;if(logo)setLogoUrl(logo);const row=data?.find(x=>x.setting_key==="storefront_config");if(row?.setting_value){try{const c=JSON.parse(row.setting_value);for(const [key,val] of Object.entries({"--brand-primary":c.brand_primary,"--brand-dark":c.brand_dark,"--brand-accent":c.brand_accent,"--brand-background":c.brand_background,"--brand-surface":c.brand_surface,"--brand-text":c.brand_text})){if(typeof val==="string"&&/^#[0-9a-fA-F]{6}$/.test(val))document.documentElement.style.setProperty(key,val);}}catch{}}});return()=>{alive=false;};},[]);
 function submitSearch(event:React.FormEvent<HTMLFormElement>){event.preventDefault();const q=search.trim();router.push(q?"/shop?search="+encodeURIComponent(q):"/shop");}
 return <header className="site-header sticky top-0 z-40 border-b border-[#e9e4d8] bg-white/95 backdrop-blur-xl"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5 sm:py-4">
 <Link href="/" className="brand-lockup flex items-center gap-3" aria-label="eCuisine home">{logoUrl?<img src={logoUrl} alt="eCuisine — Good Food, Better Living" className="h-12 w-auto max-w-[210px] object-contain"/>:<><span className="brand-emblem grid h-11 w-11 place-items-center rounded-full border-2 border-[#f4c542] bg-[#087f5b] text-2xl font-black italic text-[#fff0a8] shadow-lg">e</span><span><span className="block text-[19px] font-black tracking-[-.04em] text-[#07543f]">eCuisine</span><span className="block text-[9px] font-bold uppercase tracking-[.2em] text-[#b17a12]">Good food · Better living</span></span></>}</Link>
 <form onSubmit={submitSearch} role="search" className="order-3 flex w-full items-center gap-2 rounded-full border border-[#dce8df] bg-[#f7fbf7] px-4 py-2.5 sm:order-2 sm:max-w-[390px]"><Search size={17} className="shrink-0 text-[#087f5b]"/><input value={search} onChange={e=>setSearch(e.target.value)} aria-label="Search products" placeholder="Search food, products and more..." className="min-w-0 flex-1 bg-transparent text-sm text-[#183d2b] outline-none placeholder:text-[#8b9c8e]"/><button type="submit" className="rounded-full bg-[#087f5b] px-3 py-1.5 text-[10px] font-extrabold text-white hover:bg-[#07543f]">Search</button></form>
 <div className="order-2 flex items-center gap-2 sm:order-3"><Link href="/track" aria-label="Track your order" className="hidden items-center gap-2 rounded-full border border-[#dce8df] px-3 py-2.5 text-xs font-bold text-[#07543f] transition hover:bg-[#edf7ef] sm:inline-flex"><UserRound size={16}/> My orders</Link><Link href="/cart" className="inline-flex items-center gap-2 rounded-full bg-[#087f5b] px-4 py-2.5 text-sm font-bold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-[#07543f]"><ShoppingBag size={16}/> Cart</Link></div>
 <nav aria-label="Main navigation" className="order-4 flex w-full items-center justify-center gap-x-6 border-t border-[#eef2ec] pt-3 text-xs font-bold text-[#435348] sm:order-4 sm:pt-2"><Link className="nav-link" href="/">Home</Link><Link className="nav-link" href="/shop">Shop</Link><Link className="nav-link" href="/about">Our story</Link><Link className="nav-link" href="/faq">FAQs</Link><Link className="nav-link" href="/contact">Contact</Link></nav>
 </div></header>;
}
