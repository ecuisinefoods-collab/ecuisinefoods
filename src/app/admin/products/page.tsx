"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Eye, EyeOff, LoaderCircle, Package, Pencil, Plus, Save, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Variant = { id: string; product_id: string; pack_size: "Small" | "Medium" | "Large" | "Bulk / Wholesale"; price: number; stock_quantity: number };
type Product = { id: string; name: string; slug: string; category: string; description: string | null; ingredients: string | null; image_url: string | null; is_featured: boolean; is_active: boolean; product_variants: Variant[] };
type ProductDraft = { name: string; slug: string; category: string; description: string; ingredients: string; image_url: string; is_featured: boolean; is_active: boolean };
type VariantDraft = { pack_size: Variant["pack_size"]; price: string; stock_quantity: string };
const blankProduct: ProductDraft = { name: "", slug: "", category: "Tom Brown / Cereal", description: "", ingredients: "", image_url: "", is_featured: false, is_active: true };
const blankVariant: VariantDraft = { pack_size: "Small", price: "", stock_quantity: "0" };
const slugify = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const money = (value: number) => "₦" + Number(value || 0).toLocaleString("en-NG");

export default function ProductsAdminPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [draft, setDraft] = useState<ProductDraft>(blankProduct);
  const [variantDraft, setVariantDraft] = useState<VariantDraft>(blankVariant);
  const [editing, setEditing] = useState<string | null>(null);
  const [editingVariant, setEditingVariant] = useState<string | null>(null);
  const [editingVariantProductId, setEditingVariantProductId] = useState<string | null>(null);
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);

  const load = useCallback(async () => {
    if (!supabase) { setError("Database connection is not configured."); setLoading(false); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Please sign in through the admin dashboard."); setLoading(false); return; }
    const { data: profile, error: profileError } = await supabase.from("admin_profiles").select("role,is_active").eq("user_id", user.id).maybeSingle();
    if (profileError || !profile?.is_active || !["owner", "store_manager"].includes(profile.role)) {
      setError("Only the owner or an authorised store manager can manage products."); setLoading(false); return;
    }
    setAuthorized(true);
    const { data, error: queryError } = await supabase.from("products").select("id,name,slug,category,description,ingredients,image_url,is_featured,is_active,product_variants(id,product_id,pack_size,price,stock_quantity)").order("created_at", { ascending: false });
    if (queryError) setError(queryError.message);
    else setProducts((data ?? []) as Product[]);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const startEdit = (product: Product) => {
    setEditing(product.id);
    setDraft({ name: product.name, slug: product.slug, category: product.category, description: product.description ?? "", ingredients: product.ingredients ?? "", image_url: product.image_url ?? "", is_featured: product.is_featured, is_active: product.is_active });
    setMessage(""); setError("");
  };
  const uploadProductImage = async (file?: File) => {
    if (!supabase || !file) return;
    if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) { setError("Choose an image under 5 MB."); return; }
    setUploadingImage(true); setError("");
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `products/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("product-images").upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });
    if (uploadError) setError(uploadError.message);
    else { const { data } = supabase.storage.from("product-images").getPublicUrl(path); setDraft(current => ({ ...current, image_url: data.publicUrl })); setMessage("Image uploaded. Save the product to publish it."); }
    setUploadingImage(false);
  };

  const saveProduct = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase || !authorized) return;
    setSaving(true); setError(""); setMessage("");
    const payload = { name: draft.name.trim(), slug: slugify(draft.slug || draft.name), category: draft.category.trim(), description: draft.description.trim() || null, ingredients: draft.ingredients.trim() || null, image_url: draft.image_url.trim() || null, is_featured: draft.is_featured, is_active: draft.is_active, updated_at: new Date().toISOString() };
    const result = editing
      ? await supabase.from("products").update(payload).eq("id", editing)
      : await supabase.from("products").insert(payload);
    if (result.error) setError(result.error.message);
    else { setMessage(editing ? "Product updated. The storefront will reflect the change." : "Product created. Add its pack sizes and prices below."); setDraft(blankProduct); setEditing(null); await load(); }
    setSaving(false);
  };
  const saveVariant = async (event: FormEvent<HTMLFormElement>, productId: string) => {
    event.preventDefault();
    if (!supabase || !authorized) return;
    const price = Number(variantDraft.price);
    const stock = Number(variantDraft.stock_quantity);
    if (!Number.isFinite(price) || price < 0 || !Number.isInteger(stock) || stock < 0) { setError("Enter a valid price and a whole-number stock quantity (zero or more)."); return; }
    setSaving(true); setError(""); setMessage("");
    const payload = { product_id: productId, pack_size: variantDraft.pack_size, price, stock_quantity: stock };
    const updateVariantId = editingVariantProductId === productId ? editingVariant : null;
    const result = updateVariantId
      ? await supabase.from("product_variants").update({ pack_size: payload.pack_size, price, stock_quantity: stock }).eq("id", updateVariantId)
      : await supabase.from("product_variants").insert(payload);
    if (result.error) setError(result.error.message);
    else { setMessage(editingVariant ? "Pack size, price and stock updated." : "Pack size added."); setVariantDraft(blankVariant); setEditingVariant(null); setEditingVariantProductId(null); await load(); }
    setSaving(false);
  };
  const editVariant = (variant: Variant) => {
    setEditingVariant(variant.id); setEditingVariantProductId(variant.product_id);
    setVariantDraft({ pack_size: variant.pack_size, price: String(variant.price), stock_quantity: String(variant.stock_quantity) });
    setError(""); setMessage("");
  };
  const deleteVariant = async (id: string) => {
    if (!supabase || !window.confirm("Delete this pack size? Existing order records may prevent deletion.")) return;
    const { error: deleteError } = await supabase.from("product_variants").delete().eq("id", id);
    if (deleteError) setError(deleteError.message); else { setMessage("Pack size deleted."); await load(); }
  };
  const toggleProduct = async (product: Product) => {
    if (!supabase) return;
    const { error: updateError } = await supabase.from("products").update({ is_active: !product.is_active, updated_at: new Date().toISOString() }).eq("id", product.id);
    if (updateError) setError(updateError.message); else { setMessage(product.is_active ? "Product paused; it is hidden from the storefront." : "Product published to the storefront."); await load(); }
  };

  if (loading) return <main className="grid min-h-screen place-items-center bg-[#f5f7f3] text-sm text-[#42694b]"><LoaderCircle className="animate-spin"/>Loading product manager…</main>;
  if (!authorized) return <main className="min-h-screen bg-[#f5f7f3] p-8"><div className="mx-auto max-w-lg rounded-2xl bg-white p-7"><h1 className="text-xl font-bold text-[#203b2a]">Product access</h1><p className="mt-3 text-sm text-red-700">{error}</p><Link href="/admin" className="mt-5 inline-flex text-sm font-bold text-[#315b43]">Back to admin</Link></div></main>;

  return <main className="min-h-screen bg-[#f5f7f3] px-4 py-7 text-[#26392c] sm:px-8"><div className="mx-auto max-w-6xl">
    <Link href="/admin" className="inline-flex items-center gap-2 text-xs font-bold text-[#65806a]"><ArrowLeft size={14}/> Admin overview</Link>
    <div className="mt-5 flex flex-wrap items-end justify-between gap-4"><div><p className="text-[10px] font-extrabold uppercase tracking-[.2em] text-[#8b9986]">Store management</p><h1 className="mt-1 text-3xl font-semibold tracking-tight text-[#1c3c29]">Products & stock</h1><p className="mt-2 text-sm text-[#7d897a]">Create products, maintain pack sizes and prices, and control what customers can see.</p></div><span className="rounded-full bg-[#eaf3e8] px-3 py-2 text-xs font-bold text-[#386344]">{products.length} products</span></div>
    {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-3 text-xs text-red-700">{error}</p>}
    {message && <p role="status" className="mt-5 rounded-xl bg-[#eaf3e8] p-3 text-xs text-[#386344]">{message}</p>}
    <div className="mt-7 grid gap-6 lg:grid-cols-[.9fr_1.1fr]">
      <section className="h-fit rounded-2xl border border-[#e5ebe2] bg-white p-5 shadow-sm sm:p-6"><div className="flex items-center justify-between"><h2 className="text-sm font-bold text-[#304735]">{editing ? "Edit product" : "Add a product"}</h2><Package size={18} className="text-[#66806a]"/></div>
        <form onSubmit={saveProduct} className="mt-5 space-y-4">
          <label className="block text-xs font-bold text-[#526352]">Product name<input required maxLength={100} value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value,slug:editing?draft.slug:slugify(e.target.value)})} placeholder="e.g. Multigrain Tom Brown" className="mt-2 w-full rounded-xl border border-[#dfe7dc] bg-[#fbfcfa] px-3 py-3 text-sm outline-none focus:border-[#719477]"/></label>
          <label className="block text-xs font-bold text-[#526352]">URL slug<input required value={draft.slug} onChange={e=>setDraft({...draft,slug:slugify(e.target.value)})} placeholder="multigrain-tom-brown" className="mt-2 w-full rounded-xl border border-[#dfe7dc] bg-[#fbfcfa] px-3 py-3 text-sm outline-none focus:border-[#719477]"/></label>
          <label className="block text-xs font-bold text-[#526352]">Category<input required value={draft.category} onChange={e=>setDraft({...draft,category:e.target.value})} placeholder="Tom Brown / Cereal" className="mt-2 w-full rounded-xl border border-[#dfe7dc] bg-[#fbfcfa] px-3 py-3 text-sm outline-none focus:border-[#719477]"/></label>
          <label className="block text-xs font-bold text-[#526352]">Product description<textarea rows={3} value={draft.description} onChange={e=>setDraft({...draft,description:e.target.value})} placeholder="Add accurate product information for customers." className="mt-2 w-full rounded-xl border border-[#dfe7dc] bg-[#fbfcfa] px-3 py-3 text-sm outline-none focus:border-[#719477]"/></label>
          <label className="block text-xs font-bold text-[#526352]">Ingredients (optional)<textarea rows={2} value={draft.ingredients} onChange={e=>setDraft({...draft,ingredients:e.target.value})} placeholder="Enter only confirmed ingredients." className="mt-2 w-full rounded-xl border border-[#dfe7dc] bg-[#fbfcfa] px-3 py-3 text-sm outline-none focus:border-[#719477]"/></label>
          <div className="block text-xs font-bold text-[#526352]">Product image<label className="mt-2 flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-[#b9cbb6] bg-[#f7faf5] px-4 py-4 text-center text-xs font-semibold text-[#42664a]">{uploadingImage ? "Uploading image…" : "Choose product photo (max 5 MB)"}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploadingImage} onChange={e=>void uploadProductImage(e.target.files?.[0])} className="sr-only"/></label>{draft.image_url && <div className="mt-3 flex items-center gap-3"><img src={draft.image_url} alt="Product preview" className="h-20 w-20 rounded-lg bg-white object-contain"/><button type="button" onClick={()=>setDraft({...draft,image_url:""})} className="text-[10px] font-bold text-red-600">Remove image</button></div>}</div>
          <div className="flex flex-wrap gap-5"><label className="flex items-center gap-2 text-xs font-semibold text-[#526352]"><input type="checkbox" checked={draft.is_featured} onChange={e=>setDraft({...draft,is_featured:e.target.checked})}/> Feature on homepage</label><label className="flex items-center gap-2 text-xs font-semibold text-[#526352]"><input type="checkbox" checked={draft.is_active} onChange={e=>setDraft({...draft,is_active:e.target.checked})}/> Published</label></div>
          <div className="flex gap-2"><button disabled={saving} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#245b42] px-4 py-3 text-xs font-bold text-white disabled:opacity-60"><Save size={14}/>{saving ? "Saving…" : editing ? "Save product" : "Create product"}</button>{editing && <button type="button" onClick={()=>{setEditing(null);setDraft(blankProduct)}} className="rounded-xl border border-[#e1e8de] px-4 py-3 text-xs font-bold text-[#657463]">Cancel</button>}</div>
        </form>
      </section>
      <section className="space-y-4"><h2 className="text-sm font-bold text-[#405744]">Product catalogue</h2>
        {!products.length && <div className="rounded-2xl border border-dashed border-[#cbd8c8] bg-white p-9 text-center"><Package className="mx-auto text-[#88a088]" size={30}/><p className="mt-3 text-sm font-bold text-[#405744]">No products yet</p><p className="mt-1 text-xs text-[#8b9688]">Add your first product using the form.</p></div>}
        {products.map(product=><article key={product.id} className="rounded-2xl border border-[#e5ebe2] bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3"><div className="flex min-w-0 items-start gap-3"><div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-[#edf2e9] text-[#4a7652]">{product.image_url?<img src={product.image_url} alt="" className="h-full w-full object-cover"/>:<Package size={20}/>}</div><div className="min-w-0"><h3 className="font-bold text-[#304735]">{product.name}</h3><p className="mt-1 text-xs text-[#8a9687]">{product.category} · /products/{product.slug}</p><div className="mt-2 flex flex-wrap gap-2"><span className={`rounded-full px-2 py-1 text-[9px] font-bold ${product.is_active?"bg-[#e9f3e7] text-[#3b7046]":"bg-[#f1f1ee] text-[#899184]"}`}>{product.is_active?"Published":"Paused"}</span>{product.is_featured&&<span className="rounded-full bg-[#f8f0df] px-2 py-1 text-[9px] font-bold text-[#96723a]">Featured</span>}</div></div></div>
            <div className="flex flex-wrap gap-2"><button onClick={()=>startEdit(product)} className="inline-flex items-center gap-1 rounded-lg bg-[#eef3eb] px-3 py-2 text-[10px] font-bold text-[#42664a]"><Pencil size={12}/> Edit</button><button onClick={()=>void toggleProduct(product)} className="inline-flex items-center gap-1 rounded-lg border border-[#e6ebe3] px-3 py-2 text-[10px] font-bold text-[#697866]">{product.is_active?<EyeOff size={12}/>:<Eye size={12}/>} {product.is_active?"Pause":"Publish"}</button></div>
          </div>
          <div className="mt-4 border-t border-[#edf0eb] pt-4"><div className="mb-3 flex items-center justify-between"><h4 className="text-xs font-bold text-[#405744]">Pack sizes, prices & stock</h4><span className="text-[10px] text-[#899487]">{product.product_variants?.length ?? 0} variants</span></div>
            {product.product_variants?.length ? <div className="space-y-2">{product.product_variants.map(v=><div key={v.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#f8faf6] px-3 py-2"><div><p className="text-xs font-semibold text-[#405044]">{v.pack_size}</p><p className="mt-1 text-[10px] text-[#7b887c]">{money(Number(v.price))} · {v.stock_quantity} in stock</p></div><div className="flex gap-2"><button onClick={()=>editVariant(v)} className="rounded-lg border border-[#e1e8de] px-2.5 py-1.5 text-[10px] font-bold text-[#42664a]">Edit</button><button onClick={()=>void deleteVariant(v.id)} aria-label="Delete pack size" className="rounded-lg border border-[#f0dfdc] p-1.5 text-[#a05f54]"><Trash2 size={12}/></button></div></div>)}</div>:<p className="text-xs text-[#899487]">No pack sizes yet. Add one below to make this product purchasable.</p>}
            <form onSubmit={e=>void saveVariant(e,product.id)} className="mt-3 grid gap-2 rounded-xl border border-dashed border-[#dce5d8] p-3 sm:grid-cols-[1fr_1fr_1fr_auto]"><select value={editingVariant && products.some(p=>p.product_variants.some(v=>v.id===editingVariant))?variantDraft.pack_size:variantDraft.pack_size} onChange={e=>setVariantDraft({...variantDraft,pack_size:e.target.value as VariantDraft["pack_size"]})} className="rounded-lg border border-[#dfe7dc] bg-white px-2 py-2 text-xs"><option>Small</option><option>Medium</option><option>Large</option><option>Bulk / Wholesale</option></select><input required type="number" min="0" step="1" value={variantDraft.price} onChange={e=>setVariantDraft({...variantDraft,price:e.target.value})} placeholder="Price (₦)" className="min-w-0 rounded-lg border border-[#dfe7dc] px-2 py-2 text-xs"/><input required type="number" min="0" step="1" value={variantDraft.stock_quantity} onChange={e=>setVariantDraft({...variantDraft,stock_quantity:e.target.value})} placeholder="Stock qty" className="min-w-0 rounded-lg border border-[#dfe7dc] px-2 py-2 text-xs"/><button disabled={saving} className="inline-flex items-center justify-center gap-1 rounded-lg bg-[#245b42] px-3 py-2 text-[10px] font-bold text-white"><Plus size={12}/>{editingVariantProductId===product.id && editingVariant?"Update":"Add"}</button>{editingVariantProductId===product.id && editingVariant && <button type="button" onClick={()=>{setEditingVariant(null);setEditingVariantProductId(null);setVariantDraft(blankVariant)}} className="text-[10px] font-bold text-[#738071] sm:col-span-4 sm:text-right">Cancel variant edit</button>}</form>
          </div>
        </article>)}
      </section>
    </div>
  </div></main>;
}
