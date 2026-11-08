import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { SiteHeader } from "@/components/site-header";
import { CustomerReviews } from "@/components/customer-reviews";
export const dynamic="force-dynamic";
export default async function ReviewsPage(){
 const {data}=await supabase?.from("products").select("id,name,slug").eq("is_active",true).order("name").limit(100) ?? {data:[]};
 return <main className="storefront-glass min-h-screen bg-[#fbfaf7]"><div className="bg-[#173e2d] px-4 py-2 text-center text-xs font-semibold text-white">eCuisinefoods · Good food, better living</div><SiteHeader/><section className="mx-auto max-w-6xl px-5 py-8 sm:py-12"><Link href="/" className="text-sm font-semibold text-[#245b42]">← Storefront</Link><p className="mt-6 text-[10px] font-extrabold uppercase tracking-[.2em] text-[#8a987e]">Community voices</p><h1 className="mt-2 text-3xl font-semibold text-[#173e2d] sm:text-4xl">Customer reviews</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[#68766b]">Read feedback from verified customers. Reviews are linked to completed purchases and published after moderation.</p><div className="mt-8 grid gap-6">{(data||[]).map((p:any)=><section key={p.id} className="rounded-3xl border border-[#e5e9e1] bg-white p-5 sm:p-7"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-semibold text-[#173e2d]">{p.name}</h2><Link href={"/products/"+p.slug} className="text-xs font-bold text-[#245b42]">View product →</Link></div><CustomerReviews productId={p.id}/></section>)}</div></section></main>;
}