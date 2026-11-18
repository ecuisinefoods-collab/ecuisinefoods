"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, RefreshCw, Save, TrendingUp } from "lucide-react";

const DEFAULT_BASELINE = 2500;

export default function SalesCounterAdminPage() {
  const [value, setValue] = useState(String(DEFAULT_BASELINE));
  const [savedValue, setSavedValue] = useState(DEFAULT_BASELINE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    if (!supabase) { setError("Database connection unavailable."); setLoading(false); return; }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setError("Sign in through the admin dashboard."); setLoading(false); return; }
    const { data: profile } = await supabase.from("admin_profiles").select("role,is_active").eq("user_id", session.user.id).maybeSingle();
    if (!profile?.is_active || profile.role !== "owner") { setError("Only the CEO account can change the historical sales baseline."); setLoading(false); return; }
    const { data, error: queryError } = await supabase.from("site_settings").select("setting_value").eq("setting_key", "sales_counter_historical_baseline").maybeSingle();
    if (queryError) setError(queryError.message);
    else {
      const raw = data?.setting_value;
      const parsed = raw !== undefined && raw !== null && /^\d+$/.test(String(raw)) ? Number(raw) : DEFAULT_BASELINE;
      setSavedValue(parsed);
      setValue(String(parsed));
    }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const save = async () => {
    if (!supabase) return;
    const trimmed = value.trim();
    if (!/^\d+$/.test(trimmed)) { setError("Enter a whole number of zero or more."); return; }
    setSaving(true); setError(""); setMessage("");
    const { error: saveError } = await supabase.from("site_settings").upsert({
      setting_key: "sales_counter_historical_baseline",
      setting_value: String(Number(trimmed)),
      updated_at: new Date().toISOString(),
    }, { onConflict: "setting_key" });
    if (saveError) setError(saveError.message);
    else { setSavedValue(Number(trimmed)); setValue(String(Number(trimmed))); setMessage("Historical sales baseline updated. Website orders will continue adding automatically."); }
    setSaving(false);
  };

  return (
    <main className="admin-glass-shell min-h-screen bg-[#f5f7f3] px-4 py-8 text-[#25392b] sm:px-8">
      <div className="mx-auto max-w-3xl">
        <Link href="/admin" className="inline-flex items-center gap-2 text-sm font-semibold text-[#42694b]"><ArrowLeft size={16}/> CEO workspace</Link>
        <div className="mt-6 rounded-3xl border border-[#e2e9df] bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-start gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#eaf3e9] text-[#2d6843]"><TrendingUp size={22}/></span>
            <div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#789078]">Storefront controls</p><h1 className="mt-1 text-2xl font-bold text-[#1e3b29]">Historical products-sold baseline</h1><p className="mt-2 text-sm leading-6 text-[#788678]">Record products sold before the eCuisine website launched. The homepage automatically adds product units from completed website orders to this baseline.</p></div>
          </div>
          {loading ? <p className="mt-7 text-sm text-[#718271]">Loading historical sales baseline…</p> : (
            <>
              <div className="mt-7 rounded-2xl bg-[#f7faf5] p-5">
                <label htmlFor="sales-count" className="block text-xs font-bold text-[#405443]">Products sold before website launch</label>
                <input id="sales-count" type="number" min="0" step="1" inputMode="numeric" value={value} onChange={e => setValue(e.target.value)} className="mt-2 w-full rounded-xl border border-[#dfe6dc] bg-white px-4 py-3 text-lg font-bold text-[#1d3928] outline-none focus:border-[#4c805b]"/>
                <p className="mt-2 text-[11px] leading-5 text-[#879286]">The starting value is 2,500. Change it only to reflect verified historical sales. This setting does not create orders or change revenue, inventory or accounting records.</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button type="button" onClick={() => void save()} disabled={saving || !/^\d+$/.test(value.trim())} className="inline-flex items-center gap-2 rounded-xl bg-[#245b42] px-5 py-3 text-xs font-bold text-white disabled:opacity-50"><Save size={15}/>{saving ? "Saving…" : "Save baseline"}</button>
                  <button type="button" onClick={() => { setLoading(true); setError(""); setMessage(""); void load(); }} disabled={saving} className="inline-flex items-center gap-2 rounded-xl border border-[#e1e8de] px-4 py-3 text-xs font-bold text-[#526b55]"><RefreshCw size={14}/> Refresh</button>
                </div>
              </div>
              <div className="mt-5 rounded-2xl border border-[#e5ebe2] p-5">
                <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#899587]">Historical baseline</p>
                <p className="mt-2 text-2xl font-bold text-[#1e3b29]">{savedValue.toLocaleString("en-NG")} products</p>
                <p className="mt-1 text-xs text-[#879286]">The live homepage total = historical baseline + completed website-order product units.</p>
              </div>
            </>
          )}
          {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-xs leading-5 text-red-700">{error}</p>}
          {message && <p role="status" className="mt-5 rounded-xl bg-[#edf5e9] p-4 text-xs leading-5 text-[#3d6947]">{message}</p>}
        </div>
      </div>
    </main>
  );
}
