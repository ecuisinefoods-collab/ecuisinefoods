import Image from "next/image";
import { SiteHeader } from "@/components/site-header";
import { ProductCatalog } from "@/components/product-catalog";
import { supabase } from "@/lib/supabase";
import { ArrowRight, BadgePercent, Coffee, Cookie, Leaf, PackageCheck, ShoppingBasket, Sparkles, Sprout, Truck } from "lucide-react";
import Link from "next/link";
import styles from "./shop-cart-hero.module.css";
import { shopCartImageSrc } from "./cart-image";

type Variant = { id:string; pack_size:string; price:number; sale_price:number|null; sale_starts_at:string|null; sale_ends_at:string|null; stock_quantity:number };
type Product = { id:string; name:string; slug:string; category:string; short_description?:string|null; description:string|null; ingredients?:string|null; highlights?:string[]|null; image_url:string|null; is_featured?:boolean; created_at?:string; product_variants?:Variant[] };
export const dynamic="force-dynamic";

const comingSoon = [
  { name:"Grains & staples", detail:"Everyday pantry essentials", icon:Sprout },
  { name:"Spices & seasonings", detail:"More flavour for your kitchen", icon:Sparkles },
  { name:"Beverages", detail:"Drinks and blends", icon:Coffee },
  { name:"Snacks", detail:"Little bites for any time", icon:Cookie },
  { name:"Pantry essentials", detail:"More useful kitchen favourites", icon:ShoppingBasket }
];

export default async function ShopPage({searchParams}:{searchParams:Promise<{category?:string|string[];search?:string|string[]}>}) {
  const params=await searchParams;
  const initialCategory=Array.isArray(params.category)?params.category[0]||"All products":params.category||"All products";
  const initialSearch=Array.isArray(params.search)?params.search[0]||"":params.search||"";
  let products:Product[]=[];
  if(supabase) {
    const {data}=await supabase.from("products")
      .select("id,name,slug,category,short_description,description,ingredients,highlights,image_url,is_featured,created_at,product_variants(id,pack_size,price,sale_price,sale_starts_at,sale_ends_at,stock_quantity)")
      .eq("is_active",true).order("name");
    products=(data||[]) as Product[];
  }
  const categories=Array.from(new Set(products.map(product=>product.category).filter(Boolean)));
  const catalog=products as unknown as Parameters<typeof ProductCatalog>[0]["products"];

  return <main className="ec-shop-page min-h-screen overflow-hidden bg-[#fffdf7] text-[#203329]">
    <div className="ec-shop-announcement flex items-center justify-center gap-2 px-4 py-2.5 text-center text-[10px] font-extrabold tracking-[.08em] sm:text-xs">
      <Sparkles size={14}/> GOOD FOOD · BETTER LIVING
    </div>
    <SiteHeader/>

    <section className="ec-shop-hero relative overflow-hidden">
      <div className="ec-shop-hero-orb ec-shop-hero-orb-one"/>
      <div className="ec-shop-hero-orb ec-shop-hero-orb-two"/>
      <div className="relative mx-auto max-w-7xl px-5 py-10 sm:py-14 md:py-16">
        <div className={styles.heroGrid}>
          <div className={styles.heroCopy}>
            <Link href="/" className="inline-flex items-center gap-2 text-xs font-bold text-[#68806d] hover:text-[#087f5b]">← Back to home</Link>
            <p className="ec-shop-kicker mt-7 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[10px] font-black uppercase tracking-[.18em]"><ShoppingBasket size={14}/> The eCuisine shop</p>
            <h1 className="mt-5 text-[2.8rem] font-black leading-[1.02] tracking-[-.06em] text-[#07543f] sm:text-6xl lg:text-[4.5rem]">Find your everyday <span className="block text-[#e2a900]">favourites.</span></h1>
            <p className="mt-5 max-w-xl text-sm leading-7 text-[#68766b] sm:text-base">Good food, thoughtful choices and little everyday joys. Explore the eCuisine collection and fill your basket with something lovely.</p>
            <div className="mt-7 flex flex-wrap gap-3 max-md:justify-center">
              <Link href="#products" className="inline-flex items-center gap-2 rounded-xl bg-[#087f5b] px-6 py-3.5 text-xs font-extrabold text-white shadow-lg transition hover:-translate-y-1 hover:bg-[#07543f]">Browse products <ArrowRight size={15}/></Link>
              <Link href="/contact" className="inline-flex items-center gap-2 rounded-xl border border-[#cddacb] bg-white/75 px-5 py-3.5 text-xs font-bold text-[#315b43] transition hover:-translate-y-1">Need help? Contact us</Link>
            </div>
          </div>
          <div className={styles.cartScene} aria-label="A colourful three-dimensional shopping cart filled with groceries">
            <span className={`${styles.sparkle} ${styles.sparkleOne}`} aria-hidden="true">✦</span>
            <span className={`${styles.sparkle} ${styles.sparkleTwo}`} aria-hidden="true">✧</span>
            <span className={`${styles.sparkle} ${styles.sparkleThree}`} aria-hidden="true">✦</span>
            <span className={styles.cartGround} aria-hidden="true"/>
            <Image
              className={styles.cartArtwork}
              src={shopCartImageSrc}
              alt="A glossy three-dimensional eCuisine shopping cart filled with everyday groceries"
              width={320}
              height={292}
              sizes="(max-width: 767px) 88vw, 510px"
              priority
              unoptimized
            />
            <div className={styles.cartNote}><span className={styles.cartNoteDot}/><span>GOOD FOOD, BETTER LIVING</span></div>

            
          </div>
        </div>
      </div>
    </section>

    <section id="products" className="ec-shop-catalogue-section scroll-mt-28 py-10 sm:py-14">
      <div className="mx-auto max-w-7xl px-5">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div><p className="ec-shop-section-kicker">Shop the collection</p><h2 className="mt-2 text-3xl font-black tracking-tight text-[#183d2b] sm:text-4xl">Products available now</h2><p className="mt-2 text-sm text-[#758276]">Current prices and pack availability are taken from our live catalogue.</p></div>
          <div className="flex flex-wrap gap-2 text-[10px] font-bold text-[#6d7e70]"><span className="rounded-full border border-[#dce8d8] bg-white px-3 py-2"><BadgePercent size={12} className="mr-1 inline"/> Live offers where available</span><span className="rounded-full border border-[#dce8d8] bg-white px-3 py-2">Prices in Nigerian naira</span></div>
        </div>
        <ProductCatalog products={catalog} initialCategory={initialCategory} initialSearch={initialSearch}/>
        {!products.length&&<p className="mt-5 text-center text-xs text-[#849184]">Our active product range will appear here as products are made available.</p>}
      </div>
    </section>

    <section className="mx-auto max-w-7xl px-5 py-10 sm:py-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="ec-shop-section-kicker">Explore the pantry</p><h2 className="mt-2 text-2xl font-black tracking-tight text-[#183d2b] sm:text-3xl">Shop by category</h2><p className="mt-2 text-sm text-[#7b887c]">Choose a current collection or see what's coming next.</p></div>
        <span className="rounded-full bg-[#fff2bf] px-4 py-2 text-[10px] font-black text-[#7d5b0d]">{categories.length} active {categories.length===1?"category":"categories"}</span>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {categories.map((category,index)=>{
          const Icon=[Leaf,Sprout,ShoppingBasket,PackageCheck][index%4];
          const count=products.filter(product=>product.category===category).length;
          return <Link key={category} href={"/shop?category="+encodeURIComponent(category)+"#products"} className="ec-shop-category group flex min-h-[142px] flex-col justify-between rounded-2xl border p-4 transition hover:-translate-y-1">
            <span className="ec-shop-category-icon ec-shop-category-icon--3d grid h-12 w-12 place-items-center rounded-2xl"><Icon size={19}/></span>
            <span><span className="block text-xs font-extrabold leading-5 text-[#304936]">{category}</span><span className="mt-1 flex items-center justify-between text-[10px] font-semibold text-[#879184]"><span>{count} {count===1?"product":"products"}</span><ArrowRight size={13} className="transition group-hover:translate-x-1"/></span></span>
          </Link>;
        })}
        {comingSoon.slice(0,Math.max(0,6-categories.length)).map(item=><div key={item.name} className="ec-shop-category ec-shop-category-coming flex min-h-[142px] flex-col justify-between rounded-2xl border p-4">
          <span className="ec-shop-category-icon ec-shop-category-icon--3d grid h-12 w-12 place-items-center rounded-2xl"><item.icon size={19}/></span>
          <span><span className="block text-xs font-extrabold leading-5 text-[#304936]">{item.name}</span><span className="mt-1 block text-[10px] font-semibold text-[#9a8e72]">{item.detail}</span><span className="mt-2 inline-flex rounded-full bg-[#fff0bd] px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-[#8b6714]">Coming soon</span></span>
        </div>)}
      </div>
    </section>

    <section className="ec-shop-reassurance py-10 sm:py-14">
      <div className="mx-auto grid max-w-7xl gap-4 px-5 sm:grid-cols-3">
        {[{icon:PackageCheck,title:"Clear product information",detail:"Pack sizes, prices and stock availability are displayed before checkout."},{icon:Truck,title:"Delivery & collection",detail:"See the available fulfilment choices when you place your order."},{icon:Leaf,title:"A growing collection",detail:"New food categories and products will be introduced as they become available."}].map(item=><article key={item.title} className="ec-shop-reassurance-card flex gap-3 rounded-2xl border bg-white p-5"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#edf5e7] text-[#087f5b]"><item.icon size={19}/></span><span><strong className="block text-xs font-extrabold text-[#304936]">{item.title}</strong><span className="mt-2 block text-[11px] leading-5 text-[#7e897f]">{item.detail}</span></span></article>)}
      </div>
    </section>
  </main>;
}
