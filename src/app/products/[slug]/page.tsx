import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, ChevronRight, CircleHelp, Leaf, PackageCheck, ShieldCheck, Sparkles, Truck } from "lucide-react";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { SiteHeader } from "@/components/site-header";
import { ProductPurchasePanel } from "@/components/product-purchase-panel";
import { ProductCatalog } from "@/components/product-catalog";
import { CustomerReviews } from "@/components/customer-reviews";

export const dynamic="force-dynamic";

type Variant={id:string;pack_size:string;price:number;sale_price:number|null;sale_starts_at:string|null;sale_ends_at:string|null;stock_quantity:number};
type RelatedProduct={id:string;name:string;slug:string;category:string;short_description:string|null;description:string|null;ingredients:string|null;highlights:string[]|null;image_url:string|null;is_featured:boolean;created_at:string;product_variants:Variant[]};

export default async function ProductPage({params}:{params:Promise<{slug:string}>}) {
  const {slug}=await params;
  if(!supabase)notFound();
  const {data:product}=await supabase.from("products")
    .select("id,name,slug,category,short_description,description,highlights,ingredients,nutrition_info,usage_instructions,storage_instructions,allergy_info,image_url,is_featured,product_variants(id,pack_size,price,sale_price,sale_starts_at,sale_ends_at,stock_quantity)")
    .eq("slug",slug).eq("is_active",true).maybeSingle();
  if(!product)notFound();

  const variants=(product.product_variants??[]) as Variant[];
  const available=variants.filter(variant=>variant.stock_quantity>0);
  const totalStock=available.reduce((sum,variant)=>sum+Number(variant.stock_quantity||0),0);
  const {data:relatedData}=await supabase.from("products")
    .select("id,name,slug,category,short_description,description,ingredients,highlights,image_url,is_featured,created_at,product_variants(id,pack_size,price,sale_price,sale_starts_at,sale_ends_at,stock_quantity)")
    .eq("is_active",true).eq("category",product.category).neq("id",product.id)
    .order("created_at",{ascending:false}).limit(4);
  const related=(relatedData??[]) as RelatedProduct[];
  const nutrition=product.nutrition_info&&typeof product.nutrition_info==="object"&&!Array.isArray(product.nutrition_info)
    ?Object.entries(product.nutrition_info as Record<string,unknown>):[];
  const highlights=Array.isArray(product.highlights)?product.highlights:[];
  const hasDetails=Boolean(highlights.length||product.ingredients||product.usage_instructions||product.storage_instructions||product.allergy_info||nutrition.length);

  return <main className="ec-product-page min-h-screen overflow-hidden bg-[#fffdf7] text-[#203329]">
    <div className="ec-product-announcement px-4 py-2 text-center text-[10px] font-extrabold tracking-[.08em]">GOOD FOOD · BETTER LIVING</div>
    <SiteHeader/>
    <section className="mx-auto max-w-[1680px] px-4 py-7 sm:px-6 sm:py-10 xl:px-8">
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-[#829083]">
        <Link href="/" className="hover:text-[#087f5b]">Home</Link><ChevronRight size={12}/>
        <Link href="/shop" className="hover:text-[#087f5b]">Shop</Link><ChevronRight size={12}/>
        <span className="max-w-[220px] truncate text-[#48624d]">{product.name}</span>
      </nav>

      <Link href="/shop" className="mt-5 inline-flex items-center gap-2 text-xs font-extrabold text-[#245b42]"><ArrowLeft size={14}/> Back to the shop</Link>

      <div className="ec-product-detail-grid mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,.92fr)] lg:items-start xl:gap-8">
        <div className="ec-product-gallery rounded-[1.8rem] border p-2 shadow-sm sm:p-3 xl:p-4">
          <div className="ec-product-image-stage relative flex aspect-[1.08/1] min-h-[340px] items-center justify-center overflow-hidden rounded-[1.35rem] p-3 sm:min-h-[520px] sm:p-5 xl:min-h-[680px] xl:p-7">
            <div className="ec-product-image-orb"/>
            {product.image_url
              ?<img src={product.image_url} alt={product.name} className="relative z-10 max-h-[640px] w-full max-w-full object-contain drop-shadow-[0_24px_24px_rgba(34,36,22,.18)]"/>
              :<div className="relative z-10 max-w-sm text-center"><span className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-white text-[#087f5b] shadow-lg"><PackageCheck size={34}/></span><p className="mt-5 text-[10px] font-black uppercase tracking-[.22em] text-[#9a792e]">eCuisinefoods product</p><p className="mt-2 text-2xl font-black text-[#315b43]">{product.name}</p><p className="mt-2 text-xs font-semibold text-[#8a9689]">Product photography coming soon</p></div>}
            <span className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/90 px-3 py-2 text-[9px] font-black uppercase tracking-wider text-[#48624d]"><Leaf size={12}/> {product.category}</span>
            {product.is_featured&&<span className="absolute bottom-4 left-4 inline-flex items-center gap-1 rounded-full bg-[#fff1bf] px-3 py-2 text-[9px] font-black text-[#7c5a0b]"><Sparkles size={11}/> Featured product</span>}
          </div>
          <div className="ec-product-gallery-note mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl px-4 py-3">
            <span className="inline-flex items-center gap-2 text-[10px] font-bold text-[#69806b]"><ShieldCheck size={14}/> Product details from eCuisinefoods</span>
            <span className="text-[10px] font-semibold text-[#8b9688]">Prices in Nigerian naira</span>
          </div>
        </div>

        <div className="ec-product-information rounded-[1.8rem] border bg-white p-5 shadow-sm sm:p-7 lg:sticky lg:top-28">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[#eef6e9] px-3 py-1.5 text-[9px] font-black uppercase tracking-wider text-[#42724b]">{product.category}</span>
            <span className={"inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[9px] font-black uppercase tracking-wider "+(available.length>0?"bg-[#e8f5e6] text-[#47764a]":"bg-[#faece5] text-[#a34b42]")}>
              {available.length>0?<><CheckCircle2 size={11}/> In stock</>:<>Currently unavailable</>}
            </span>
          </div>
          <h1 className="mt-4 text-3xl font-black leading-tight tracking-[-.04em] text-[#173e2d] sm:text-[2.6rem]">{product.name}</h1>
          {product.short_description&&<p className="mt-4 text-base font-semibold leading-7 text-[#4e6a52]">{product.short_description}</p>}
          {product.description&&<p className="mt-4 whitespace-pre-line text-sm leading-7 text-[#6d796e]">{product.description}</p>}
          {!product.description&&!product.short_description&&<p className="mt-4 text-sm leading-7 text-[#7a887a]">We are preparing more information for this product. For product questions, ingredients or availability, please contact our team before ordering.</p>}

          <ProductPurchasePanel productId={product.id} productName={product.name} variants={variants}/>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="ec-product-promise rounded-xl p-3"><PackageCheck size={17}/><p className="mt-2 text-[10px] font-extrabold text-[#36523c]">Stock checked</p><p className="mt-1 text-[9px] leading-4 text-[#829083]">{totalStock>0?totalStock+" unit"+(totalStock===1?"":"s")+" currently listed":"Stock will be updated when available"}</p></div>
            <div className="ec-product-promise rounded-xl p-3"><Truck size={17}/><p className="mt-2 text-[10px] font-extrabold text-[#36523c]">Delivery & collection</p><p className="mt-1 text-[9px] leading-4 text-[#829083]">See available options during checkout</p></div>
          </div>
        </div>
      </div>

      <section className="mt-10 sm:mt-14">
        <div className="mb-5"><p className="ec-product-section-kicker">Product information</p><h2 className="mt-2 text-2xl font-black tracking-tight text-[#183d2b] sm:text-3xl">Know what you are buying</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[#7b887c]">Product details shown here are provided by eCuisinefoods. Information not yet confirmed is left out rather than guessed.</p></div>
        {hasDetails?(
          <div className="grid gap-4 md:grid-cols-2">
            {highlights.length>0&&<section className="ec-product-info-card rounded-2xl border bg-white p-5 sm:p-6"><h3 className="flex items-center gap-2 font-extrabold text-[#203b2a]"><Sparkles size={17}/> Product highlights</h3><ul className="mt-4 space-y-3">{highlights.map((item:string,index:number)=><li key={index} className="flex items-start gap-3 text-sm leading-6 text-[#68766b]"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#d6a42a]"/>{item}</li>)}</ul></section>}
            {product.ingredients&&<section className="ec-product-info-card rounded-2xl border bg-white p-5 sm:p-6"><h3 className="font-extrabold text-[#203b2a]">Ingredients</h3><p className="mt-3 whitespace-pre-line text-sm leading-7 text-[#68766b]">{product.ingredients}</p></section>}
            {product.usage_instructions&&<section className="ec-product-info-card rounded-2xl border bg-white p-5 sm:p-6"><h3 className="font-extrabold text-[#203b2a]">Preparation or usage</h3><p className="mt-3 whitespace-pre-line text-sm leading-7 text-[#68766b]">{product.usage_instructions}</p></section>}
            {product.storage_instructions&&<section className="ec-product-info-card rounded-2xl border bg-white p-5 sm:p-6"><h3 className="font-extrabold text-[#203b2a]">Storage instructions</h3><p className="mt-3 whitespace-pre-line text-sm leading-7 text-[#68766b]">{product.storage_instructions}</p></section>}
            {product.allergy_info&&<section className="ec-product-info-card ec-product-allergy rounded-2xl border p-5 sm:p-6"><h3 className="flex items-center gap-2 font-extrabold text-[#72552e]"><CircleHelp size={17}/> Allergy & dietary information</h3><p className="mt-3 whitespace-pre-line text-sm leading-7 text-[#786b58]">{product.allergy_info}</p></section>}
            {nutrition.length>0&&<section className="ec-product-info-card rounded-2xl border bg-white p-5 sm:p-6"><h3 className="flex items-center gap-2 font-extrabold text-[#203b2a]"><PackageCheck size={17}/> Nutrition information</h3><dl className="mt-4 grid grid-cols-2 gap-3">{nutrition.map(([key,value])=><div key={key} className="rounded-xl bg-[#f7faf4] px-3 py-3"><dt className="text-[9px] font-black uppercase tracking-wider text-[#829083]">{key.replace(/[_-]/g," ")}</dt><dd className="mt-1 break-words text-sm font-bold text-[#405044]">{typeof value==="object"&&value!==null?JSON.stringify(value):String(value??"—")}</dd></div>)}</dl></section>}
          </div>
        ):<div className="ec-product-empty-details rounded-2xl border border-dashed p-6 sm:p-8"><p className="font-extrabold text-[#415945]">More product information is being prepared.</p><p className="mt-2 text-sm leading-6 text-[#849184]">Ingredients, preparation details and nutrition information will appear here when verified by eCuisinefoods.</p><Link href="/contact" className="mt-4 inline-flex items-center gap-2 text-xs font-extrabold text-[#087f5b]">Ask our team <ArrowRight size={14}/></Link></div>}
      </section>

      <section id="reviews" className="mt-10 scroll-mt-28 sm:mt-14"><CustomerReviews productId={product.id}/></section>

      {related.length>0&&<section className="mt-12 sm:mt-16"><div className="mb-5"><p className="ec-product-section-kicker">Keep exploring</p><h2 className="mt-2 text-2xl font-black text-[#173e2d] sm:text-3xl">More from {product.category}</h2></div><ProductCatalog products={related}/></section>}
      <div className="ec-product-assurance mt-10 flex items-start gap-3 rounded-2xl border p-5 sm:p-6"><ShieldCheck size={20} className="mt-0.5 shrink-0 text-[#47724e]"/><p className="text-sm leading-6 text-[#5d705f]">Your cart and checkout check the latest product stock before an order request is saved. Product prices, available pack sizes and any active sale are shown before you add the item.</p></div>
    </section>
  </main>;
}
