import Link from "next/link";
import { ArrowLeft, Leaf, Sparkles, ShieldCheck, PackageCheck } from "lucide-react";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { SiteHeader } from "@/components/site-header";
import { ProductPurchasePanel } from "@/components/product-purchase-panel";
import { ProductCatalog } from "@/components/product-catalog";

export const dynamic = "force-dynamic";

type Variant = { id: string; pack_size: string; price: number; sale_price: number | null; sale_starts_at: string | null; sale_ends_at: string | null; stock_quantity: number };
type RelatedProduct = { id: string; name: string; slug: string; category: string; short_description: string | null; description: string | null; ingredients: string | null; highlights: string[] | null; image_url: string | null; is_featured: boolean; created_at: string; product_variants: Variant[] };

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!supabase) notFound();
  const { data: product } = await supabase.from("products")
    .select("id,name,slug,category,short_description,description,highlights,ingredients,nutrition_info,usage_instructions,storage_instructions,allergy_info,image_url,is_featured,product_variants(id,pack_size,price,sale_price,sale_starts_at,sale_ends_at,stock_quantity)")
    .eq("slug", slug).eq("is_active", true).maybeSingle();
  if (!product) notFound();

  const variants = (product.product_variants ?? []) as Variant[];
  const { data: relatedData } = await supabase.from("products")
    .select("id,name,slug,category,short_description,description,ingredients,highlights,image_url,is_featured,created_at,product_variants(id,pack_size,price,sale_price,sale_starts_at,sale_ends_at,stock_quantity)")
    .eq("is_active", true).eq("category", product.category).neq("id", product.id)
    .order("created_at", { ascending: false }).limit(4);
  const related = (relatedData ?? []) as RelatedProduct[];
  const nutrition = product.nutrition_info && typeof product.nutrition_info === "object" && !Array.isArray(product.nutrition_info)
    ? Object.entries(product.nutrition_info as Record<string, unknown>) : [];
  const highlights = Array.isArray(product.highlights) ? product.highlights : [];

  return <main className="storefront-glass min-h-screen bg-[#fbfaf7]">
    <div className="bg-[#173e2d] px-4 py-2 text-center text-xs font-semibold text-white">Good food, better living · Thoughtful food choices</div>
    <SiteHeader />
    <section className="mx-auto max-w-6xl px-5 py-8 sm:py-12">
      <Link href="/shop" className="inline-flex items-center gap-2 text-sm font-semibold text-[#245b42]"><ArrowLeft size={15}/> Back to shop</Link>
      <div className="mt-6 grid gap-8 rounded-3xl border border-[#e8e9e1] bg-white p-5 shadow-sm sm:p-8 md:grid-cols-2">
        <div className="flex aspect-square items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-[#e8eadb] to-[#f5e8d0] p-6">
          {product.image_url ? <img src={product.image_url} alt={product.name} className="h-full w-full object-contain"/> : <div className="text-center"><span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#245b42] text-white"><Leaf size={28}/></span><p className="mt-3 text-xs font-bold uppercase tracking-widest text-[#6e8167]">eCuisinefoods</p><p className="mt-2 text-3xl font-semibold text-[#654a2d]">{product.name}</p><p className="mt-2 text-xs font-semibold uppercase tracking-widest text-[#88704b]">Product image coming soon</p></div>}
        </div>
        <div className="py-2">
          <div className="flex flex-wrap items-center gap-2"><p className="text-xs font-bold uppercase tracking-[.18em] text-[#78906b]">{product.category}</p>{product.is_featured&&<span className="inline-flex items-center gap-1 rounded-full bg-[#f3efdf] px-3 py-1 text-[10px] font-bold text-[#79663a]"><Sparkles size={12}/> Featured pick</span>}</div>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#173e2d] sm:text-4xl">{product.name}</h1>
          {product.short_description&&<p className="mt-3 text-base font-medium leading-7 text-[#425d49]">{product.short_description}</p>}
          <p className="mt-4 whitespace-pre-line text-sm leading-7 text-[#68766b]">{product.description || "Product details will be updated soon."}</p>
          <ProductPurchasePanel productId={product.id} productName={product.name} variants={variants}/>
        </div>
      </div>

      {(highlights.length>0||product.ingredients||product.usage_instructions||product.storage_instructions||product.allergy_info||nutrition.length>0)&&<div className="mt-8 grid gap-4 md:grid-cols-2">
        {highlights.length>0&&<section className="rounded-2xl border border-[#e8e9e1] bg-white p-6"><h2 className="flex items-center gap-2 font-bold text-[#203329]"><Sparkles size={17} className="text-[#8a744b]"/> Product highlights</h2><ul className="mt-4 space-y-2">{highlights.map((item:string,i:number)=><li key={i} className="flex gap-2 text-sm leading-6 text-[#68766b]"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#78906b]"/>{item}</li>)}</ul></section>}
        {product.ingredients&&<section className="rounded-2xl border border-[#e8e9e1] bg-white p-6"><h2 className="font-bold text-[#203329]">Ingredients</h2><p className="mt-3 whitespace-pre-line text-sm leading-7 text-[#68766b]">{product.ingredients}</p></section>}
        {product.usage_instructions&&<section className="rounded-2xl border border-[#e8e9e1] bg-white p-6"><h2 className="font-bold text-[#203329]">How to prepare or use</h2><p className="mt-3 whitespace-pre-line text-sm leading-7 text-[#68766b]">{product.usage_instructions}</p></section>}
        {product.storage_instructions&&<section className="rounded-2xl border border-[#e8e9e1] bg-white p-6"><h2 className="font-bold text-[#203329]">Storage instructions</h2><p className="mt-3 whitespace-pre-line text-sm leading-7 text-[#68766b]">{product.storage_instructions}</p></section>}
        {product.allergy_info&&<section className="rounded-2xl border border-[#f0e4d6] bg-[#fffaf2] p-6"><h2 className="flex items-center gap-2 font-bold text-[#70562f]"><ShieldCheck size={17}/> Allergy & dietary information</h2><p className="mt-3 whitespace-pre-line text-sm leading-7 text-[#786b58]">{product.allergy_info}</p></section>}
        {nutrition.length>0&&<section className="rounded-2xl border border-[#e8e9e1] bg-white p-6"><h2 className="flex items-center gap-2 font-bold text-[#203329]"><PackageCheck size={17}/> Nutrition information</h2><dl className="mt-4 grid grid-cols-2 gap-3">{nutrition.map(([key,value])=><div key={key} className="rounded-xl bg-[#fbfaf7] px-3 py-3"><dt className="text-[10px] font-bold uppercase tracking-wider text-[#879184]">{key.replace(/[_-]/g," ")}</dt><dd className="mt-1 break-words text-sm font-semibold text-[#405044]">{typeof value==="object"&&value!==null?JSON.stringify(value):String(value??"—")}</dd></div>)}</dl></section>}
      </div>}

      {related.length>0&&<section className="mt-12"><div className="mb-5"><p className="text-[10px] font-extrabold uppercase tracking-[.2em] text-[#8a987e]">Keep exploring</p><h2 className="mt-2 text-2xl font-semibold text-[#173e2d] sm:text-3xl">More from {product.category}</h2></div><ProductCatalog products={related}/></section>}
      <div className="mt-10 flex items-start gap-3 rounded-2xl border border-[#e5eadf] bg-[#f2f5ed] p-5"><ShieldCheck size={19} className="mt-0.5 shrink-0 text-[#47724e]"/><p className="text-sm leading-6 text-[#5d705f]">Product details and available pack sizes are shown here. Stock is checked again in your cart and at checkout before an order is confirmed.</p></div>
    </section>
  </main>;
}
