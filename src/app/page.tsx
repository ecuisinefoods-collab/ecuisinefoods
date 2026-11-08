import Link from "next/link";
import { ArrowRight, Leaf, ShieldCheck, ShoppingBag, Sprout, Truck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { ProductCatalog } from "@/components/product-catalog";

type Product = { id: string; name: string; slug: string; category: string; description: string | null; image_url: string | null; is_featured: boolean; variants?: { id: string; pack_size: string; price: number; stock_quantity: number }[] };


export default async function HomePage() {
  let products: Product[] = [];
  if (supabase) {
    const { data } = await supabase.from("products").select("id,name,slug,category,description,image_url,is_featured,product_variants(id,pack_size,price,stock_quantity)").eq("is_active", true).order("is_featured", { ascending: false }).limit(4);
    products = (data ?? []) as Product[];
  }

  return (
    <main>
      <div className="bg-[#173e2d] px-4 py-2 text-center text-xs font-medium tracking-wide text-white sm:text-sm">
        Nourishing choices for everyday living · Welcome to eCuisinefoods
      </div>
      <header className="sticky top-0 z-20 border-b border-[#e7e8df] bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <Link href="/" className="flex items-center gap-2" aria-label="eCuisinefoods home">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#245b42] text-lg font-bold text-white">e</span>
            <span><span className="block text-lg font-bold tracking-tight text-[#173e2d]">Cuisinefoods</span><span className="block text-[10px] font-semibold uppercase tracking-[.19em] text-[#7b8276]">Good food, better living</span></span>
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-semibold text-[#435348] md:flex">
            <Link href="#shop" className="hover:text-[#245b42]">Shop</Link><Link href="#story" className="hover:text-[#245b42]">Our story</Link><Link href="#pickup" className="hover:text-[#245b42]">Pickup locations</Link>
          </nav>
          <Link href="#shop" className="flex items-center gap-2 rounded-full bg-[#245b42] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#173e2d]"><ShoppingBag size={16}/> Shop <span className="hidden sm:inline">products</span></Link>
        </div>
      </header>

      <section className="overflow-hidden bg-[#f7f4ec]">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-14 md:grid-cols-[1.05fr_.95fr] md:py-20">
          <div className="max-w-2xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#d7dfd1] bg-white/70 px-3 py-1.5 text-xs font-bold uppercase tracking-[.14em] text-[#245b42]"><Leaf size={14}/> Food you can feel good about</div>
            <h1 className="text-4xl font-semibold leading-[1.08] tracking-[-.04em] text-[#173e2d] sm:text-5xl lg:text-6xl">Good food.<br/><span className="text-[#6b8a56]">Better living.</span></h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-[#59675b] sm:text-lg">Everyday nourishment, thoughtfully made. Discover wholesome food products from eCuisinefoods, created with quality, nutrition and trust at heart.</p>
            <div className="mt-8 flex flex-wrap gap-3"><Link href="#shop" className="inline-flex items-center gap-2 rounded-full bg-[#245b42] px-6 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#173e2d]">Explore our products <ArrowRight size={16}/></Link><Link href="#story" className="rounded-full border border-[#cbd5c5] bg-white/70 px-6 py-3.5 text-sm font-bold text-[#245b42] transition hover:bg-white">Our story</Link></div>
            <div className="mt-9 flex flex-wrap gap-x-6 gap-y-3 text-xs font-semibold text-[#657266]"><span className="flex items-center gap-2"><ShieldCheck size={15}/> Quality minded</span><span className="flex items-center gap-2"><Sprout size={15}/> Thoughtful ingredients</span></div>
          </div>
          <div className="relative mx-auto w-full max-w-[560px]">
            <div className="absolute -right-10 -top-10 h-44 w-44 rounded-full bg-[#e6d9c4] blur-2xl"/>
            <div className="absolute -bottom-12 -left-8 h-48 w-48 rounded-full bg-[#cddbc5] blur-2xl"/>
            <div className="relative flex min-h-[330px] items-center justify-center overflow-hidden rounded-[2rem] bg-[#e8e5d8] p-8 sm:min-h-[440px]">
              <div className="absolute inset-0 opacity-30" style={{backgroundImage:"radial-gradient(#a2a78d 1px, transparent 1px)",backgroundSize:"19px 19px"}}/>
              <div className="relative flex h-[260px] w-[220px] flex-col items-center justify-center rounded-[1.4rem] border border-[#e4d6b6] bg-gradient-to-br from-[#fffdf4] via-[#f4e8ca] to-[#e5d1a5] shadow-[0_25px_55px_rgba(66,62,38,.18)] sm:h-[320px] sm:w-[260px]">
                <div className="absolute left-0 top-8 h-2 w-full bg-[#245b42]"/>
                <div className="absolute bottom-8 h-2 w-full bg-[#245b42]"/>
                <div className="mb-3 grid h-12 w-12 place-items-center rounded-full bg-[#245b42] text-xl font-bold text-white">e</div>
                <p className="text-xs font-bold uppercase tracking-[.22em] text-[#245b42]">eCuisinefoods</p>
                <p className="mt-3 text-center text-3xl font-semibold tracking-tight text-[#654a2d]">Tom Brown</p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-[.16em] text-[#88704b]">Multigrain cereal</p>
                <div className="mt-5 flex gap-2">{[0,1,2,3,4,5,6].map((n)=><span key={n} className="h-2 w-2 rounded-full bg-[#b18a4d]"/>)}</div>
                <p className="mt-4 text-[10px] font-bold uppercase tracking-[.2em] text-[#7a684c]">Good food, better living</p>
              </div>
              <div className="absolute bottom-5 left-5 rounded-2xl border border-white/70 bg-white/85 px-4 py-3 shadow-sm backdrop-blur"><p className="text-[10px] font-bold uppercase tracking-[.15em] text-[#7a8579]">Our first featured product</p><p className="mt-1 text-sm font-bold text-[#245b42]">Multigrain Tom Brown</p></div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-12 sm:py-16">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[{icon:<Leaf size={20}/>,title:"Thoughtful food",text:"A focus on wholesome everyday choices."},{icon:<ShieldCheck size={20}/>,title:"Quality & trust",text:"Care and consistency in what we make."},{icon:<Truck size={20}/>,title:"Local pickup",text:"Pickup points in Jos and Bauchi."}].map((item)=><div key={item.title} className="flex gap-4 rounded-2xl border border-[#e9ebe4] bg-white p-5"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#edf3e9] text-[#245b42]">{item.icon}</div><div><h2 className="font-bold text-[#203329]">{item.title}</h2><p className="mt-1 text-sm leading-5 text-[#738075]">{item.text}</p></div></div>)}
        </div>
      </section>

      <section id="shop" className="bg-[#fbfaf7] py-14 sm:py-20">
        <div className="mx-auto max-w-7xl px-5">
          <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#78906b]">Shop eCuisinefoods</p><h2 className="mt-2 text-3xl font-semibold tracking-tight text-[#173e2d] sm:text-4xl">Find your everyday goodness</h2></div><span className="text-sm text-[#7b857a]">Explore our food range</span></div>
          <ProductCatalog products={products as unknown as Parameters<typeof ProductCatalog>[0]["products"]} />
          <div className="mt-9 text-center"><p className="text-sm text-[#7b857a]">More products will be available as we expand our range.</p></div>
        </div>
      </section>

      <section id="story" className="mx-auto grid max-w-7xl gap-8 px-5 py-14 sm:grid-cols-2 sm:py-20">
        <div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#78906b]">A little about us</p><h2 className="mt-3 text-3xl font-semibold leading-tight tracking-tight text-[#173e2d]">Food made with purpose.<br/>Trust built every day.</h2></div>
        <div><p className="text-base leading-7 text-[#68766b]">At eCuisinefoods, we believe good food can make everyday living better. Our name stands for efficacy—the ability to produce a desired effect—and reflects our commitment to useful, quality-minded food products.</p><p className="mt-4 text-base leading-7 text-[#68766b]">We are growing from our roots in Bauchi and Jos with a vision to bring nourishing food choices to more communities.</p><Link href="#pickup" className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-[#245b42]">Find a pickup location <ArrowRight size={15}/></Link></div>
      </section>

      <section id="pickup" className="bg-[#173e2d] py-12 text-white sm:py-16"><div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#b8cbb0]">Pickup in Jos & Bauchi</p><h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Your local eCuisinefoods pickup points</h2><p className="mt-2 text-sm text-[#d0ddd0]">Choose your location during checkout. Please wait for order confirmation before visiting.</p></div><Link href="/contact" className="inline-flex items-center gap-2 self-start rounded-full bg-white px-5 py-3 text-sm font-bold text-[#173e2d] transition hover:bg-[#edf3e9]">Contact us <ArrowRight size={15}/></Link></div></section>

      <footer className="border-t border-[#e7e8df] bg-white"><div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-8 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-bold text-[#173e2d]">eCuisinefoods</p><p className="mt-1 text-xs text-[#879187]">Good food, better living.</p></div><div className="flex flex-wrap gap-5 text-xs font-semibold text-[#69766b]"><Link href="#shop">Shop</Link><Link href="#story">About</Link><Link href="#pickup">Pickup</Link><Link href="/contact">Contact</Link></div><p className="text-xs text-[#9aa39a]">© {new Date().getFullYear()} eCuisinefoods</p></div></footer>
    </main>
  );
}
