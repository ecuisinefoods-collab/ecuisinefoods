import Link from "next/link";
import { ArrowLeft, Leaf } from "lucide-react";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { SiteHeader } from "@/components/site-header";
import { ProductPurchasePanel } from "@/components/product-purchase-panel";

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!supabase) notFound();
  const { data: product } = await supabase.from("products").select("id,name,slug,category,description,ingredients,nutrition_info,image_url,product_variants(id,pack_size,price,stock_quantity)").eq("slug", slug).eq("is_active", true).maybeSingle();
  if (!product) notFound();
  const variants = (product.product_variants ?? []) as { id: string; pack_size: string; price: number; stock_quantity: number }[];
  return <main className="min-h-screen bg-[#fbfaf7]">
    <div className="bg-[#173e2d] px-4 py-2 text-center text-xs font-semibold text-white">Good food, better living · Thoughtful food choices</div>
    <SiteHeader />
    <section className="mx-auto max-w-6xl px-5 py-8 sm:py-12">
      <Link href="/shop" className="inline-flex items-center gap-2 text-sm font-semibold text-[#245b42]"><ArrowLeft size={15}/> Back to shop</Link>
      <div className="mt-6 grid gap-8 rounded-3xl border border-[#e8e9e1] bg-white p-5 shadow-sm sm:p-8 md:grid-cols-2">
        <div className="flex aspect-square items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-[#e8eadb] to-[#f5e8d0] p-6">{product.image_url ? <img src={product.image_url} alt={product.name} className="h-full w-full object-contain"/> : <div className="text-center"><span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#245b42] text-white"><Leaf size={28}/></span><p className="mt-3 text-xs font-bold uppercase tracking-widest text-[#6e8167]">eCuisinefoods</p><p className="mt-2 text-3xl font-semibold text-[#654a2d]">{product.name}</p><p className="mt-2 text-xs font-semibold uppercase tracking-widest text-[#88704b]">Product image coming soon</p></div>}</div>
        <div className="py-2">
          <p className="text-xs font-bold uppercase tracking-[.18em] text-[#78906b]">{product.category}</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#173e2d] sm:text-4xl">{product.name}</h1>
          <p className="mt-5 whitespace-pre-line leading-7 text-[#68766b]">{product.description || "Product details will be updated soon."}</p>
          {product.ingredients && <section className="mt-6"><h2 className="font-bold text-[#203329]">Ingredients</h2><p className="mt-2 text-sm leading-6 text-[#68766b]">{product.ingredients}</p></section>}
          {product.nutrition_info && <section className="mt-6"><h2 className="font-bold text-[#203329]">Nutrition information</h2><pre className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#68766b]">{JSON.stringify(product.nutrition_info,null,2)}</pre></section>}
          <ProductPurchasePanel productId={product.id} productName={product.name} variants={variants}/>

        </div>
      </div>
    </section>
  </main>;
}
