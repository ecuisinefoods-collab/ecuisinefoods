"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Check, ChevronDown, CircleAlert, Clock3, Mail, Plus, RefreshCw,
  ShieldCheck, Trash2, UserPlus, Users, UserX, X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type Staff = {
  user_id: string;
  email: string;
  display_name: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
};
const roles = [
  { value: "store_manager", label: "Store manager", description: "Products, stock, pickup, delivery and store operations." },
  { value: "order_officer", label: "Order officer", description: "Customer orders and fulfilment progress." },
  { value: "finance_officer", label: "Finance officer", description: "Finance records and financial entries." },
  { value: "marketing_manager", label: "Marketing manager", description: "Promotional banners and campaigns." },
  { value: "analyst", label: "Analyst", description: "Read-only access to permitted reports." },
];
const formatDate = (value: string) => new Intl.DateTimeFormat("en-NG", { dateStyle: "medium" }).format(new Date(value));

export default function TeamManagementPage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState("order_officer");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Staff | null>(null);
  const [deletePhrase, setDeletePhrase] = useState("");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    if (!supabase) { setError("Database connection is not configured."); setLoading(false); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Please sign in through the admin dashboard."); setLoading(false); return; }
    const { data: profile } = await supabase.from("admin_profiles").select("role,is_active").eq("user_id", user.id).maybeSingle();
    if (!profile?.is_active || profile.role !== "owner") {
      setError("Only the active owner account can manage staff.");
      setLoading(false);
      return;
    }
    setOwnerId(user.id);
    const { data, error: queryError } = await supabase
      .from("admin_profiles")
      .select("user_id,email,display_name,role,is_active,created_at")
      .order("created_at", { ascending: false });
    if (queryError) setError(queryError.message);
    else setStaff((data || []) as Staff[]);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const activeCount = staff.filter(member => member.is_active).length;
  const inactiveCount = staff.length - activeCount;
  const filteredStaff = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return staff;
    return staff.filter(member => [member.email, member.display_name || "", member.role].join(" ").toLowerCase().includes(needle));
  }, [staff, search]);

  async function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    setSaving(true); setError(""); setMessage("");
    const { data, error: invokeError } = await supabase.functions.invoke("invite-admin", {
      body: { email: email.trim(), display_name: displayName.trim(), role },
    });
    if (invokeError) setError(invokeError.message);
    else if (data?.error) setError(data.error);
    else {
      setMessage(data?.message || "Invitation email sent.");
      setEmail(""); setDisplayName("");
      await load();
    }
    setSaving(false);
  }

  async function update(staffer: Staff, changes: Partial<Staff>) {
    if (!supabase || staffer.user_id === ownerId || staffer.role === "owner") return;
    setSaving(true); setError(""); setMessage("");
    const { error: updateError } = await supabase.from("admin_profiles")
      .update({ ...changes, updated_at: new Date().toISOString() })
      .eq("user_id", staffer.user_id);
    if (updateError) setError(updateError.message);
    else {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) await supabase.from("admin_audit_logs").insert({
        actor_user_id: user.id,
        actor_email: user.email,
        action: "update_admin_permissions",
        resource_type: "admin_profile",
        resource_id: staffer.user_id,
        details: changes,
      });
      setMessage("Staff access updated.");
      await load();
    }
    setSaving(false);
  }

  async function removeAccount() {
    if (!supabase || !deleteTarget || deletePhrase !== "DELETE") return;
    setSaving(true); setError(""); setMessage("");
    const { data, error: invokeError } = await supabase.functions.invoke("delete-admin", {
      body: { user_id: deleteTarget.user_id },
    });
    if (invokeError) setError(invokeError.message);
    else if (data?.error) setError(data.error);
    else {
      setMessage(data?.message || "Administrator account removed.");
      setStaff(current => current.filter(member => member.user_id !== deleteTarget.user_id));
      setDeleteTarget(null);
      setDeletePhrase("");
      await load();
    }
    setSaving(false);
  }

  if (loading) return <main className="admin-glass-shell grid min-h-screen place-items-center p-8 text-sm font-semibold text-[#42694b]">Loading team workspace…</main>;

  return (
    <main className="admin-glass-shell admin-team-page min-h-screen px-4 py-7 text-[#24392c] sm:px-7 lg:px-9">
      <div className="mx-auto max-w-6xl">
        <Link href="/admin" className="admin-team-back inline-flex items-center gap-2 text-xs font-bold"><ArrowLeft size={15}/> Back to overview</Link>

        <div className="admin-team-heading mt-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[.2em] text-[#9a7a33]">People & access</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#1d3e2b] sm:text-4xl">Team management</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#718071]">Invite trusted people, give them the right access, and remove staff accounts when they no longer need access to eCuisine.</p>
          </div>
          <span className="admin-team-owner-chip inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold"><ShieldCheck size={15}/> Owner controls</span>
        </div>

        {error && <div role="alert" className="admin-team-alert admin-team-alert--error mt-5 flex items-start gap-3 rounded-2xl p-4 text-sm"><CircleAlert size={18} className="mt-0.5 shrink-0"/><span>{error}</span><button type="button" onClick={() => setError("")} aria-label="Dismiss error" className="ml-auto"><X size={16}/></button></div>}
        {message && <div role="status" className="admin-team-alert admin-team-alert--success mt-5 flex items-start gap-3 rounded-2xl p-4 text-sm"><Check size={18} className="mt-0.5 shrink-0"/><span>{message}</span><button type="button" onClick={() => setMessage("")} aria-label="Dismiss message" className="ml-auto"><X size={16}/></button></div>}

        <section className="admin-team-stats mt-7 grid gap-3 sm:grid-cols-3">
          <article><span className="admin-team-stat-icon"><Users size={18}/></span><p>Admin accounts</p><strong>{staff.length}</strong><small>Owner and invited staff</small></article>
          <article><span className="admin-team-stat-icon admin-team-stat-icon--green"><Check size={18}/></span><p>Active access</p><strong>{activeCount}</strong><small>Accounts currently enabled</small></article>
          <article><span className="admin-team-stat-icon admin-team-stat-icon--muted"><UserX size={18}/></span><p>Disabled access</p><strong>{inactiveCount}</strong><small>Accounts that cannot manage the store</small></article>
        </section>

        <section className="admin-team-invite-panel mt-6 overflow-hidden rounded-[1.6rem]">
          <div className="admin-team-panel-head flex items-center gap-3 px-5 py-5 sm:px-7">
            <span className="admin-team-panel-icon"><UserPlus size={19}/></span>
            <div><h2 className="text-base font-bold">Invite an administrator</h2><p className="mt-1 text-xs text-[#7c897d]">Send a secure invitation. They create their own password.</p></div>
          </div>
          <form onSubmit={invite} className="grid gap-4 px-5 pb-6 sm:grid-cols-2 sm:px-7">
            <label className="admin-team-label">Staff email
              <input required type="email" autoComplete="off" value={email} onChange={event => setEmail(event.target.value)} placeholder="name@example.com"/>
            </label>
            <label className="admin-team-label">Display name <span>(optional)</span>
              <input value={displayName} onChange={event => setDisplayName(event.target.value)} placeholder="Team member name"/>
            </label>
            <label className="admin-team-label sm:col-span-2">Access role
              <div className="relative">
                <select value={role} onChange={event => setRole(event.target.value)}>{roles.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
                <ChevronDown size={15} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#6d806f]"/>
              </div>
              <small>{roles.find(item => item.value === role)?.description}</small>
            </label>
            <div className="flex flex-wrap items-center justify-between gap-3 sm:col-span-2">
              <p className="max-w-xl text-[11px] leading-5 text-[#849083]">Only invite people you trust. Never share the owner password; each person receives their own login and role.</p>
              <button type="submit" disabled={saving || !email.trim()} className="admin-team-primary-button inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-xs font-bold"><Plus size={15}/>{saving ? "Sending invite…" : "Send invitation"}</button>
            </div>
          </form>
        </section>

        <section className="admin-team-list-panel mt-6 overflow-hidden rounded-[1.6rem]">
          <div className="admin-team-panel-head flex flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-7">
            <div><h2 className="text-base font-bold">Administrator accounts</h2><p className="mt-1 text-xs text-[#7c897d]">Manage roles, temporarily disable access, or permanently remove a staff login.</p></div>
            <button type="button" onClick={() => { setLoading(true); setError(""); void load(); }} disabled={saving} className="admin-team-refresh inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold"><RefreshCw size={14}/> Refresh list</button>
          </div>
          <div className="admin-team-list-toolbar flex flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-7">
            <span className="text-xs font-bold text-[#6c7e6e]">{filteredStaff.length} account{filteredStaff.length === 1 ? "" : "s"} shown</span>
            <input aria-label="Search administrator accounts" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search name, email or role…" className="admin-team-search"/>
          </div>
          <div className="admin-team-table-wrap">
            <table className="admin-team-table w-full text-left">
              <thead><tr><th>Administrator</th><th>Role</th><th>Status</th><th>Added</th><th className="text-right">Actions</th></tr></thead>
              <tbody>
                {filteredStaff.map(member => {
                  const isOwner = member.user_id === ownerId || member.role === "owner";
                  return <tr key={member.user_id}>
                    <td><div className="flex min-w-0 items-center gap-3"><span className="admin-team-avatar">{(member.display_name || member.email).slice(0, 1).toUpperCase()}</span><span className="min-w-0"><strong className="block truncate text-xs">{member.display_name || "Administrator"}</strong><small className="mt-1 block truncate text-[11px]">{member.email}</small></span></div></td>
                    <td>{isOwner ? <span className="admin-team-owner-role"><ShieldCheck size={13}/> CEO / Owner</span> : <select aria-label={"Role for " + member.email} disabled={saving} value={member.role} onChange={event => void update(member, { role: event.target.value })}>{roles.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select>}</td>
                    <td><span className={member.is_active ? "admin-team-status is-active" : "admin-team-status is-disabled"}><i/>{member.is_active ? "Active" : "Disabled"}</span></td>
                    <td className="admin-team-date"><Clock3 size={13}/>{formatDate(member.created_at)}</td>
                    <td><div className="flex items-center justify-end gap-2">{!isOwner && <><button type="button" disabled={saving} onClick={() => void update(member, { is_active: !member.is_active })} className="admin-team-action-button">{member.is_active ? "Disable" : "Enable"}</button><button type="button" disabled={saving} onClick={() => { setDeleteTarget(member); setDeletePhrase(""); }} className="admin-team-delete-button" title={"Delete " + member.email} aria-label={"Delete " + member.email}><Trash2 size={14}/></button></>}</div></td>
                  </tr>;
                })}
                {!filteredStaff.length && <tr><td colSpan={5} className="py-12 text-center text-xs text-[#879487]">No administrator accounts match your search.</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="admin-team-security-note mx-5 mb-5 flex items-start gap-2 rounded-xl p-3 sm:mx-7"><ShieldCheck size={15} className="mt-0.5 shrink-0"/><p className="text-[10px] leading-5">Your CEO / owner account is protected. Staff removal disables access first, then removes the Supabase login and its refresh sessions. Existing access tokens can remain valid until expiry, but disabled profiles no longer satisfy eCuisine admin permissions.</p></div>
        </section>
      </div>

      {deleteTarget && (
        <div className="admin-team-dialog-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget && !saving) setDeleteTarget(null); }}>
          <section className="admin-team-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-admin-title">
            <div className="admin-team-dialog-icon"><Trash2 size={21}/></div>
            <button type="button" onClick={() => { setDeleteTarget(null); setDeletePhrase(""); }} disabled={saving} className="admin-team-dialog-close" aria-label="Close dialog"><X size={18}/></button>
            <p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-[#a35a4c]">Permanent account removal</p>
            <h2 id="delete-admin-title" className="mt-2 text-xl font-bold text-[#26392c]">Remove this administrator?</h2>
            <p className="mt-2 text-sm leading-6 text-[#718071]">This permanently removes the login for <strong className="text-[#344936]">{deleteTarget.display_name || deleteTarget.email}</strong> ({deleteTarget.email}). They will no longer be able to sign in as an eCuisine administrator. This action cannot be undone.</p>
            <label className="admin-team-label mt-5">Type <strong>DELETE</strong> to confirm
              <input autoComplete="off" value={deletePhrase} onChange={event => setDeletePhrase(event.target.value)} placeholder="Type DELETE"/>
            </label>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button type="button" disabled={saving} onClick={() => { setDeleteTarget(null); setDeletePhrase(""); }} className="admin-team-cancel-button">Cancel</button>
              <button type="button" disabled={saving || deletePhrase !== "DELETE"} onClick={() => void removeAccount()} className="admin-team-confirm-delete">{saving ? "Removing account…" : "Permanently remove"}</button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
