import { SiteHeader } from "@/components/site-header";
import { ProductCatalog } from "@/components/product-catalog";
import { supabase } from "@/lib/supabase";
import { ArrowRight, BadgePercent, Coffee, Cookie, Leaf, PackageCheck, ShoppingBasket, Sparkles, Sprout, Truck } from "lucide-react";
import Link from "next/link";
import styles from "./shop-cart-hero.module.css";

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
            <svg className={styles.cartArtwork} viewBox="0 0 520 390" role="img" aria-labelledby="shop-cart-title shop-cart-desc" xmlns="http://www.w3.org/2000/svg">
              <title id="shop-cart-title">eCuisine shopping cart</title>
              <desc id="shop-cart-desc">A floating three-dimensional green shopping cart carrying colourful grocery bags, a cereal pack, vegetables and pantry items.</desc>
              <defs>
                <linearGradient id="cartBasket" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#37a875"/><stop offset="1" stopColor="#07543f"/></linearGradient>
                <linearGradient id="cartRim" x1="0" y1="0" x2="1" y2="0"><stop stopColor="#8bd1a1"/><stop offset="1" stopColor="#16734d"/></linearGradient>
                <linearGradient id="bagGold" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#ffe58b"/><stop offset="1" stopColor="#e5aa25"/></linearGradient>
                <linearGradient id="bagOrange" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#ffbd78"/><stop offset="1" stopColor="#ed7541"/></linearGradient>
                <linearGradient id="packGreen" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#8ed49a"/><stop offset="1" stopColor="#2b8b59"/></linearGradient>
                <linearGradient id="cartMetal" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#dce9df"/><stop offset="1" stopColor="#8ba99a"/></linearGradient>
              </defs>
              <ellipse cx="270" cy="343" rx="160" ry="18" fill="#214b32" opacity=".08"/>
              <path d="M83 63h39l35 178c3 15 15 25 30 25h207" fill="none" stroke="url(#cartMetal)" strokeWidth="13" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M73 57h22" stroke="#245b42" strokeWidth="14" strokeLinecap="round"/>
              <path d="M145 104l299 1-40 157H183z" fill="url(#cartBasket)" stroke="#07543f" strokeWidth="5" strokeLinejoin="round"/>
              <path d="M145 104l299 1-9 30H151z" fill="url(#cartRim)"/>
              <path d="M179 143l22 108M239 139l11 112M300 138l1 112M361 138l-10 112M421 137l-25 112" stroke="#b8e2c3" strokeWidth="4" opacity=".42"/>
              <path d="M184 251l216 0" stroke="#b8e2c3" strokeWidth="4" opacity=".3"/>
              <path d="M191 99l20-56q5-12 17-7l55 18q10 4 6 15l-13 34z" fill="url(#bagGold)" stroke="#d99b21" strokeWidth="3"/>
              <path d="M212 47q25-24 50 7" fill="none" stroke="#b98218" strokeWidth="5" strokeLinecap="round"/>
              <path d="M278 102l15-63q3-12 15-9l58 13q12 3 9 15l-10 44z" fill="url(#bagOrange)" stroke="#d86d3e" strokeWidth="3"/>
              <path d="M301 41q25-23 50 6" fill="none" stroke="#c85e32" strokeWidth="5" strokeLinecap="round"/>
              <path d="M345 101l13-48q3-10 13-8l42 8q10 2 8 13l-8 37z" fill="url(#packGreen)" stroke="#267c4e" strokeWidth="3"/>
              <path d="M374 64q13-13 26 4" fill="none" stroke="#e7f5d9" strokeWidth="4" strokeLinecap="round"/>
              <rect x="226" y="65" width="48" height="75" rx="8" fill="#fff7df" stroke="#e3c879" strokeWidth="3" transform="rotate(-7 226 65)"/>
              <path d="M236 84l27-4" stroke="#b68b30" strokeWidth="4" strokeLinecap="round"/>
              <path d="M237 96l23-3" stroke="#d2b35d" strokeWidth="3" strokeLinecap="round"/>
              <text x="248" y="119" fill="#236342" fontSize="10" fontWeight="900" textAnchor="middle" transform="rotate(-7 248 119)">FOOD</text>
              <path d="M164 91q-18-25-4-43 18 12 14 39" fill="#4d9d56"/>
              <path d="M173 94q-4-31 19-42 7 23-13 47" fill="#77b75e"/>
              <path d="M163 92q-26-8-29-28 24-4 36 20" fill="#2e8c4b"/>
              <circle cx="157" cy="84" r="13" fill="#e66d48"/><circle cx="157" cy="84" r="5" fill="#f8b06b"/>
              <path d="M410 99q10-24 30-22 0 21-24 29" fill="#6bbf65"/>
              <path d="M426 101q15-20 33-11-8 19-30 20" fill="#398f52"/>
              <path d="M435 96q-3-23 16-31 9 19-8 35" fill="#88c96d"/>
              <circle cx="435" cy="96" r="12" fill="#e6a92e"/>
              <path d="M184 267h220" stroke="#6e927e" strokeWidth="9" strokeLinecap="round"/>
              <path d="M202 270l-12 30M387 270l12 30" stroke="#8ba99a" strokeWidth="9" strokeLinecap="round"/>
              <circle cx="187" cy="314" r="25" fill="#284b39"/><circle cx="187" cy="314" r="12" fill="#dce8d9"/><circle cx="187" cy="314" r="5" fill="#789282"/>
              <circle cx="406" cy="314" r="25" fill="#284b39"/><circle cx="406" cy="314" r="12" fill="#dce8d9"/><circle cx="406" cy="314" r="5" fill="#789282"/>
              <path d="M180 290q-8 6-7 17" fill="none" stroke="#fff" strokeWidth="3" opacity=".45" strokeLinecap="round"/>
              <path d="M399 290q-8 6-7 17" fill="none" stroke="#fff" strokeWidth="3" opacity=".45" strokeLinecap="round"/>
              <path d="M312 174q18-17 36 0" fill="none" stroke="#f8e7a8" strokeWidth="5" strokeLinecap="round" opacity=".9"/>
              <path d="M326 188h15" stroke="#f8e7a8" strokeWidth="4" strokeLinecap="round" opacity=".9"/>
            </svg>
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
