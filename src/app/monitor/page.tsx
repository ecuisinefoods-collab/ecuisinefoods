"use client";

import { useEffect, useState } from "react";
import { Activity, ExternalLink, Globe, LogOut, RefreshCw, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";

const SITE = "https://ecuisinefoods.onrender.com";
const DEPLOYS = "https://dashboard.render.com/web/srv-dbo44mec6qcc73dvf9og/deploys";

export default function MonitorPage() {
  const [email, setEmail] = useState("ecuisinefoods@gmail.com");
  const [password, setPassword] = useState("");
  const [session, setSession] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [siteState, setSiteState] = useState<"checking"|"online"|"offline">("checking");
  const [checkedAt, setCheckedAt] = useState("");

  const checkSite = async () => {
    setSiteState("checking");
    try {
      const response = await fetch(SITE, { method: "GET", cache: "no-store" });
      setSiteState(response.ok ? "online" : "offline");
    } catch { setSiteState("offline"); }
    setCheckedAt(new Date().toLocaleString());
  };

  useEffect(() => {
    void checkSite();
    if (!supabase) return;
    void supabase.auth.getSession().then(({data}) => setSession(!!data.session));
  }, []);

  const signIn = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError("");
    if (!supabase) { setError("Authentication is not configured."); setBusy(false); return; }
    const {error: authError} = await supabase.auth.signInWithPassword({email,password});
    if (authError) setError(authError.message); else { setSession(true); setPassword(""); }
    setBusy(false);
  };

  const signOut = async () => { await supabase?.auth.signOut(); setSession(false); };

  return <main className="min-h-screen bg-[#f3f6f1] px-4 py-8 text-[#213b2a] sm:px-8">
    <div className="mx-auto max-w-4xl">
      <header className="flex items-center justify-between gap-4"><div><p className="text-xs font-extrabold uppercase tracking-[.18em] text-[#789078]">eCuisinefoods</p><h1 className="mt-1 text-3xl font-bold">Website monitor</h1><p className="mt-2 text-sm text-[#718171]">A single place to check your storefront and open admin tools.</p></div>{session && <button onClick={signOut} className="inline-flex items-center gap-2 rounded-xl border border-[#dbe5d8] bg-white px-3 py-2 text-xs font-bold"><LogOut size={14}/> Sign out</button>}</header>
      {!session ? <form onSubmit={signIn} className="mt-8 max-w-md rounded-2xl border border-[#e0e8dd] bg-white p-6 shadow-sm"><div className="flex items-center gap-2"><ShieldCheck/><h2 className="font-bold">Secure monitor login</h2></div><p className="mt-2 text-xs text-[#788777]">Use your existing eCuisinefoods admin account.</p><label className="mt-5 block text-xs font-bold">Email<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} className="mt-2 w-full rounded-xl border p-3 text-sm"/></label><label className="mt-4 block text-xs font-bold">Password<input type="password" required value={password} onChange={e=>setPassword(e.target.value)} className="mt-2 w-full rounded-xl border p-3 text-sm"/></label>{error && <p className="mt-3 text-xs text-red-700">{error}</p>}<button disabled={busy} className="mt-5 w-full rounded-xl bg-[#245b42] p-3 text-sm font-bold text-white">{busy?"Signing in…":"Log in"}</button></form> : <>
      <section className="mt-8 grid gap-4 sm:grid-cols-2"><article className="rounded-2xl border border-[#e0e8dd] bg-white p-5"><div className="flex items-center justify-between"><h2 className="font-bold">Storefront status</h2><Globe size={20}/></div><p className="mt-4 text-2xl font-bold">{siteState==="online"?"Online":siteState==="offline"?"Unavailable":"Checking…"}</p><p className="mt-1 text-xs text-[#849183]">Last check: {checkedAt||"—"}</p><button onClick={()=>void checkSite()} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#edf3eb] px-3 py-2 text-xs font-bold"><RefreshCw size={13}/> Check again</button></article><article className="rounded-2xl border border-[#e0e8dd] bg-white p-5"><div className="flex items-center justify-between"><h2 className="font-bold">Admin access</h2><Activity size={20}/></div><p className="mt-4 text-2xl font-bold">Authenticated</p><p className="mt-1 text-xs text-[#849183]">Signed in with your existing Supabase account.</p><a href={SITE+"/admin"} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#edf3eb] px-3 py-2 text-xs font-bold">Open admin dashboard <ExternalLink size={13}/></a></article></section>
      <section className="mt-5 rounded-2xl border border-[#e0e8dd] bg-white p-5"><h2 className="font-bold">Quick access</h2><div className="mt-4 grid gap-2 sm:grid-cols-2"><a href={SITE} className="rounded-xl border p-3 text-sm font-semibold">Storefront ↗</a><a href={SITE+"/admin"} className="rounded-xl border p-3 text-sm font-semibold">Admin dashboard ↗</a><a href={SITE+"/admin/promotions"} className="rounded-xl border p-3 text-sm font-semibold">Promotions & media ↗</a><a href={DEPLOYS} target="_blank" rel="noreferrer" className="rounded-xl border p-3 text-sm font-semibold">Render deployment status ↗</a></div><p className="mt-4 text-xs text-[#839082]">This monitor checks whether the storefront responds. Render provides the authoritative build/deploy logs and service health.</p></section>
      </>}
    </div>
  </main>;
}
