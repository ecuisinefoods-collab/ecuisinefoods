"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Building2, Clock3, Mail, MessageSquare, RefreshCw, ShieldCheck, UserRound } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Inquiry = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  organization: string | null;
  interest: string;
  message: string;
  status: "new" | "reviewing" | "contacted" | "closed";
  created_at: string;
  updated_at: string;
};

const statuses: Inquiry["status"][] = ["new", "reviewing", "contacted", "closed"];
const dateLabel = (value: string) => new Date(value).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" });

export default function PartnershipInboxPage() {
  const [items, setItems] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [error, setError] = useState("");
  const [role, setRole] = useState("");

  const load = useCallback(async () => {
    if (!supabase) { setError("Database connection is not configured."); setLoading(false); return; }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setError("Please sign in through the admin dashboard."); setLoading(false); return; }
    const { data: profile, error: profileError } = await supabase
      .from("admin_profiles")
      .select("role,is_active")
      .eq("user_id", session.user.id)
      .maybeSingle();
    if (profileError || !profile?.is_active || !["owner", "store_manager", "marketing_manager"].includes(profile.role)) {
      setError("Your administrator role does not have access to partnership enquiries.");
      setLoading(false);
      return;
    }
    setRole(profile.role);
    const { data, error: queryError } = await supabase
      .from("partnership_inquiries")
      .select("id,full_name,email,phone,organization,interest,message,status,created_at,updated_at")
      .order("created_at", { ascending: false })
      .limit(150);
    if (queryError) setError(queryError.message);
    else { setItems((data ?? []) as Inquiry[]); setError(""); }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function updateStatus(item: Inquiry, status: Inquiry["status"]) {
    if (!supabase || status === item.status) return;
    setSaving(item.id);
    setError("");
    const { error: updateError } = await supabase
      .from("partnership_inquiries")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", item.id);
    if (updateError) setError(updateError.message);
    else setItems(current => current.map(row => row.id === item.id ? { ...row, status, updated_at: new Date().toISOString() } : row));
    setSaving("");
  }

  const counts = {
    new: items.filter(item => item.status === "new").length,
    reviewing: items.filter(item => item.status === "reviewing").length,
    contacted: items.filter(item => item.status === "contacted").length,
    closed: items.filter(item => item.status === "closed").length,
  };

  return (
    <main className="admin-glass-shell min-h-screen px-4 py-8 text-[#25392b] sm:px-8">
      <div className="mx-auto max-w-6xl">
        <Link href="/admin" className="inline-flex items-center gap-2 text-sm font-semibold text-[#42694b]"><ArrowLeft size={16}/> Admin dashboard</Link>
        <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#9b7835]">Business development</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-[#1e352b] sm:text-4xl">Partnership enquiries</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#758276]">Review potential distribution, corporate supply, collaboration and strategic partnership opportunities.</p>
          </div>
          <button type="button" onClick={()=>{setLoading(true); void load();}} className="inline-flex items-center gap-2 rounded-xl border border-[#d9e0db] bg-white px-4 py-3 text-xs font-bold text-[#344c3c]"><RefreshCw size={14}/> Refresh inbox</button>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {([
            ["New", counts.new, "new"],
            ["Reviewing", counts.reviewing, "reviewing"],
            ["Contacted", counts.contacted, "contacted"],
            ["Closed", counts.closed, "closed"],
          ] as const).map(([label,value,key])=><article key={key} className="rounded-2xl border border-white/80 bg-white/80 p-4 shadow-lg shadow-[#183d2b]/[.04]"><p className="text-[10px] font-black uppercase tracking-[.16em] text-[#819085]">{label}</p><p className="mt-2 text-3xl font-black tabular-nums text-[#1d3d2c]">{value}</p></article>)}
        </div>

        {error ? <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
        {loading ? <p className="mt-8 text-sm font-medium text-[#69806e]">Loading partnership enquiries…</p> : !error && items.length === 0 ? (
          <div className="mt-7 rounded-3xl border border-white/80 bg-white/80 px-6 py-14 text-center shadow-xl">
            <MessageSquare size={30} className="mx-auto text-[#93a394]"/>
            <h2 className="mt-4 text-lg font-bold text-[#294232]">No enquiries yet</h2>
            <p className="mt-2 text-sm text-[#879487]">New partnership opportunities will appear here when visitors submit the public form.</p>
            <Link href="/partnerships" target="_blank" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#173e2d] px-4 py-3 text-xs font-bold text-white">Open public enquiry page</Link>
          </div>
        ) : !error ? (
          <div className="mt-7 space-y-4">
            {items.map(item=><article key={item.id} className="rounded-[1.6rem] border border-white/80 bg-white/85 p-5 shadow-xl shadow-[#173d29]/[.055] sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-[#eaf1e9] px-3 py-1 text-[9px] font-black uppercase tracking-[.16em] text-[#315b43]">{item.interest}</span>
                    {item.status === "new" ? <span className="rounded-full bg-[#f8edcf] px-3 py-1 text-[9px] font-black uppercase tracking-[.12em] text-[#8b681e]">New</span> : null}
                  </div>
                  <h2 className="mt-3 text-lg font-black text-[#203b2b]">{item.full_name}</h2>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-xs text-[#718174]">
                    <a className="inline-flex items-center gap-1.5 font-semibold hover:text-[#0b6849]" href={`mailto:${encodeURIComponent(item.email)}`}><Mail size={13}/>{item.email}</a>
                    {item.phone ? <a className="inline-flex items-center gap-1.5 font-semibold hover:text-[#0b6849]" href={`tel:${item.phone.replace(/[^+0-9]/g,"")}`}><UserRound size={13}/>{item.phone}</a> : null}
                    {item.organization ? <span className="inline-flex items-center gap-1.5"><Building2 size={13}/>{item.organization}</span> : null}
                  </div>
                </div>
                <div className="flex min-w-[160px] flex-col items-start gap-2 sm:items-end">
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-[#8a9787]"><Clock3 size={12}/>{dateLabel(item.created_at)}</span>
                  <select value={item.status} disabled={saving===item.id} onChange={e=>void updateStatus(item,e.target.value as Inquiry["status"])} aria-label={`Update status for ${item.full_name}`} className="rounded-xl border border-[#dce5dc] bg-white px-3 py-2.5 text-xs font-bold text-[#34513e]">
                    {statuses.map(status=><option key={status} value={status}>{status.charAt(0).toUpperCase()+status.slice(1)}</option>)}
                  </select>
                </div>
              </div>
              <div className="mt-5 rounded-2xl border border-[#e7ece5] bg-[#f8faf7] p-4">
                <p className="text-[9px] font-black uppercase tracking-[.16em] text-[#8c9a8d]">Opportunity details</p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-[#52695a]">{item.message}</p>
              </div>
            </article>)}
          </div>
        ) : null}
        <p className="mt-7 flex items-center gap-2 text-[10px] leading-5 text-[#93a092]"><ShieldCheck size={13}/> Enquiry details are visible only to approved business-development and store-management roles.</p>
        <span className="sr-only">Signed in role: {role}</span>
      </div>
    </main>
  );
}
