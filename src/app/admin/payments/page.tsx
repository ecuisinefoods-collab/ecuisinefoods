"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CreditCard, Save, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Draft = {
  bank_name: string;
  account_name: string;
  account_number: string;
  transfer_instructions: string;
  bank_transfer_enabled: boolean;
  cash_pickup_enabled: boolean;
  cash_delivery_enabled: boolean;
};
const defaults: Draft = {
  bank_name: "",
  account_name: "",
  account_number: "",
  transfer_instructions: "Use the order reference as the transfer narration. Send your payment confirmation to our WhatsApp team.",
  bank_transfer_enabled: false,
  cash_pickup_enabled: true,
  cash_delivery_enabled: true,
};
const keys = [
  "payment_bank_name",
  "payment_account_name",
  "payment_account_number",
  "payment_transfer_instructions",
  "payment_bank_transfer_enabled",
  "payment_cash_pickup_enabled",
  "payment_cash_delivery_enabled",
];

export default function PaymentSettingsPage() {
  const [draft, setDraft] = useState<Draft>(defaults);
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    if (!supabase) { setError("Database connection is not configured."); setLoading(false); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Please sign in through the admin dashboard."); setLoading(false); return; }
    const { data: profile } = await supabase.from("admin_profiles").select("role,is_active").eq("user_id", user.id).maybeSingle();
    if (!profile?.is_active || !["owner", "store_manager"].includes(profile.role)) {
      setError("Only the owner or an authorised store manager can edit payment settings.");
      setLoading(false);
      return;
    }
    setAuthorized(true);
    const { data, error: readError } = await supabase.from("site_settings").select("setting_key,setting_value").in("setting_key", keys);
    if (readError) setError(readError.message);
    else {
      const values = Object.fromEntries((data ?? []).map(row => [row.setting_key, row.setting_value]));
      setDraft({
        bank_name: values.payment_bank_name ?? "",
        account_name: values.payment_account_name ?? "",
        account_number: values.payment_account_number ?? "",
        transfer_instructions: values.payment_transfer_instructions ?? defaults.transfer_instructions,
        bank_transfer_enabled: values.payment_bank_transfer_enabled === "true",
        cash_pickup_enabled: values.payment_cash_pickup_enabled !== "false",
        cash_delivery_enabled: values.payment_cash_delivery_enabled !== "false",
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !authorized) return;
    setError("");
    setMessage("");
    if (draft.bank_transfer_enabled && (!draft.bank_name.trim() || !draft.account_name.trim() || !/^[0-9]{10}$/.test(draft.account_number.trim()))) {
      setError("To enable bank transfer, enter the bank name, account name and a valid 10-digit Nigerian account number.");
      return;
    }
    if (!draft.cash_pickup_enabled && !draft.cash_delivery_enabled && !draft.bank_transfer_enabled) {
      setError("Enable at least one payment method.");
      return;
    }
    setSaving(true);
    const now = new Date().toISOString();
    const values: Record<string, string> = {
      payment_bank_name: draft.bank_name.trim(),
      payment_account_name: draft.account_name.trim(),
      payment_account_number: draft.account_number.trim(),
      payment_transfer_instructions: draft.transfer_instructions.trim(),
      payment_bank_transfer_enabled: String(draft.bank_transfer_enabled),
      payment_cash_pickup_enabled: String(draft.cash_pickup_enabled),
      payment_cash_delivery_enabled: String(draft.cash_delivery_enabled),
    };
    const { error: saveError } = await supabase.from("site_settings").upsert(
      Object.entries(values).map(([setting_key, setting_value]) => ({ setting_key, setting_value, updated_at: now })),
      { onConflict: "setting_key" }
    );
    if (saveError) setError(saveError.message);
    else setMessage("Payment settings saved. The checkout page will use these settings.");
    setSaving(false);
  }

  if (loading) return <main className="admin-glass-shell grid min-h-screen place-items-center text-sm font-semibold text-[#42694b]">Loading payment settings…</main>;
  if (!authorized) return <main className="min-h-screen bg-[#f5f7f3] p-8"><div className="mx-auto max-w-lg rounded-2xl bg-white p-7"><h1 className="text-xl font-bold">Payment settings access</h1><p className="mt-3 text-sm text-red-700">{error}</p><Link href="/admin" className="mt-5 inline-flex text-sm font-bold text-[#315b43]">Back to admin</Link></div></main>;

  return <main className="admin-glass-shell min-h-screen px-4 py-8 text-[#25392b] sm:px-8">
    <div className="mx-auto max-w-4xl">
      <Link href="/admin" className="inline-flex items-center gap-2 text-xs font-bold text-[#65806a]"><ArrowLeft size={14}/> Admin overview</Link>
      <div className="mt-6 flex items-center gap-3"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-[#245b42] shadow"><CreditCard size={22}/></span><div><p className="text-[10px] font-extrabold uppercase tracking-[.2em] text-[#8b9986]">Checkout configuration</p><h1 className="text-3xl font-semibold tracking-tight text-[#1c3c29]">Payment settings</h1><p className="mt-1 text-sm text-[#7d897a]">Choose the payment methods customers can use and manage the account shown for transfers.</p></div></div>
      {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {message && <p role="status" className="mt-5 rounded-xl bg-green-50 p-3 text-sm font-semibold text-green-800">{message}</p>}
      <form onSubmit={save} className="mt-6 space-y-5">
        <section className="rounded-3xl border border-white/70 bg-white/75 p-5 shadow-xl backdrop-blur-xl sm:p-7">
          <div className="flex items-center gap-2"><CreditCard size={18}/><h2 className="font-bold">Bank transfer</h2></div>
          <p className="mt-2 text-xs leading-5 text-[#778477]">These details are shown to customers only when bank transfer is enabled. The checkout creates a unique reference for each transfer. Payments remain pending until your team verifies receipt.</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-semibold">Bank name<input value={draft.bank_name} onChange={e=>setDraft({...draft,bank_name:e.target.value})} placeholder="Enter bank name" className="mt-1.5 w-full rounded-xl border border-[#dfe7dc] bg-white px-3 py-3 text-sm"/></label>
            <label className="text-xs font-semibold">Account name<input value={draft.account_name} onChange={e=>setDraft({...draft,account_name:e.target.value})} placeholder="Name on the bank account" className="mt-1.5 w-full rounded-xl border border-[#dfe7dc] bg-white px-3 py-3 text-sm"/></label>
            <label className="text-xs font-semibold sm:col-span-2">10-digit account number<input inputMode="numeric" maxLength={10} value={draft.account_number} onChange={e=>setDraft({...draft,account_number:e.target.value.replace(/[^0-9]/g,"").slice(0,10)})} placeholder="0123456789" className="mt-1.5 w-full rounded-xl border border-[#dfe7dc] bg-white px-3 py-3 text-sm"/></label>
            <label className="text-xs font-semibold sm:col-span-2">Transfer instructions<textarea rows={3} value={draft.transfer_instructions} onChange={e=>setDraft({...draft,transfer_instructions:e.target.value})} className="mt-1.5 w-full rounded-xl border border-[#dfe7dc] bg-white px-3 py-3 text-sm"/></label>
          </div>
          <label className="mt-5 flex items-center gap-3 rounded-xl bg-[#f2f7ef] p-4 text-sm font-semibold"><input type="checkbox" checked={draft.bank_transfer_enabled} onChange={e=>setDraft({...draft,bank_transfer_enabled:e.target.checked})}/> Offer bank transfer at checkout</label>
          {draft.bank_transfer_enabled && (!draft.bank_name.trim() || !draft.account_name.trim() || draft.account_number.length !== 10) && <p className="mt-2 text-xs font-semibold text-[#a15b32]">Complete all three bank details before saving this method as enabled.</p>}
        </section>
        <section className="rounded-3xl border border-white/70 bg-white/75 p-5 shadow-xl backdrop-blur-xl sm:p-7">
          <h2 className="font-bold">Cash payments</h2>
          <p className="mt-2 text-xs text-[#778477]">Customers pay in person, not on the website. No order is marked paid automatically.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="flex items-start gap-3 rounded-xl border border-[#e5ebe1] p-4 text-sm font-semibold"><input type="checkbox" checked={draft.cash_pickup_enabled} onChange={e=>setDraft({...draft,cash_pickup_enabled:e.target.checked})}/><span>Cash on pickup<small className="mt-1 block text-xs font-normal text-[#829080]">Customer pays when collecting the order.</small></span></label>
            <label className="flex items-start gap-3 rounded-xl border border-[#e5ebe1] p-4 text-sm font-semibold"><input type="checkbox" checked={draft.cash_delivery_enabled} onChange={e=>setDraft({...draft,cash_delivery_enabled:e.target.checked})}/><span>Cash on delivery<small className="mt-1 block text-xs font-normal text-[#829080]">Customer pays when the delivery arrives.</small></span></label>
          </div>
        </section>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#edf4e9] p-4 text-xs text-[#5e735d]"><span className="inline-flex items-center gap-2"><ShieldCheck size={16}/> Payment verification stays manual.</span><button disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-[#245b42] px-5 py-3 text-sm font-bold text-white disabled:opacity-60"><Save size={15}/>{saving?"Saving…":"Save payment settings"}</button></div>
      </form>
    </div>
  </main>;
}
