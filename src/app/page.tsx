import Link from "next/link";
import { ArrowRight, BadgePercent, CheckCircle2, ChevronRight, Headphones, MapPin, PackageCheck, ShieldCheck, ShoppingBasket, Sparkles, Sprout, Truck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { ProductCatalog } from "@/components/product-catalog";
import { PromoCarousel } from "@/components/promo-carousel";
import { SiteHeader } from "@/components/site-header";
import { SalesCounter } from "@/components/sales-counter";

type Variant = {
  id: string; pack_size: string; price: number; sale_price: number | null;
  sale_starts_at: string | null; sale_ends_at: string | null; stock_quantity: number;
};
type Product = {
  id: string; name: string; slug: string; category: string;
  short_description?: string | null; description: string | null;
  ingredients?: string | null; highlights?: string[] | null;
  image_url: string | null; is_featured: boolean; created_at?: string;
  product_variants?: Variant[];
};
type StoreConfig = {
  announcement: string; hero_eyebrow: string; hero_title: string; hero_highlight: string;
  hero_description: string; hero_video_url: string; hero_video_fallback_url: string;
  hero_primary_cta: string; hero_secondary_cta: string; promise_title: string;
  promise_description: string; quote: string; quote_attribution: string;
  social_facebook: string; social_instagram: string; social_tiktok: string;
  social_x: string; social_youtube: string; social_whatsapp: string;
};
export const dynamic = "force-dynamic";

const defaults: StoreConfig = {
  announcement: "Welcome to eCuisine · Good food, better living",
  hero_eyebrow: "A brighter way to shop for food",
  hero_title: "Good Food.",
  hero_highlight: "Better Living.",
  hero_description: "Discover thoughtful food choices, shop your favourites and enjoy convenient pickup in Jos and Bauchi.",
  hero_video_url: "",
  hero_video_fallback_url: "",
  hero_primary_cta: "Shop the collection",
  hero_secondary_cta: "Discover our story",
  promise_title: "Good food is where better living begins.",
  promise_description: "We are building a food brand grounded in quality, nutrition, trust, innovation and natural ingredients.",
  quote: "We believe every family deserves thoughtful food choices and a brand they can trust.",
  quote_attribution: "The eCuisine vision",
  social_facebook: "https://www.facebook.com/share/1Dwqaoq7hd/",
  social_instagram: "https://www.instagram.com/ecuisine_official",
  social_tiktok: "https://www.tiktok.com/@ecuisine_official",
  social_x: "", social_youtube: "", social_whatsapp: ""
};

const catalog = (items: Product[]) =>
  items as unknown as Parameters<typeof ProductCatalog>[0]["products"];

function hasDiscount(product: Product) {
  return (product.product_variants ?? []).some(variant =>
    Number(variant.sale_price) > 0 && Number(variant.sale_price) < Number(variant.price)
  );
}

const comingSoonCategories = [
  { name: "Grains & staples", description: "Everyday pantry essentials" },
  { name: "Spices & seasonings", description: "A little more flavour" },
  { name: "Beverages", description: "Something to sip" },
  { name: "Snacks", description: "Little bites for any time" }
];

function categoryDescription(category: string) {
  const value = category.toLowerCase();
  if (/grain|staple|rice|maize|yam|flour/.test(value)) return "Everyday essentials for a well-stocked pantry.";
  if (/spice|seasoning|pepper|herb/.test(value)) return "A little more flavour for meals made with care.";
  if (/beverage|drink|juice|tea|coffee/.test(value)) return "Refreshing favourites and feel-good sips.";
  if (/snack|nut|biscuit|treat/.test(value)) return "Thoughtful little bites for any time of day.";
  if (/cereal|porridge|pap|tom brown/.test(value)) return "Wholesome choices to brighten your mornings.";
  return "Explore thoughtful food choices in this collection.";
}

export default async function HomePage() {
  let products: Product[] = [];
  let locations: { city: string; location_name: string }[] = [];
  let completedProductUnits = 0;
  let config: StoreConfig = { ...defaults };

  if (supabase) {
    const [settingsResult, productsResult, locationsResult, salesResult] = await Promise.all([
      supabase.from("site_settings").select("setting_key,setting_value")
        .in("setting_key", ["storefront_config"]),
      supabase.from("products")
        .select("id,name,slug,category,short_description,description,ingredients,highlights,image_url,is_featured,created_at,product_variants(id,pack_size,price,sale_price,sale_starts_at,sale_ends_at,stock_quantity)")
        .eq("is_active", true).order("created_at", { ascending: false }).limit(60),
      supabase.from("pickup_locations")
        .select("city,location_name").eq("is_active", true).order("city").order("sort_order"),
      supabase.rpc("get_public_completed_product_units")
    ]);

    const raw = settingsResult.data?.find(row => row.setting_key === "storefront_config")?.setting_value;
    if (raw) {
      try { config = { ...defaults, ...JSON.parse(raw) }; } catch { config = { ...defaults }; }
    }
    products = (productsResult.data ?? []) as Product[];
    locations = locationsResult.data ?? [];
    completedProductUnits = Number(salesResult.data ?? 0);
  }

  const featured = products.filter(product => product.is_featured).slice(0, 8);
  const discounted = products.filter(hasDiscount).slice(0, 8);
  const latest = [...products].sort((a, b) =>
    new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
  ).slice(0, 8);
  const liveCategories = Array.from(new Set(products.map(product => product.category).filter(Boolean)));
  const locationList = locations.length ? locations : [
    { city: "Jos", location_name: "Terminus" },
    { city: "Jos", location_name: "Faringada" },
    { city: "Jos", location_name: "Lamingo" },
    { city: "Bauchi", location_name: "Yelwa" },
    { city: "Bauchi", location_name: "Old G-R-A" }
  ];
  const videoEnabled = Boolean(config.hero_video_url?.trim());

  return (
    <main className="ec-storefront min-h-screen overflow-hidden bg-white text-[#21382b]">
      <div className="ec-announcement flex items-center justify-center gap-2 px-4 py-2.5 text-center text-[10px] font-extrabold tracking-[.08em] sm:text-xs">
        <Sparkles size={14} /> {config.announcement}
      </div>
      <SiteHeader />

      <section className="mx-auto w-full max-w-7xl px-5 py-1 sm:py-1.5" aria-label="eCuisine all-time sales milestone">
        <SalesCounter total={completedProductUnits} />
      </section>

      <section className={`ec-home-hero relative isolate overflow-hidden ${videoEnabled ? "ec-home-hero--video" : ""}`}>
        {config.hero_video_fallback_url && (
          <div className="ec-hero-fallback absolute inset-0" style={{ backgroundImage: `url("${config.hero_video_fallback_url}")` }} />
        )}
        {videoEnabled && (
          <video
            className="ec-hero-video absolute inset-0 h-full w-full object-cover"
            src={config.hero_video_url}
            poster={config.hero_video_fallback_url || undefined}
            autoPlay muted loop playsInline preload="auto" aria-hidden="true"
          />
        )}
        <div className="ec-hero-overlay absolute inset-0" />
        <div className="ec-hero-orb ec-hero-orb-one absolute -left-24 top-12 h-72 w-72 rounded-full" />
        <div className="ec-hero-orb ec-hero-orb-two absolute -right-20 bottom-0 h-80 w-80 rounded-full" />
        <div className="relative z-10 mx-auto max-w-7xl px-5 py-16 sm:py-20 md:py-28">
          <div className="ec-hero-copy max-w-3xl">
            <p className="ec-hero-eyebrow inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[10px] font-extrabold uppercase tracking-[.16em]">
              <Sprout size={15} /> {config.hero_eyebrow}
            </p>
            <h1 className="ec-hero-title mt-6 text-[3.2rem] font-black leading-[.98] tracking-[-.065em] sm:text-6xl lg:text-[5rem]">
              {config.hero_title}
              <span className="ec-hero-highlight block">{config.hero_highlight}</span>
            </h1>
            <p className="ec-hero-description mt-5 max-w-xl text-sm leading-7 sm:text-base">
              {config.hero_description}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/shop" className="ec-primary-cta inline-flex items-center gap-3 rounded-xl px-6 py-3.5 text-xs font-extrabold shadow-lg transition hover:-translate-y-1">
                {config.hero_primary_cta} <ArrowRight size={16} />
              </Link>
              <Link href="/about" className="ec-secondary-cta inline-flex items-center gap-2 rounded-xl border px-5 py-3.5 text-xs font-bold transition hover:-translate-y-1">
                {config.hero_secondary_cta} <ChevronRight size={15} />
              </Link>
            </div>
            <div className="ec-hero-proof mt-8 flex flex-wrap gap-x-5 gap-y-2 text-[10px] font-bold">
              <span className="inline-flex items-center gap-2"><ShieldCheck size={14} /> Clear product information</span>
              <span className="inline-flex items-center gap-2"><MapPin size={14} /> Jos & Bauchi pickup</span>
            </div>
          </div>
        </div>
      </section>

      <section className="ec-benefit-strip mx-auto grid max-w-7xl grid-cols-2 gap-3 px-5 py-6 sm:grid-cols-4 sm:py-8">
        {[
          { icon: Truck, title: "Pickup made simple", detail: "Choose your Jos or Bauchi point" },
          { icon: ShieldCheck, title: "Shop with confidence", detail: "Clear order status and tracking" },
          { icon: PackageCheck, title: "Product details", detail: "Pack sizes, prices and stock" },
          { icon: Headphones, title: "Friendly support", detail: "Speak with our team on WhatsApp" }
        ].map(item => (
          <div key={item.title} className="ec-benefit-card flex items-center gap-3 rounded-2xl border bg-white p-3 sm:p-4">
            <span className="ec-benefit-icon grid h-11 w-11 shrink-0 place-items-center rounded-xl"><item.icon size={20} /></span>
            <span><strong className="block text-[11px] font-extrabold sm:text-sm">{item.title}</strong><small className="mt-1 block text-[10px] leading-4 text-[#849184]">{item.detail}</small></span>
          </div>
        ))}
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-5">
        <div className="ec-section-intro mb-4 flex flex-wrap items-end justify-between gap-3">
          <div><p className="ec-kicker">A little something special</p><h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">Offers & good finds</h2></div>
          <Link href="/shop" className="inline-flex items-center gap-2 text-xs font-extrabold text-[#087f5b]">Browse the shop <ArrowRight size={14} /></Link>
        </div>
        <PromoCarousel />
      </section>

      <section className="ec-category-section py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-5">
          <div className="ec-section-intro flex items-end justify-between gap-4">
            <div><p className="ec-kicker">Explore the pantry</p><h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Shop by category</h2><p className="mt-2 text-sm text-[#748277]">Find what you need, all in one place.</p></div>
            <Link href="/shop" className="hidden items-center gap-2 text-xs font-extrabold text-[#087f5b] sm:inline-flex">All products <ArrowRight size={14} /></Link>
          </div>
          <div className="ec-category-word-grid mt-8">
            {liveCategories.map((category, index) => (
              <Link
                key={category}
                href={"/shop?category=" + encodeURIComponent(category)}
                className={`ec-category-word ec-category-word--${index % 5} group`}
              >
                <span className="ec-category-word__index">COLLECTION / {String(index + 1).padStart(2, "0")}</span>
                <span className="ec-category-word__name">{category}</span>
                <span className="ec-category-word__description">{categoryDescription(category)}</span>
                <span className="ec-category-word__action">Explore collection <ArrowRight size={14} /></span>
              </Link>
            ))}
            {comingSoonCategories
              .filter(item => !liveCategories.some(category => category.toLowerCase().includes(item.name.split(" ")[0].toLowerCase())))
              .slice(0, Math.max(0, 5 - liveCategories.length))
              .map((item, index) => (
                <div key={item.name} className={`ec-category-word ec-category-word--${(liveCategories.length + index) % 5} ec-category-word--coming`}>
                  <span className="ec-category-word__index">COMING SOON</span>
                  <span className="ec-category-word__name">{item.name}</span>
                  <span className="ec-category-word__description">{item.description}</span>
                </div>
              ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-5">
          <div className="ec-section-intro flex items-end justify-between gap-4">
            <div><p className="ec-kicker">Customer favourites</p><h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Best sellers & featured</h2><p className="mt-2 text-sm text-[#748277]">Discover the products currently available in our store.</p></div>
            <Link href="/shop" className="hidden items-center gap-2 text-xs font-extrabold text-[#087f5b] sm:inline-flex">Shop all <ArrowRight size={14} /></Link>
          </div>
          {featured.length ? <div className="mt-6"><ProductCatalog products={catalog(featured)} /></div> : <div className="ec-home-empty mt-6"><ShoppingBasket size={25} /><strong>Our first collection is taking shape.</strong><span>New products will appear here as they are added to the shop.</span><Link href="/shop">Visit the shop <ArrowRight size={14} /></Link></div>}
        </div>
      </section>

      <section className="ec-offer-section py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-5">
          <div className="ec-offer-banner relative overflow-hidden rounded-[1.8rem] p-6 sm:p-9">
            <div className="relative z-10 grid items-center gap-6 md:grid-cols-[1fr_auto]">
              <div><p className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[.2em]"><BadgePercent size={15} /> Special offers</p><h2 className="mt-3 max-w-2xl text-3xl font-black leading-tight sm:text-4xl">Good choices. Great finds.</h2><p className="mt-3 max-w-xl text-sm leading-6">Keep an eye on this space for active discounts, new deals and seasonal offers from eCuisine.</p></div>
              <Link href="/shop" className="ec-offer-cta inline-flex w-fit items-center gap-3 rounded-xl px-6 py-3.5 text-xs font-extrabold shadow-lg">See current offers <ArrowRight size={15} /></Link>
            </div>
            <span className="ec-offer-decoration absolute -right-8 -top-12 h-64 w-64 rounded-full border-[35px]" />
          </div>
        </div>
      </section>

      <section className="bg-[#fff] py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-5">
          <div className="ec-section-intro flex items-end justify-between gap-4">
            <div><p className="ec-kicker">Fresh from the catalogue</p><h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">New arrivals</h2><p className="mt-2 text-sm text-[#748277]">See what's new at eCuisine.</p></div>
            <Link href="/shop" className="hidden items-center gap-2 text-xs font-extrabold text-[#087f5b] sm:inline-flex">Explore all <ArrowRight size={14} /></Link>
          </div>
          {latest.length ? <div className="mt-6"><ProductCatalog products={catalog(latest)} /></div> : <div className="ec-home-empty mt-6"><Sparkles size={25} /><strong>New products are on the way.</strong><span>We'll show new arrivals here as soon as they are available.</span></div>}
        </div>
      </section>

      <section className="ec-discount-section py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-5">
          <div className="ec-section-intro flex items-end justify-between gap-4">
            <div><p className="ec-kicker">Worth a closer look</p><h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Special offers & discounts</h2></div>
            <Link href="/shop" className="hidden items-center gap-2 text-xs font-extrabold text-[#087f5b] sm:inline-flex">Shop deals <ArrowRight size={14} /></Link>
          </div>
          {discounted.length ? <div className="mt-6"><ProductCatalog products={catalog(discounted)} /></div> : <div className="ec-home-empty mt-6"><BadgePercent size={25} /><strong>There are no product markdowns right now.</strong><span>Check back for special prices and limited-time deals.</span></div>}
        </div>
      </section>

      <section className="ec-why-section py-14 sm:py-20">
        <div className="mx-auto grid max-w-7xl gap-9 px-5 md:grid-cols-[.95fr_1.05fr] md:items-center">
          <div><p className="ec-kicker">Why eCuisine</p><h2 className="mt-3 text-3xl font-black leading-tight tracking-tight sm:text-4xl">{config.promise_title}</h2><p className="mt-4 max-w-xl text-sm leading-7 text-[#68786c]">{config.promise_description}</p><Link href="/about" className="ec-primary-cta mt-6 inline-flex items-center gap-2 rounded-xl px-5 py-3 text-xs font-extrabold">Our vision & story <ArrowRight size={15} /></Link></div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: CheckCircle2, title: "Thoughtful choices", detail: "We put care into the products we bring to the store." },
              { icon: ShieldCheck, title: "Clear information", detail: "Prices, pack sizes and availability are shown before checkout." },
              { icon: Truck, title: "Local convenience", detail: "Choose a pickup point in Jos or Bauchi." },
              { icon: Headphones, title: "Human support", detail: "Our team is reachable when you need help." }
            ].map(item => <article key={item.title} className="ec-why-card rounded-2xl border bg-white p-4 sm:p-5"><span className="ec-why-icon grid h-10 w-10 place-items-center rounded-xl"><item.icon size={19} /></span><h3 className="mt-4 text-xs font-extrabold sm:text-sm">{item.title}</h3><p className="mt-2 text-[10px] leading-5 text-[#7d897f] sm:text-xs">{item.detail}</p></article>)}
          </div>
        </div>
      </section>

      <section className="bg-white py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-5">
          <div className="ec-review-promo flex flex-col gap-5 rounded-[1.7rem] border p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
            <div><p className="ec-kicker">From our community</p><h2 className="mt-2 text-2xl font-black sm:text-3xl">Your experience matters.</h2><p className="mt-2 max-w-xl text-sm leading-6 text-[#748277]">Read customer feedback and share your experience after a completed purchase.</p></div>
            <Link href="/reviews" className="inline-flex w-fit items-center gap-2 rounded-xl bg-[#07543f] px-5 py-3 text-xs font-extrabold text-white">Customer reviews <Star size={14} /></Link>
          </div>
        </div>
      </section>

      <section className="ec-pickup-section py-12 sm:py-16">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 md:grid-cols-[1fr_.9fr] md:items-center">
          <div><p className="ec-kicker">Closer to home</p><h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Pickup in Jos & Bauchi</h2><p className="mt-3 max-w-xl text-sm leading-7 text-[#d6e2d7]">Select your preferred active pickup point at checkout. Please wait for order confirmation before visiting.</p><div className="mt-6 flex flex-wrap gap-2">{locationList.map((location, index) => <span key={location.city + location.location_name + index} className="ec-location-chip rounded-full border px-3 py-2 text-[10px] font-bold">{location.city} · {location.location_name}</span>)}</div></div>
          <div className="ec-pickup-card rounded-[1.7rem] border p-6 sm:p-8"><MapPin size={26} /><h3 className="mt-4 text-xl font-black">Need help choosing a location?</h3><p className="mt-2 text-sm leading-6 text-[#6d7c70]">Our support team can help with pickup, delivery enquiries and order updates.</p><div className="mt-5 flex flex-wrap gap-3"><Link href="/contact" className="rounded-xl bg-[#07543f] px-4 py-3 text-xs font-extrabold text-white">Contact us</Link><a href="https://wa.me/2348080942328" target="_blank" rel="noreferrer" className="rounded-xl border border-[#dbe5d9] px-4 py-3 text-xs font-extrabold text-[#07543f]">WhatsApp support</a></div></div>
        </div>
      </section>

      <footer className="ec-store-footer text-white">
        <div className="mx-auto grid max-w-7xl gap-9 px-5 py-12 sm:grid-cols-2 lg:grid-cols-4">
          <div><p className="text-2xl font-black tracking-tight">eCuisine</p><p className="mt-2 text-xs font-bold text-[#f5ca4e]">Good food, better living.</p><p className="mt-4 max-w-xs text-xs leading-6 text-[#c5d5c8]">Thoughtful food choices, made with purpose and care.</p><a href="https://wa.me/2348080942328" target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-[#f5ca4e]">WhatsApp: +234 808 094 2328 <ArrowRight size={13} /></a></div>
          <div><h3 className="text-xs font-black uppercase tracking-widest">Shop & explore</h3><div className="mt-4 flex flex-col gap-3 text-xs text-[#c5d5c8]"><Link href="/shop">Shop all products</Link><Link href="/cart">Shopping cart</Link><Link href="/checkout">Checkout</Link><Link href="/about">Our story & vision</Link><Link href="/partnerships">Partnership opportunities</Link></div></div>
          <div><h3 className="text-xs font-black uppercase tracking-widest">Customer care</h3><div className="mt-4 flex flex-col gap-3 text-xs text-[#c5d5c8]"><Link href="/track">Track an order</Link><Link href="/faq">FAQs</Link><Link href="/reviews">Customer reviews</Link><Link href="/contact">Contact us</Link></div></div>
          <div><h3 className="text-xs font-black uppercase tracking-widest">Follow the journey</h3><div className="mt-4 flex flex-col gap-3 text-xs text-[#c5d5c8]">{[
            { url: config.social_facebook, label: "Facebook" }, { url: config.social_instagram, label: "Instagram" },
            { url: config.social_tiktok, label: "TikTok" }, { url: config.social_x, label: "X" },
            { url: config.social_youtube, label: "YouTube" }, { url: config.social_whatsapp, label: "WhatsApp" }
          ].filter(item => item.url?.trim()).map(item => <a key={item.label} href={item.url} target="_blank" rel="noreferrer">{item.label}</a>)}</div></div>
        </div>
        <div className="border-t border-white/10 px-5 py-5 text-center text-[10px] text-[#a9bcad]">© {new Date().getFullYear()} eCuisine. All rights reserved.</div>
      </footer>
    </main>
  );
}
