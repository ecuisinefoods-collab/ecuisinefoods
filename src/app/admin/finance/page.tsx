"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, CheckCircle2, Download, Pencil, PlusCircle, RefreshCw,
  RotateCcw, Save, ShieldCheck, Clock3,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type Tx = {
  id: string;
  transaction_type: "income" | "expense";
  category: string;
  description: string;
  amount: number;
  transaction_date: string;
  reference: string | null;
  status: "pending" | "posted" | "void";
  reversal_of_id: string | null;
};

const money = (n: number) => new Intl.NumberFormat("en-NG", {
  style: "currency", currency: "NGN", maximumFractionDigits: 0,
}).format(n || 0);
const csv = (value: unknown) => '"' + String(value ?? "").replace(/"/g, '""') + '"';

export default function AdminFinancePage() {
  const [rows, setRows] = useState<Tx[]>([]);
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [type, setType] = useState<"income" | "expense">("income");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [reference, setReference] = useState("");

  const load = useCallback(async () => {
    if (!supabase) { setError("Database connection unavailable."); setLoading(false); return; }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setError("Sign in through the admin dashboard first."); setLoading(false); return; }
    const { data: profile } = await supabase.from("admin_profiles")
      .select("role,is_active").eq("user_id", session.user.id).maybeSingle();
    if (!profile?.is_active || !["owner", "finance_officer", "analyst"].includes(profile.role)) {
      setError("Your role cannot access finance records."); setLoading(false); return;
    }
    setRole(profile.role);
    const { data, error: queryError } = await supabase.from("financial_transactions")
      .select("id,transaction_type,category,description,amount,transaction_date,reference,status,reversal_of_id")
      .order("transaction_date", { ascending: false }).limit(5000);
    if (queryError) setError(queryError.message);
    else setRows((data || []) as Tx[]);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  function reset() {
    setEditing(null); setType("income"); setCategory(""); setDescription("");
    setAmount(""); setDate(new Date().toISOString().slice(0, 10)); setReference("");
  }

  function editPending(row: Tx) {
    if (row.status !== "pending" || role === "analyst") return;
    setEditing(row.id); setType(row.transaction_type); setCategory(row.category);
    setDescription(row.description); setAmount(String(row.amount));
    setDate(row.transaction_date); setReference(row.reference || "");
    setNotice(""); setError("");
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!supabase || role === "analyst") return;
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError("Enter an amount greater than zero."); return;
    }
    setSaving(true); setError(""); setNotice("");
    const payload = {
      transaction_type: type, category: category.trim(), description: description.trim(),
      amount: numericAmount, transaction_date: date, reference: reference.trim() || null,
    };
    const result = editing
      ? await supabase.from("financial_transactions").update(payload).eq("id", editing).eq("status", "pending")
      : await supabase.from("financial_transactions").insert({
          ...payload, status: role === "owner" ? "posted" : "pending",
          recorded_by: (await supabase.auth.getUser()).data.user?.id,
        });
    if (result.error) setError(result.error.message);
    else {
      setNotice(editing ? "Pending transaction updated." : role === "owner"
        ? "Financial transaction recorded and posted."
        : "Financial transaction submitted for Founder approval.");
      reset(); await load();
    }
    setSaving(false);
  }

  async function approve(row: Tx) {
    if (!supabase || role !== "owner" || row.status !== "pending") return;
    if (!window.confirm("Approve and post this financial transaction? Once posted, it cannot be edited or deleted.")) return;
    setSaving(true); setError(""); setNotice("");
    const { error: updateError } = await supabase.from("financial_transactions")
      .update({ status: "posted", updated_at: new Date().toISOString() })
      .eq("id", row.id).eq("status", "pending");
    if (updateError) setError(updateError.message);
    else {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) await supabase.from("admin_audit_logs").insert({
        actor_user_id: user.id, actor_email: user.email,
        action: "approve_financial_transaction", resource_type: "financial_transaction",
        resource_id: row.id, details: { amount: row.amount, transaction_type: row.transaction_type },
      });
      setNotice("Transaction approved and posted."); await load();
    }
    setSaving(false);
  }

  async function reverse(row: Tx) {
    if (!supabase || role !== "owner" || row.status !== "posted" || row.reversal_of_id) return;
    if (rows.some(item => item.reversal_of_id === row.id)) {
      setNotice("This transaction already has a reversal."); return;
    }
    if (!window.confirm("Create a linked reversal for this posted transaction? The original record will remain unchanged.")) return;
    setSaving(true); setError(""); setNotice("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Your session has expired. Sign in again."); setSaving(false); return; }
    const reversal = {
      transaction_type: row.transaction_type === "income" ? "expense" : "income",
      category: "Reversal - " + row.category,
      description: "Reversal of transaction " + row.id + ": " + row.description,
      amount: Number(row.amount),
      transaction_date: new Date().toISOString().slice(0, 10),
      reference: "Reversal of " + row.id,
      recorded_by: user.id,
      status: "posted",
      reversal_of_id: row.id,
    };
    const { data, error: insertError } = await supabase.from("financial_transactions")
      .insert(reversal).select("id").single();
    if (insertError) setError(insertError.message);
    else {
      await supabase.from("admin_audit_logs").insert({
        actor_user_id: user.id, actor_email: user.email,
        action: "reverse_financial_transaction", resource_type: "financial_transaction",
        resource_id: row.id, details: { reversal_id: data.id, amount: row.amount },
      });
      setNotice("Reversal recorded. The original financial entry has been retained."); await load();
    }
    setSaving(false);
  }

  function download() {
    const headers = ["id", "transaction_type", "category", "description", "amount", "transaction_date", "reference", "status", "reversal_of_id"];
    const body = [
      headers.map(csv).join(","),
      ...rows.map(row => headers.map(key => csv((row as unknown as Record<string, unknown>)[key])).join(",")),
    ].join("\r\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF" + body], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = "ecuisinefoods-finance-" + new Date().toISOString().slice(0, 10) + ".csv";
    anchor.click(); URL.revokeObjectURL(url);
  }

  const posted = rows.filter(row => row.status === "posted");
  const income = posted.filter(row => row.transaction_type === "income").reduce((sum, row) => sum + Number(row.amount), 0);
  const expenses = posted.filter(row => row.transaction_type === "expense").reduce((sum, row) => sum + Number(row.amount), 0);
  const pendingCount = rows.filter(row => row.status === "pending").length;

  return (
    <main className="admin-glass-shell min-h-screen bg-[#f5f7f3] px-4 py-8 text-[#25392b] sm:px-8">
      <div className="mx-auto max-w-6xl">
        <Link href="/admin" className="inline-flex items-center gap-2 text-sm font-semibold text-[#42694b]"><ArrowLeft size={16}/> Admin dashboard</Link>
        <div className="mt-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#8a9787]">Business accounts</p>
            <h1 className="mt-1 text-3xl font-semibold text-[#1e3b29]">Finance & transactions</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#7b887a]">Finance submissions remain pending until Founder approval. Posted entries are locked; corrections are recorded through linked reversals, never silent edits or deletion.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={download} className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-3 text-xs font-bold"><Download size={14}/> Download CSV</button>
            <button onClick={() => { setLoading(true); void load(); }} className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-3 text-xs font-bold"><RefreshCw size={14}/> Refresh</button>
          </div>
        </div>
        {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
        {notice && <p role="status" className="mt-5 rounded-xl bg-green-50 p-4 text-sm text-green-800">{notice}</p>}

        {!loading && role && <>
          <div className="mt-7 grid gap-4 sm:grid-cols-4">
            {[{ label: "Posted income", value: income }, { label: "Posted expenses", value: expenses }, { label: "Posted net", value: income - expenses }, { label: "Pending approval", value: pendingCount }].map(item =>
              <div key={item.label} className="rounded-2xl border border-[#e5ebe2] bg-white p-5">
                <p className="text-xs text-[#7b887a]">{item.label}</p>
                <p className="mt-2 text-2xl font-bold">{item.label === "Pending approval" ? item.value : money(item.value)}</p>
              </div>
            )}
          </div>

          {role !== "analyst" && <form onSubmit={submit} className="mt-6 rounded-2xl border border-[#e5ebe2] bg-white p-5">
            <div className="flex items-center gap-2"><PlusCircle size={18}/><h2 className="font-bold">{editing ? "Edit pending transaction" : "Record financial activity"}</h2></div>
            <p className="mt-2 text-xs text-[#7b887a]">{role === "owner" ? "Entries you record are posted immediately under Founder authority." : "Your entry will be submitted as pending for Founder approval."}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <label className="text-xs font-semibold">Type<select value={type} onChange={event => setType(event.target.value as "income" | "expense")} className="mt-1 w-full rounded-xl border p-3"><option value="income">Income</option><option value="expense">Expense</option></select></label>
              <label className="text-xs font-semibold">Category<input required value={category} onChange={event => setCategory(event.target.value)} placeholder="e.g. Packaging" className="mt-1 w-full rounded-xl border p-3"/></label>
              <label className="text-xs font-semibold">Amount (₦)<input required min="0.01" step="0.01" type="number" value={amount} onChange={event => setAmount(event.target.value)} className="mt-1 w-full rounded-xl border p-3"/></label>
              <label className="text-xs font-semibold sm:col-span-2">Description<input required value={description} onChange={event => setDescription(event.target.value)} placeholder="What was this transaction for?" className="mt-1 w-full rounded-xl border p-3"/></label>
              <label className="text-xs font-semibold">Date<input required type="date" value={date} onChange={event => setDate(event.target.value)} className="mt-1 w-full rounded-xl border p-3"/></label>
              <label className="text-xs font-semibold lg:col-span-3">Reference (optional)<input value={reference} onChange={event => setReference(event.target.value)} className="mt-1 w-full rounded-xl border p-3"/></label>
            </div>
            <div className="mt-4 flex gap-2">
              <button disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-[#245b42] px-5 py-3 text-xs font-bold text-white disabled:opacity-50"><Save size={14}/>{saving ? "Saving…" : editing ? "Save pending changes" : "Save transaction"}</button>
              {editing && <button type="button" onClick={reset} className="rounded-xl border px-4 py-3 text-xs font-bold">Cancel</button>}
            </div>
          </form>}

          <section className="mt-6 overflow-hidden rounded-2xl border border-[#e5ebe2] bg-white">
            <div className="flex items-center gap-2 border-b p-5"><h2 className="font-bold">Transaction history</h2><span className="ml-auto text-xs text-[#8a9787]">{rows.length} records</span></div>
            {rows.length ? <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-xs">
                <thead className="bg-[#f7f9f5] text-[#71806f]"><tr><th className="p-4">Date</th><th className="p-4">Type</th><th className="p-4">Category / description</th><th className="p-4">Reference</th><th className="p-4 text-right">Amount</th><th className="p-4">Status</th><th className="p-4">Actions</th></tr></thead>
                <tbody>{rows.map(row => {
                  const hasReversal = rows.some(item => item.reversal_of_id === row.id);
                  const label = row.reversal_of_id ? "Reversal" : hasReversal ? "Reversed" : row.status === "pending" ? "Pending approval" : row.status === "void" ? "Void" : "Posted";
                  return <tr key={row.id} className="border-t border-[#edf0eb]">
                    <td className="p-4">{row.transaction_date}</td>
                    <td className="p-4 capitalize">{row.transaction_type}</td>
                    <td className="p-4"><b>{row.category}</b><p className="mt-1 text-[#899487]">{row.description}</p></td>
                    <td className="p-4">{row.reference || "—"}</td>
                    <td className="p-4 text-right font-bold">{money(Number(row.amount))}</td>
                    <td className="p-4"><span className="inline-flex rounded-full bg-[#f1f5ee] px-2.5 py-1 text-[10px] font-bold text-[#5e795f]">{label}</span></td>
                    <td className="p-4"><div className="flex gap-2">
                      {row.status === "pending" && role !== "analyst" && <button disabled={saving} onClick={() => editPending(row)} className="rounded-lg bg-[#eef3eb] p-2 text-[#42664a]" title="Edit pending record"><Pencil size={14}/></button>}
                      {row.status === "pending" && role === "owner" && <button disabled={saving} onClick={() => void approve(row)} className="rounded-lg bg-[#edf5e9] p-2 text-[#3d704b]" title="Approve and post"><CheckCircle2 size={14}/></button>}
                      {row.status === "posted" && !row.reversal_of_id && role === "owner" && <button disabled={saving || hasReversal} onClick={() => void reverse(row)} className="rounded-lg bg-[#f1effa] p-2 text-[#62508a]" title={hasReversal ? "Already reversed" : "Create linked reversal"}><RotateCcw size={14}/></button>}
                      {row.reversal_of_id && <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#62508a]"><RotateCcw size={12}/> Linked</span>}
                      {row.status === "pending" && role === "owner" && <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#8a6a2f]"><Clock3 size={12}/> Awaiting approval</span>}
                    </div></td>
                  </tr>;
                })}</tbody>
              </table>
            </div> : <p className="p-8 text-center text-sm text-[#899487]">No finance entries have been recorded.</p>}
          </section>
          <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-[#7b887a]"><ShieldCheck size={15} className="mt-0.5 shrink-0"/> Posted transactions are immutable. The Founder can approve pending entries or create a linked reversal; original entries are retained in the audit trail.</p>
        </>}
        {loading && <p className="mt-8 text-sm text-[#68806b]">Loading finance records…</p>}
      </div>
    </main>
  );
}
