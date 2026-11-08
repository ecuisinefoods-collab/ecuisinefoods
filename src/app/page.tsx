import Link from "next/link";
import { ArrowRight, BadgePercent, CheckCircle2, ChevronRight, Clock3, Heart, Leaf, MapPin, PackageCheck, ShieldCheck, ShoppingBag, Sprout, Truck, Wheat, Sparkles, Headphones, Star } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { ProductCatalog } from "@/components/product-catalog";
import { PromoCarousel } from "@/components/promo-carousel";
import { SiteHeader } from "@/components/site-header";

type Product = { id: string; name: string; slug: string; category: string; description: string | null; image_url: string | null; is_featured: boolean; product_variants?: { id: string; pack_size: string; price: number; stock_quantity: number }[] };

const comingSoon = [
  { name: "Wholesome Grains", category: "Grains & pantry", note: "More everyday staples are on the way", icon: Wheat, tint: "from-amber-100 to-orange-50", mark: "🌾" },
  { name: "Natural Flour", category: "Kitchen essentials", note: "A new pantry favourite is coming", icon: Sprout, tint: "from-lime-100 to-emerald-50", mark: "🌿" },
  { name: "More Goodness", category: "New arrivals", note: "We are growing our food range", icon: Leaf, tint: "from-violet-100 to-fuchsia-50", mark: "✨" },
  { name: "Family Food Packs", category: "Coming soon", note: "Stay close for product updates", icon: PackageCheck, tint: "from-sky-100 to-cyan-50", mark: "🥣" },
];

export default async function HomePage() {
  let products: Product[] = [];
  let pickupLocations: { city: string; location_name: string }[] = [];
  if (supabase) {
    const { data } = await supabase.from("products").select("id,name,slug,category,description,image_url,is_featured,product_variants(id,pack_size,price,stock_quantity)").eq("is_active", true).order("is_featured", { ascending: false }).limit(8);
    products = (data ?? []) as Product[];
    const { data: pickupData } = await supabase.from("pickup_locations").select("city,location_name").eq("is_active", true).order("city").order("location_name");
    pickupLocations = pickupData ?? [];
  }
  const featured = products.slice(0, 4);

  return (
    <main className="overflow-hidden bg-white text-[#26352b]">
      <div className="bg-[#173e2d] px-4 py-2 text-center text-[11px] font-semibold tracking-wide text-white sm:text-xs">Fresh from eCuisinefoods · Good food, better living</div>
      <SiteHeader />

      <section className="hero-motion relative overflow-hidden bg-[#f7f3e9]">
        <div className="absolute -right-20 -top-24 h-80 w-80 rounded-full bg-[#e7d8b8]/60 blur-3xl" />
        <div className="mx-auto grid max-w-7xl items-center gap-8 px-5 py-12 sm:py-16 md:grid-cols-[1fr_1fr] md:py-20">
          <div className="relative z-10 max-w-xl">
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#d8e1d2] bg-white/80 px-4 py-2 text-xs font-bold text-[#326348]"><Leaf size={15}/> Fresh picks. Better living.</p>
            <h1 className="text-[2.65rem] font-semibold leading-[1.05] tracking-[-.045em] text-[#173e2d] sm:text-6xl">Nourish your day.<br/><span className="text-[#8a744b]">Live a little better.</span></h1>
            <p className="mt-6 max-w-lg text-base leading-7 text-[#657064] sm:text-lg">Discover thoughtful food choices from eCuisinefoods. We are bringing wholesome everyday goodness closer to homes in Jos, Bauchi and beyond.</p>
            <div className="mt-8 flex flex-wrap gap-3"><Link href="#shop" className="inline-flex items-center gap-3 rounded-full bg-[#245b42] px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#245b42]/15 transition hover:-translate-y-0.5 hover:bg-[#173e2d]">Shop our products <ArrowRight size={16}/></Link><Link href="/about" className="rounded-full border border-[#cbd5c5] bg-white/70 px-6 py-3.5 text-sm font-bold text-[#315b43] hover:bg-white">Our story</Link></div>
            <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-[#68776a]"><span className="inline-flex items-center gap-2"><ShieldCheck size={15}/> Quality-minded</span><span className="inline-flex items-center gap-2"><Sprout size={15}/> Made with purpose</span></div>
          </div>
          <div className="relative mx-auto w-full max-w-[570px]">
            <div className="absolute inset-8 rounded-full bg-[#d9e2d0] blur-3xl"/>
            <div className="relative flex min-h-[340px] items-center justify-center overflow-hidden rounded-[2rem] border border-white/70 bg-gradient-to-br from-[#e6eadb] via-[#f5ead7] to-[#e7d6b9] p-6 sm:min-h-[430px]">
              <div className="absolute left-7 top-8 h-20 w-20 rounded-full border border-white/60 bg-white/30"/>
              <div className="absolute bottom-0 right-0 h-44 w-44 rounded-full bg-[#b8c9a9]/40 blur-2xl"/>
              <div className="relative flex h-[260px] w-[220px] -rotate-3 flex-col items-center justify-center rounded-[1.6rem] border border-[#e2d3b2] bg-gradient-to-br from-[#fffdf6] via-[#f4e9cf] to-[#e7d5ad] shadow-[0_25px_55px_rgba(66,62,38,.2)] sm:h-[320px] sm:w-[265px]">
                <div className="absolute left-0 top-8 h-2 w-full bg-[#245b42]"/><div className="absolute bottom-8 h-2 w-full bg-[#245b42]"/>
                <div className="mb-3 grid h-14 w-14 place-items-center rounded-full bg-[#245b42] text-2xl font-bold text-white shadow-md">e</div>
                <p className="text-[10px] font-bold uppercase tracking-[.24em] text-[#245b42]">eCuisinefoods</p>
                <p className="mt-3 text-center text-3xl font-semibold tracking-tight text-[#654a2d]">Tom Brown</p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-[.18em] text-[#88704b]">Multigrain cereal</p>
                <div className="mt-5 flex gap-2">{[0,1,2,3,4,5].map(n=><span key={n} className="h-2 w-2 rounded-full bg-[#b18a4d]"/>)}</div>
                <p className="mt-4 text-[9px] font-bold uppercase tracking-[.2em] text-[#7a684c]">Good food, better living</p>
              </div>
              <div className="absolute bottom-5 left-4 rounded-2xl border border-white/80 bg-white/90 px-4 py-3 shadow-lg sm:left-7"><p className="text-[9px] font-bold uppercase tracking-[.16em] text-[#849080]">Meet our first product</p><p className="mt-1 text-sm font-bold text-[#245b42]">Multigrain Tom Brown</p></div>
              <div className="absolute right-4 top-5 rounded-2xl bg-[#245b42] px-4 py-3 text-white shadow-lg sm:right-7"><Sparkles size={17}/><p className="mt-1 text-[10px] font-bold">Made with purpose</p></div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl grid-cols-2 gap-3 px-5 py-6 sm:grid-cols-4 sm:py-8">
        {[{icon:Truck,title:"Local pickup",sub:"Jos & Bauchi"},{icon:ShieldCheck,title:"Quality first",sub:"Care in every choice"},{icon:PackageCheck,title:"Order with ease",sub:"Simple shopping"},{icon:Headphones,title:"We're here to help",sub:"Friendly support"}].map(x=><div key={x.title} className="flex items-center gap-3 rounded-2xl border border-[#edf0e9] bg-white p-3 sm:p-4"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#edf3e9] text-[#245b42]"><x.icon size={19}/></div><div><p className="text-xs font-extrabold text-[#304436] sm:text-sm">{x.title}</p><p className="mt-1 text-[10px] text-[#899287] sm:text-xs">{x.sub}</p></div></div>)}
      </section>

      <PromoCarousel />

      <section id="shop" className="bg-[#fbfaf7] py-14 sm:py-16">
        <div className="mx-auto max-w-7xl px-5">
          <div className="mb-7 flex items-end justify-between gap-4"><div><p className="text-[10px] font-extrabold uppercase tracking-[.2em] text-[#8a987e]">Carefully selected</p><h2 className="mt-2 text-3xl font-semibold tracking-tight text-[#173e2d] sm:text-4xl">Our featured pick <Heart className="inline text-[#c77c70]" size={23}/></h2><p className="mt-2 text-sm text-[#788276]">Start with a little everyday goodness.</p></div><Link href="/shop" className="hidden items-center gap-1 text-xs font-bold text-[#315b43] sm:inline-flex">View shop <ChevronRight size={15}/></Link></div>
          {featured.length ? <ProductCatalog products={featured as unknown as Parameters<typeof ProductCatalog>[0]["products"]}/> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><article className="overflow-hidden rounded-2xl border border-[#e9e8df] bg-white shadow-sm"><div className="flex aspect-[4/3] items-center justify-center bg-gradient-to-br from-[#e8eadb] to-[#f5e8d0]"><div className="flex h-40 w-32 flex-col items-center justify-center rounded-2xl border border-[#e2d3b2] bg-[#fff9eb] shadow-xl"><span className="grid h-10 w-10 place-items-center rounded-full bg-[#245b42] text-lg font-bold text-white">e</span><span className="mt-3 text-[9px] font-bold uppercase tracking-widest text-[#245b42]">eCuisinefoods</span><span className="mt-2 text-xl font-semibold text-[#654a2d]">Tom Brown</span><span className="mt-1 text-[8px] uppercase tracking-widest text-[#88704b]">Multigrain cereal</span></div></div><div className="p-4"><p className="text-[9px] font-bold uppercase tracking-widest text-[#899482]">Our first product</p><h3 className="mt-1 font-bold text-[#243c2e]">Multigrain Tom Brown</h3><p className="mt-2 text-xs text-[#7e887c]">Product details and pack options will be available here.</p><Link href="/contact" className="mt-4 inline-flex rounded-full bg-[#245b42] px-4 py-2 text-xs font-bold text-white">Ask us about it</Link></div></article>{comingSoon.slice(0,3).map(item=><article key={item.name} className="overflow-hidden rounded-2xl border border-[#e9e8df] bg-white shadow-sm"><div className={`flex aspect-[4/3] items-center justify-center bg-gradient-to-br ${item.tint}`}><div className="text-center"><span className="text-5xl">{item.mark}</span><p className="mt-3 text-[9px] font-extrabold uppercase tracking-[.18em] text-[#627362]">eCuisinefoods</p></div></div><div className="p-4"><p className="text-[9px] font-bold uppercase tracking-widest text-[#899482]">{item.category}</p><h3 className="mt-1 font-bold text-[#243c2e]">{item.name}</h3><p className="mt-2 text-xs text-[#7e887c]">{item.note}</p><span className="mt-4 inline-flex rounded-full bg-[#f1f3ed] px-3 py-2 text-[10px] font-bold text-[#6d796a]">Coming soon</span></div></article>)}</div>}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-14">
        <div className="text-center"><p className="text-[10px] font-extrabold uppercase tracking-[.2em] text-[#8a987e]">Explore eCuisinefoods</p><h2 className="mt-2 text-3xl font-semibold tracking-tight text-[#173e2d]">Shop by category</h2></div>
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">{[{name:"Tom Brown & cereal",icon:"🥣",color:"bg-[#f5ead7]"},{name:"Grains & flour",icon:"🌾",color:"bg-[#e9eedf]"},{name:"Pantry essentials",icon:"🫙",color:"bg-[#f4e7e5]"},{name:"New arrivals",icon:"✨",color:"bg-[#e7edf4]"}].map(c=><Link href="/shop" key={c.name} className="group flex items-center gap-3 rounded-2xl border border-[#edf0e9] bg-white p-4 transition hover:-translate-y-1 hover:shadow-md"><span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-2xl ${c.color}`}>{c.icon}</span><span className="text-xs font-bold text-[#3c5141] sm:text-sm">{c.name}</span><ArrowRight className="ml-auto text-[#91a08d] transition group-hover:translate-x-1" size={15}/></Link>)}</div>
      </section>

      <section className="bg-[#f6f4ed] py-14">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 md:grid-cols-[.85fr_1.15fr] md:items-center">
          <div><p className="text-[10px] font-extrabold uppercase tracking-[.2em] text-[#8a987e]">The eCuisinefoods promise</p><h2 className="mt-3 text-3xl font-semibold leading-tight tracking-tight text-[#173e2d] sm:text-4xl">Good food is where better living begins.</h2><p className="mt-4 max-w-md text-sm leading-6 text-[#6e796e]">We are building a food brand grounded in quality, nutrition, trust, innovation and natural ingredients. Thank you for being part of our journey.</p><Link href="/about" className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#245b42] px-5 py-3 text-xs font-bold text-white">Get to know us <ArrowRight size={15}/></Link></div>
          <div className="rounded-[1.7rem] border border-white bg-white p-6 shadow-sm sm:p-8"><div className="flex items-center gap-1 text-[#d39d36]">{[0,1,2,3,4].map(i=><Star key={i} size={16} fill="currentColor"/>)}</div><p className="mt-4 text-xl font-semibold leading-8 text-[#294332] sm:text-2xl">“We believe every family deserves thoughtful food choices and a brand they can trust.”</p><p className="mt-4 text-xs font-bold uppercase tracking-widest text-[#82907f]">The eCuisinefoods vision</p><div className="mt-6 flex flex-wrap gap-2"><span className="rounded-full bg-[#edf3e9] px-3 py-2 text-[10px] font-bold text-[#42654a]">Quality</span><span className="rounded-full bg-[#f5eee0] px-3 py-2 text-[10px] font-bold text-[#876b3c]">Nutrition</span><span className="rounded-full bg-[#f3e9e7] px-3 py-2 text-[10px] font-bold text-[#95685e]">Trust</span><span className="rounded-full bg-[#e9eef4] px-3 py-2 text-[10px] font-bold text-[#536d8a]">Innovation</span><span className="rounded-full bg-[#edf3e9] px-3 py-2 text-[10px] font-bold text-[#42654a]">Natural ingredients</span></div></div>
        </div>
      </section>

      <section className="bg-[#173e2d] py-10 text-white"><div className="mx-auto grid max-w-7xl gap-5 px-5 sm:grid-cols-2 sm:items-center"><div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#bfd0b7]">Find us close to home</p><h2 className="mt-2 text-2xl font-semibold">Pickup in Jos & Bauchi</h2><p className="mt-2 text-sm text-[#d0ddd0]">Choose an available pickup point when placing your order.</p><div className="mt-4 flex flex-wrap gap-2">{(pickupLocations.length?pickupLocations:[{city:"Jos",location_name:"Terminus"},{city:"Jos",location_name:"Faringada"},{city:"Jos",location_name:"Lamingo"},{city:"Bauchi",location_name:"Yelwa"},{city:"Bauchi",location_name:"Old G-R-A"}]).map((l,i)=><span key={i} className="rounded-full border border-white/20 bg-white/10 px-3 py-2 text-[10px] font-semibold">{l.city} · {l.location_name}</span>)}</div></div><div className="flex flex-col gap-3 sm:items-end"><Link href="/contact" className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-xs font-bold text-[#173e2d]">Contact our team <ArrowRight size={15}/></Link><p className="text-[10px] text-[#cbd8ca]"><MapPin className="mr-1 inline" size={12}/> Jos, Bauchi and beyond</p></div></div></section>

      <footer className="bg-[#102d21] text-white"><div className="mx-auto grid max-w-7xl gap-8 px-5 py-10 sm:grid-cols-2 lg:grid-cols-4"><div><p className="text-xl font-bold">eCuisinefoods</p><p className="mt-2 text-xs text-[#c4d1c3]">Good food, better living.</p><p className="mt-4 max-w-xs text-xs leading-6 text-[#aebfae]">Thoughtful food choices, made with purpose and care.</p></div><div><h3 className="text-xs font-extrabold uppercase tracking-widest">Explore</h3><div className="mt-4 flex flex-col gap-3 text-xs text-[#c4d1c3]"><Link href="/shop">Shop products</Link><Link href="/about">Our story</Link><Link href="/faq">FAQs</Link></div></div><div><h3 className="text-xs font-extrabold uppercase tracking-widest">Customer care</h3><div className="mt-4 flex flex-col gap-3 text-xs text-[#c4d1c3]"><Link href="/contact">Contact us</Link><Link href="/cart">Your cart</Link><Link href="/checkout">Checkout</Link></div></div><div><h3 className="text-xs font-extrabold uppercase tracking-widest">Our locations</h3><p className="mt-4 text-xs leading-6 text-[#c4d1c3]">Pickup points in Jos and Bauchi, Nigeria.</p><p className="mt-3 inline-flex items-center gap-2 text-xs text-[#d5e1d3]"><Clock3 size={13}/> Good food, better living</p></div></div><div className="border-t border-white/10 px-5 py-5 text-center text-[10px] text-[#9fb19f]">© {new Date().getFullYear()} eCuisinefoods. All rights reserved.</div></footer>
    </main>
  );
}
