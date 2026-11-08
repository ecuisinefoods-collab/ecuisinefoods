"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, Eye, EyeOff, ImagePlus, LoaderCircle, Plus, Save, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Banner = {
  id: string; title: string; subtitle: string | null; image_url: string | null;
  target_url: string | null; is_active: boolean; sort_order: number;
  starts_at: string | null; ends_at: string | null; animation_effect: "fade" | "slide" | "zoom";
  slide_duration_ms: number; transition_duration_ms: number; show_cta: boolean;
};
type Draft = {
  title: string; subtitle: string; image_url: string; target_url: string;
  animation_effect: "fade" | "slide" | "zoom"; slide_duration_ms: number;
  transition_duration_ms: number; starts_at: string; ends_at: string; show_cta: boolean;
};
const emptyDraft: Draft = {
  title: "", subtitle: "", image_url: "", target_url: "/shop", animation_effect: "fade",
  slide_duration_ms: 5000, transition_duration_ms: 600, starts_at: "", ends_at: "", show_cta: true,
};

export default function PromotionsPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [editing, setEditing] = useState<string | null>(null);
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!supabase) { setError("Database connection is not configured."); setLoading(false); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Sign in through the admin dashboard first."); setLoading(false); return; }
    const { data: profile } = await supabase.from("admin_profiles").select("role,is_active").eq("user_id", user.id).maybeSingle();
    if (!profile?.is_active || !["owner", "marketing_manager"].includes(profile.role)) {
      setError("Your admin role does not have permission to manage promotions."); setLoading(false); return;
    }
    setAuthorized(true);
    const { data, error: queryError } = await supabase.from("promotional_banners").select("*").order("sort_order", { ascending: true });
    if (queryError) setError(queryError.message);
    else setBanners((data ?? []) as Banner[]);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const edit = (banner: Banner) => {
    setEditing(banner.id);
    setDraft({
      title: banner.title, subtitle: banner.subtitle ?? "", image_url: banner.image_url ?? "",
      target_url: banner.target_url ?? "/shop", animation_effect: banner.animation_effect ?? "fade",
      slide_duration_ms: banner.slide_duration_ms ?? 5000,
      transition_duration_ms: banner.transition_duration_ms ?? 600,
      starts_at: banner.starts_at ? new Date(banner.starts_at).toISOString().slice(0,16) : "",
      ends_at: banner.ends_at ? new Date(banner.ends_at).toISOString().slice(0,16) : "",
      show_cta: banner.show_cta ?? true,
    });
    setMessage("");
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase || !authorized) return;
    setSaving(true); setError(""); setMessage("");
    const payload = {
      title: draft.title.trim(), subtitle: draft.subtitle.trim() || null,
      image_url: draft.image_url.trim() || null, target_url: draft.target_url.trim() || "/shop",
      animation_effect: draft.animation_effect, slide_duration_ms: draft.slide_duration_ms,
      transition_duration_ms: draft.transition_duration_ms,
      starts_at: draft.starts_at ? new Date(draft.starts_at).toISOString() : null,
      ends_at: draft.ends_at ? new Date(draft.ends_at).toISOString() : null,
      show_cta: draft.show_cta,
    };
    const result = editing
      ? await supabase.from("promotional_banners").update(payload).eq("id", editing)
      : await supabase.from("promotional_banners").insert({ ...payload, is_active: true, sort_order: banners.length });
    if (result.error) setError(result.error.message);
    else { setMessage(editing ? "Promotion updated." : "Promotion created and enabled."); setDraft(emptyDraft); setEditing(null); await load(); }
    setSaving(false);
  };

  const updateBanner = async (id: string, values: Partial<Banner>) => {
    if (!supabase) return;
    const { error: updateError } = await supabase.from("promotional_banners").update(values).eq("id", id);
    if (updateError) setError(updateError.message); else await load();
  };
  const remove = async (id: string) => {
    if (!supabase || !window.confirm("Delete this promotion? This cannot be undone.")) return;
    const { error: deleteError } = await supabase.from("promotional_banners").delete().eq("id", id);
    if (deleteError) setError(deleteError.message); else { if (editing === id) { setEditing(null); setDraft(emptyDraft); } await load(); }
  };
  const reorder = async (index: number, direction: -1 | 1) => {
    const next = [...banners]; const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    const client = supabase;
    if (!client) return;
    const updates = await Promise.all(next.map((banner, sort_order) => client.from("promotional_banners").update({ sort_order }).eq("id", banner.id)));
    if (updates.some((item) => item.error)) setError("Could not save the new slide order."); else setBanners(next.map((banner, sort_order) => ({ ...banner, sort_order })));
  };

  if (loading) return <main className="admin-glass-shell grid min-h-screen place-items-center bg-[#f5f7f3] text-sm text-[#42694b]"><LoaderCircle className="mr-2 animate-spin"/>Loading promotion manager…</main>;
  if (!authorized) return <main className="min-h-screen bg-[#f5f7f3] p-8"><div className="mx-auto max-w-lg rounded-2xl bg-white p-7"><h1 className="text-xl font-bold text-[#203b2a]">Promotion access</h1><p className="mt-3 text-sm text-red-700">{error}</p><Link href="/admin" className="mt-5 inline-flex text-sm font-bold text-[#315b43]">Back to admin</Link></div></main>;

  return (
    <main className="min-h-screen bg-[#f5f7f3] px-4 py-7 text-[#26392c] sm:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-4"><div><Link href="/admin" className="text-xs font-bold text-[#65806a]">← Admin overview</Link><p className="mt-5 text-[10px] font-extrabold uppercase tracking-[.2em] text-[#8b9986]">Storefront control</p><h1 className="mt-1 text-3xl font-semibold tracking-tight text-[#1c3c29]">Promotions & animations</h1><p className="mt-2 text-sm text-[#7d897a]">Create rotating banners and control how they move on your storefront.</p></div><button onClick={() => { setEditing(null); setDraft(emptyDraft); setError(""); setMessage(""); }} className="inline-flex items-center gap-2 rounded-full bg-[#245b42] px-5 py-3 text-xs font-bold text-white"><Plus size={15}/> New promotion</button></div>
        {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-3 text-xs text-red-700">{error}</p>}
        {message && <p role="status" className="mt-5 rounded-xl bg-[#eaf3e8] p-3 text-xs text-[#386344]">{message}</p>}
        <div className="mt-7 grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
          <section className="space-y-3">
            <h2 className="text-sm font-bold text-[#405744]">Your slides ({banners.length})</h2>
            {banners.length === 0 && <div className="rounded-2xl border border-dashed border-[#cbd8c8] bg-white p-9 text-center"><ImagePlus className="mx-auto text-[#88a088]" size={30}/><p className="mt-3 text-sm font-bold text-[#405744]">No promotions created yet</p><p className="mt-1 text-xs text-[#8b9688]">Create your first banner to replace the default offer.</p></div>}
            {banners.map((banner,index) => <article key={banner.id} className="flex gap-3 rounded-2xl border border-[#e5ebe2] bg-white p-4 shadow-sm"><div className="grid h-14 w-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-[#edf2e9] text-[#4a7652]">{banner.image_url ? <img src={banner.image_url} alt="" className="h-full w-full object-cover"/> : <ImagePlus size={20}/>}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate text-sm font-bold text-[#304735]">{banner.title}</h3><span className={`rounded-full px-2 py-1 text-[9px] font-bold ${banner.is_active ? "bg-[#e9f3e7] text-[#3b7046]" : "bg-[#f1f1ee] text-[#899184]"}`}>{banner.is_active ? "Enabled" : "Paused"}</span></div><p className="mt-1 truncate text-xs text-[#8a9687]">{banner.subtitle || "No subtitle"}</p><p className="mt-2 text-[10px] font-semibold capitalize text-[#66806a]">{banner.animation_effect} · {banner.slide_duration_ms/1000}s display</p><div className="mt-3 flex flex-wrap gap-2"><button onClick={() => edit(banner)} className="rounded-lg bg-[#eef3eb] px-3 py-2 text-[10px] font-bold text-[#42664a]">Edit</button><button onClick={() => void updateBanner(banner.id,{is_active:!banner.is_active})} className="inline-flex items-center gap-1 rounded-lg border border-[#e6ebe3] px-3 py-2 text-[10px] font-bold text-[#697866]">{banner.is_active ? <EyeOff size={12}/> : <Eye size={12}/>} {banner.is_active ? "Pause" : "Enable"}</button><button onClick={() => void remove(banner.id)} className="inline-flex items-center gap-1 rounded-lg border border-[#f0dfdc] px-3 py-2 text-[10px] font-bold text-[#a05f54]"><Trash2 size={12}/> Delete</button><button disabled={index===0} onClick={() => void reorder(index,-1)} aria-label="Move up" className="rounded-lg border border-[#e6ebe3] p-2 text-[#71816e] disabled:opacity-30"><ArrowUp size={13}/></button><button disabled={index===banners.length-1} onClick={() => void reorder(index,1)} aria-label="Move down" className="rounded-lg border border-[#e6ebe3] p-2 text-[#71816e] disabled:opacity-30"><ArrowDown size={13}/></button></div></div></article>)}
          </section>
          <section className="h-fit rounded-2xl border border-[#e5ebe2] bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center justify-between"><h2 className="text-sm font-bold text-[#304735]">{editing ? "Edit promotion" : "Create promotion"}</h2><span className="text-[10px] text-[#91a08d]">Changes show on homepage</span></div>
            <form onSubmit={save} className="mt-5 space-y-4">
              <label className="block text-xs font-bold text-[#526352]">Headline<input required maxLength={90} value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})} placeholder="e.g. Special launch offer" className="mt-2 w-full rounded-xl border border-[#dfe7dc] bg-[#fbfcfa] px-3 py-3 text-sm outline-none focus:border-[#719477]"/></label>
              <label className="block text-xs font-bold text-[#526352]">Supporting text<textarea rows={2} value={draft.subtitle} onChange={e=>setDraft({...draft,subtitle:e.target.value})} placeholder="A short message for your customers" className="mt-2 w-full rounded-xl border border-[#dfe7dc] bg-[#fbfcfa] px-3 py-3 text-sm outline-none focus:border-[#719477]"/></label>
              <label className="block text-xs font-bold text-[#526352]">Banner image URL (optional)<input type="url" value={draft.image_url} onChange={e=>setDraft({...draft,image_url:e.target.value})} placeholder="https://…" className="mt-2 w-full rounded-xl border border-[#dfe7dc] bg-[#fbfcfa] px-3 py-3 text-sm outline-none focus:border-[#719477]"/></label>
              <label className="block text-xs font-bold text-[#526352]">Button destination<input value={draft.target_url} onChange={e=>setDraft({...draft,target_url:e.target.value})} placeholder="/shop" className="mt-2 w-full rounded-xl border border-[#dfe7dc] bg-[#fbfcfa] px-3 py-3 text-sm outline-none focus:border-[#719477]"/></label>
              <div className="grid grid-cols-2 gap-3"><label className="block text-xs font-bold text-[#526352]">Animation<select value={draft.animation_effect} onChange={e=>setDraft({...draft,animation_effect:e.target.value as Draft["animation_effect"]})} className="mt-2 w-full rounded-xl border border-[#dfe7dc] bg-[#fbfcfa] px-3 py-3 text-sm"><option value="fade">Fade</option><option value="slide">Slide</option><option value="zoom">Zoom</option></select></label><label className="block text-xs font-bold text-[#526352]">Slide time<select value={draft.slide_duration_ms} onChange={e=>setDraft({...draft,slide_duration_ms:Number(e.target.value)})} className="mt-2 w-full rounded-xl border border-[#dfe7dc] bg-[#fbfcfa] px-3 py-3 text-sm"><option value={3000}>3 seconds</option><option value={5000}>5 seconds</option><option value={7000}>7 seconds</option><option value={10000}>10 seconds</option><option value={12000}>12 seconds</option></select></label></div>
              <label className="block text-xs font-bold text-[#526352]">Transition speed<select value={draft.transition_duration_ms} onChange={e=>setDraft({...draft,transition_duration_ms:Number(e.target.value)})} className="mt-2 w-full rounded-xl border border-[#dfe7dc] bg-[#fbfcfa] px-3 py-3 text-sm"><option value={300}>Fast</option><option value={600}>Normal</option><option value={1000}>Slow</option><option value={1500}>Very slow</option></select></label>
              <div className="grid grid-cols-2 gap-3"><label className="block text-xs font-bold text-[#526352]">Start date/time<input type="datetime-local" value={draft.starts_at} onChange={e=>setDraft({...draft,starts_at:e.target.value})} className="mt-2 w-full rounded-xl border border-[#dfe7dc] bg-[#fbfcfa] px-2 py-3 text-xs"/></label><label className="block text-xs font-bold text-[#526352]">End date/time<input type="datetime-local" value={draft.ends_at} onChange={e=>setDraft({...draft,ends_at:e.target.value})} className="mt-2 w-full rounded-xl border border-[#dfe7dc] bg-[#fbfcfa] px-2 py-3 text-xs"/></label></div>
              <label className="flex items-center gap-2 text-xs font-semibold text-[#526352]"><input type="checkbox" checked={draft.show_cta} onChange={e=>setDraft({...draft,show_cta:e.target.checked})}/> Show action button</label>
              <div className="flex gap-2"><button disabled={saving} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#245b42] px-4 py-3 text-xs font-bold text-white disabled:opacity-60"><Save size={14}/>{saving ? "Saving…" : editing ? "Save changes" : "Create promotion"}</button>{editing && <button type="button" onClick={()=>{setEditing(null);setDraft(emptyDraft)}} className="rounded-xl border border-[#e1e8de] px-4 py-3 text-xs font-bold text-[#657463]">Cancel</button>}</div>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}
