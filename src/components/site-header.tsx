"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ShoppingBag } from "lucide-react";
import { supabase } from "@/lib/supabase";

export function SiteHeader() {
 const [logoUrl,setLogoUrl]=useState<string|null>(null);
 useEffect(()=>{let alive=true;if(!supabase)return;supabase.from("site_settings").select("setting_key,setting_value").in("setting_key",["store_logo_url","storefront_config"]).then(({data})=>{if(!alive)return;const logo=data?.find(x=>x.setting_key==="store_logo_url")?.setting_value;if(logo)setLogoUrl(logo);const row=data?.find(x=>x.setting_key==="storefront_config");if(row?.setting_value){try{const c=JSON.parse(row.setting_value);for(const [key,val] of Object.entries({ "--brand-primary":c.brand_primary,"--brand-dark":c.brand_dark,"--brand-accent":c.brand_accent,"--brand-background":c.brand_background,"--brand-surface":c.brand_surface,"--brand-text":c.brand_text})){if(typeof val==="string"&&/^#[0-9a-fA-F]{6}$/.test(val))document.documentElement.style.setProperty(key,val);}}catch{}}});return()=>{alive=false;};},[]);
 return <header className="site-header sticky top-0 z-40 border-b border-[#e9e4d8] bg-[#fffdf8]/95 backdrop-blur-xl"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-3 sm:py-4">
 <Link href="/" className="brand-lockup flex items-center gap-3" aria-label="eCuisinefoods home">{logoUrl?<img src={logoUrl} alt="eCuisinefoods — Good Food, Better Living" className="h-12 w-auto max-w-[230px] object-contain"/>:<><span className="brand-emblem grid h-11 w-11 place-items-center rounded-full border-2 border-[#d9ad3f] bg-[#17452f] text-2xl font-black italic text-[#f5c64e] shadow-lg">e</span><span><span className="block text-[19px] font-black tracking-[-.04em] text-[#17452f]">eCuisinefoods</span><span className="block text-[9px] font-bold uppercase tracking-[.2em] text-[#9a7730]">Good food · Better living</span></span></>}</Link>
 <Link href="/cart" className="order-2 inline-flex items-center gap-2 rounded-full bg-[#17452f] px-4 py-2.5 text-sm font-bold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-[#0e3421] sm:order-3"><ShoppingBag size={16}/> Cart</Link>
 <nav aria-label="Main navigation" className="order-3 flex w-full flex-wrap items-center justify-center gap-x-5 gap-y-2 border-t border-[#eee9dd] pt-3 text-xs font-bold text-[#435348] sm:order-2 sm:w-auto sm:border-0 sm:pt-0 sm:text-sm"><Link className="nav-link" href="/">Home</Link><Link className="nav-link" href="/shop">Shop</Link><Link className="nav-link" href="/about">About</Link><Link className="nav-link" href="/faq">FAQ</Link><Link className="nav-link" href="/contact">Contact</Link></nav>
 </div></header>;
}
