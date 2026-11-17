"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, Save, Truck } from "lucide-react";
import { supabase } from "@/lib/supabase";

type DeliveryZone = {
  id: string; state: string; city: string; area_name: string; delivery_fee: number;
  minimum_order_amount: number; estimated_days: string | null; instructions: string | null;
  is_active: boolean; sort_order: number;
};
const DESTINATIONS = [
  { state: "Plateau", city: "Jos", label: "Jos, Plateau" },
  { state: "Federal Capital Territory", city: "Abuja", label: "Abuja (FCT)" },
] as const;
type DestinationState = (typeof DESTINATIONS)[number]["state"];
const blank = { state: "Plateau" as DestinationState, delivery_fee: "", minimum_order_amount: "0", estimated_days: "24hrs", instructions: "", is_active: true };

export default function DeliveryAdminPage() {
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState<string | null>(null);
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    if (!supabase) { setError("Database is not configured."); setLoading(false); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Please sign in."); setLoading(false); return; }
    const { data: profile } = await supabase.from("admin_profiles").select("role,is_active").eq("user_id", user.id).maybeSingle();
    if (!profile?.is_active || !["owner", "store_manager"].includes(profile.role)) {
      setError("Only the owner or a store manager can manage delivery settings."); setLoading(false); return;
    }
    setRole(profile.role);
    const { data, error: zoneError } = await supabase.from("delivery_zones")
      .select("id,state,city,area_name,delivery_fee,minimum_order_amount,estimated_days,instructions,is_active,sort_order")
      .order("state").order("city");
    if (zoneError) setError(zoneError.message);
    else {
      const loaded = (data ?? []) as DeliveryZone[];
      setZones(loaded);
      setForm(current => {
        if (current.delivery_fee) return current;
        const currentCity = DESTINATIONS.find(item => item.state === current.state)?.city;
        const existing = loaded.find(zone => zone.state === current.state && zone.city === currentCity);
        return existing ? {
          ...current,
          delivery_fee: String(existing.delivery_fee),
          minimum_order_amount: String(existing.minimum_order_amount),
          estimated_days: existing.estimated_days || "",
          instructions: existing.instructions || "",
          is_active: existing.is_active,
        } : current;
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);
  const destination = DESTINATIONS.find(item => item.state === form.state)!;

  function chooseDestination(nextState: DestinationState) {
    const nextDestination = DESTINATIONS.find(item => item.state === nextState)!;
    const existing = zones.find(zone => zone.state === nextState && zone.city === nextDestination.city);
    setEditing(existing?.id ?? null);
    setForm({
      state: nextState,
      delivery_fee: existing ? String(existing.delivery_fee) : "",
      minimum_order_amount: existing ? String(existing.minimum_order_amount) : "0",
      estimated_days: existing?.estimated_days || "24hrs",
      instructions: existing?.instructions || "",
      is_active: existing?.is_active ?? true,
    });
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    const fee = Number(form.delivery_fee), minimum = Number(form.minimum_order_amount || 0);
    if (!Number.isFinite(fee) || fee < 0 || !Number.isFinite(minimum) || minimum < 0) {
      setError("Enter valid non-negative delivery and minimum-order amounts."); return;
    }
    setSaving(true); setError(""); setMessage("");
    const payload = {
      state: destination.state, city: destination.city, area_name: "All areas",
      delivery_fee: fee, minimum_order_amount: minimum,
      estimated_days: form.estimated_days.trim() || null,
      instructions: form.instructions.trim() || null, is_active: form.is_active,
      coverage_geojson: null, updated_at: new Date().toISOString(),
    };
    const existing = zones.find(zone => zone.state === destination.state && zone.city === destination.city);
    const zoneId = editing || existing?.id;
    const result = zoneId
      ? await supabase.from("delivery_zones").update(payload).eq("id", zoneId)
      : await supabase.from("delivery_zones").insert(payload);
    if (result.error) setError(result.error.message);
    else {
      setMessage("Flat-rate delivery settings saved for " + destination.label + ".");
      setEditing(zoneId ?? null);
      await load();
    }
    setSaving(false);
  }

  async function toggle(zone: DeliveryZone) {
    if (!supabase) return;
    setError("");
    const { error: updateError } = await supabase.from("delivery_zones")
      .update({ is_active: !zone.is_active, updated_at: new Date().toISOString() }).eq("id", zone.id);
    if (updateError) setError(updateError.message); else await load();
  }

  if (loading) return <main className="admin-glass-shell p-10">Loading delivery settings…</main>;
  if (!role) return <main className="min-h-screen bg-[#f5f7f3] p-8"><p className="text-red-700">{error}</p><Link href="/admin">Back to admin</Link></main>;

  return (
    <main className="min-h-screen bg-[#f5f7f3] px-4 py-8 text-[#25392b] sm:px-8">
      <div className="mx-auto max-w-4xl">
        <Link href="/admin" className="inline-flex items-center gap-2 text-xs font-bold"><ArrowLeft size={14} /> Admin overview</Link>
        <div className="mt-5 flex items-center gap-3"><Truck size={28} /><div>
          <h1 className="text-3xl font-bold">Home delivery setup</h1>
          <p className="mt-1 text-sm text-[#788678]">Simple flat-rate delivery for Jos and Abuja. No map drawing or pin selection is required.</p>
        </div></div>
        {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {message && <p role="status" className="mt-4 rounded-xl bg-green-50 p-3 text-sm text-green-800">{message}</p>}
        <form onSubmit={save} className="mt-6 grid gap-4 rounded-2xl border border-[#e4e9e1] bg-white p-5 sm:grid-cols-2">
          <h2 className="font-bold sm:col-span-2">Set a flat delivery rate</h2>
          <label className="text-xs font-semibold sm:col-span-2">Delivery destination
            <select value={form.state} onChange={event => chooseDestination(event.target.value as DestinationState)} className="mt-1 block w-full rounded-xl border p-3 text-sm">
              {DESTINATIONS.map(item => <option key={item.state} value={item.state}>{item.label}</option>)}
            </select>
          </label>
          <div className="rounded-xl bg-[#f4f7ef] p-3 text-sm text-[#526052] sm:col-span-2">
            This rate applies to all deliverable addresses in <b>{destination.city}</b>. The customer enters a street address; there is no map boundary.
          </div>
          <label className="text-xs font-semibold">Flat delivery fee (₦)
            <input required type="number" min="0" step="1" value={form.delivery_fee} onChange={event => setForm({ ...form, delivery_fee: event.target.value })} placeholder="e.g. 2000" className="mt-1 block w-full rounded-xl border p-3 text-sm" />
          </label>
          <label className="text-xs font-semibold">Minimum order (₦, optional)
            <input type="number" min="0" step="1" value={form.minimum_order_amount} onChange={event => setForm({ ...form, minimum_order_amount: event.target.value })} className="mt-1 block w-full rounded-xl border p-3 text-sm" />
          </label>
          <label className="text-xs font-semibold">Estimated delivery time
            <input value={form.estimated_days} onChange={event => setForm({ ...form, estimated_days: event.target.value })} placeholder="e.g. 24hrs" className="mt-1 block w-full rounded-xl border p-3 text-sm" />
          </label>
          <label className="text-xs font-semibold sm:col-span-2">Customer instructions (optional)
            <textarea rows={2} value={form.instructions} onChange={event => setForm({ ...form, instructions: event.target.value })} placeholder="Optional delivery notes" className="mt-1 block w-full rounded-xl border p-3 text-sm" />
          </label>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" checked={form.is_active} onChange={event => setForm({ ...form, is_active: event.target.checked })} />
            Make home delivery available in this destination
          </label>
          <div className="flex gap-2 sm:col-span-2">
            <button disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-[#245b42] px-5 py-3 text-sm font-bold text-white"><Save size={15} />{saving ? "Saving…" : "Save delivery rate"}</button>
          </div>
        </form>
        <section className="mt-7 rounded-2xl border border-[#e4e9e1] bg-white p-5">
          <h2 className="font-bold">Delivery destinations</h2>
          <p className="mt-1 text-xs text-[#829080]">Only these two destinations can accept home-delivery orders at present.</p>
          <div className="mt-4 divide-y">
            {DESTINATIONS.map(item => {
              const zone = zones.find(row => row.state === item.state && row.city === item.city);
              return <article key={item.state} className="flex flex-wrap items-center gap-3 py-4">
                <div className="min-w-0 flex-1"><p className="text-sm font-bold">{item.label}</p>
                  {zone ? <p className="mt-1 text-xs text-[#7c897b]">₦{Number(zone.delivery_fee).toLocaleString("en-NG")} flat rate · Minimum ₦{Number(zone.minimum_order_amount).toLocaleString("en-NG")}{zone.estimated_days ? " · " + zone.estimated_days : ""}</p> : <p className="mt-1 text-xs text-[#9b5144]">Rate not configured yet</p>}
                </div>
                <span className={zone?.is_active ? "text-xs font-bold text-green-700" : "text-xs font-bold text-gray-500"}>{zone?.is_active ? "Available" : "Unavailable"}</span>
                {zone && <button type="button" onClick={() => toggle(zone)} className="rounded-lg border px-3 py-2 text-xs font-bold">{zone.is_active ? "Disable" : "Enable"}</button>}
                <button type="button" onClick={() => chooseDestination(item.state)} className="rounded-lg border px-3 py-2 text-xs font-bold">{zone ? "Edit rate" : "Set up"}</button>
              </article>;
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
