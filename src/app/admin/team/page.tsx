"use client";
import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, ShieldCheck, UserPlus, UserX, Users } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Staff={user_id:string;email:string;display_name:string|null;role:string;is_active:boolean;created_at:string};
const roles=[
 {value:"store_manager",label:"Store manager",description:"Products, stock, pickup, delivery and general store operations."},
 {value:"order_officer",label:"Order officer",description:"View customer orders and update fulfilment progress."},
 {value:"finance_officer",label:"Finance officer",description:"View finance records and manage financial entries."},
 {value:"marketing_manager",label:"Marketing manager",description:"Create, edit and schedule promotional banners."},
 {value:"analyst",label:"Analyst (read-only)",description:"View permitted orders, finance summaries and analytics."}
];

export default function TeamManagementPage(){
 const [staff,setStaff]=useState<Staff[]>([]);
 const [email,setEmail]=useState("");
 const [displayName,setDisplayName]=useState("");
 const [role,setRole]=useState("order_officer");
 const [loading,setLoading]=useState(true);
 const [saving,setSaving]=useState(false);
 const [error,setError]=useState("");
 const [message,setMessage]=useState("");
 const [ownerId,setOwnerId]=useState("");
 const load=useCallback(async()=>{
  if(!supabase){setError("Database connection is not configured.");setLoading(false);return;}
  const {data:{user}}=await supabase.auth.getUser();
  if(!user){setError("Please sign in through the admin dashboard.");setLoading(false);return;}
  const {data:profile}=await supabase.from("admin_profiles").select("role,is_active").eq("user_id",user.id).maybeSingle();
  if(!profile?.is_active||profile.role!=="owner"){setError("Only the active owner account can manage staff.");setLoading(false);return;}
  setOwnerId(user.id);
  const {data,error:queryError}=await supabase.from("admin_profiles").select("user_id,email,display_name,role,is_active,created_at").order("created_at",{ascending:false});
  if(queryError)setError(queryError.message);else setStaff((data||[]) as Staff[]);
  setLoading(false);
 },[]);
 useEffect(()=>{void load();},[load]);
 async function invite(e:FormEvent){
  e.preventDefault();if(!supabase)return;
  setSaving(true);setError("");setMessage("");
  const {data,error:invokeError}=await supabase.functions.invoke("invite-admin",{body:{email:email.trim(),display_name:displayName.trim(),role}});
  if(invokeError)setError(invokeError.message);
  else if(data?.error)setError(data.error);
  else{setMessage(data?.message||"Invitation sent.");setEmail("");setDisplayName("");await load();}
  setSaving(false);
 }
 async function update(staffer:Staff,changes:Partial<Staff>){
  if(!supabase||staffer.user_id===ownerId)return;
  setSaving(true);setError("");setMessage("");
  const {error:updateError}=await supabase.from("admin_profiles").update({...changes,updated_at:new Date().toISOString()}).eq("user_id",staffer.user_id);
  if(updateError)setError(updateError.message);
  else{
   const {data:{user}}=await supabase.auth.getUser();
   if(user)await supabase.from("admin_audit_logs").insert({actor_user_id:user.id,actor_email:user.email,action:"update_admin_permissions",resource_type:"admin_profile",resource_id:staffer.user_id,details:changes});
   setMessage("Staff access updated.");await load();
  }
  setSaving(false);
 }
 if(loading)return <main className="admin-glass-shell p-10">Loading staff permissions…</main>;
 return <main className="admin-glass-shell min-h-screen px-4 py-8 text-[#25392b] sm:px-8"><div className="mx-auto max-w-5xl">
  <Link href="/admin" className="inline-flex items-center gap-2 text-sm font-semibold text-[#42694b]"><ArrowLeft size={16}/> Admin dashboard</Link>
  <div className="mt-6 flex items-center gap-3"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/70 text-[#245b42] shadow"><Users size={22}/></span><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#8a9787]">Access control</p><h1 className="text-3xl font-semibold text-[#1e3b29]">Team & permissions</h1><p className="mt-1 text-sm text-[#718071]">Invite staff and control what each admin role is allowed to do.</p></div></div>
  {error&&<p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}{message&&<p className="mt-5 rounded-xl bg-green-50 p-4 text-sm text-green-800">{message}</p>}
  <form onSubmit={invite} className="mt-6 grid gap-4 rounded-3xl border border-white/70 bg-white/65 p-5 shadow-xl shadow-[#506f56]/10 backdrop-blur-xl sm:grid-cols-2">
   <h2 className="flex items-center gap-2 font-bold sm:col-span-2"><UserPlus size={17}/> Invite a new administrator</h2>
   <label className="text-xs font-semibold">Staff email<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="staff@example.com" className="mt-1 block w-full rounded-xl border p-3 text-sm"/></label>
   <label className="text-xs font-semibold">Display name<input value={displayName} onChange={e=>setDisplayName(e.target.value)} placeholder="Staff member name" className="mt-1 block w-full rounded-xl border p-3 text-sm"/></label>
   <label className="text-xs font-semibold sm:col-span-2">Admin role<select value={role} onChange={e=>setRole(e.target.value)} className="mt-1 block w-full rounded-xl border p-3 text-sm">{roles.map(r=><option key={r.value} value={r.value}>{r.label} — {r.description}</option>)}</select></label>
   <button disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#245b42] px-5 py-3 text-sm font-bold text-white disabled:opacity-50 sm:col-span-2"><Mail size={15}/>{saving?"Sending invitation…":"Send secure invitation"}</button>
   <p className="text-xs leading-5 text-[#829080] sm:col-span-2">The invite is emailed through Supabase Auth. Staff must accept the invitation and set their own password; never share your owner password.</p>
  </form>
  <section className="mt-7 rounded-3xl border border-white/70 bg-white/65 p-5 shadow-xl shadow-[#506f56]/10 backdrop-blur-xl">
   <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-bold">Administrator accounts ({staff.length})</h2><p className="mt-1 text-xs text-[#829080]">You cannot deactivate or change the owner account from this list.</p></div><span className="rounded-full bg-[#edf3e9] px-3 py-1 text-xs font-bold text-[#42664a]">{staff.filter(s=>s.is_active).length} active</span></div>
   <div className="mt-4 divide-y divide-[#dce6da]/70">{staff.map(s=><article key={s.user_id} className="grid gap-3 py-4 md:grid-cols-[1.2fr_1fr_auto] md:items-center">
    <div><p className="text-sm font-bold">{s.display_name||s.email}</p><p className="mt-1 text-xs text-[#7c897b]">{s.email}</p><p className="mt-1 text-[10px] text-[#9aa396]">{s.user_id===ownerId?"Owner account":roles.find(r=>r.value===s.role)?.label||s.role}</p></div>
    {s.user_id===ownerId?<div className="text-xs font-semibold text-[#42664a]"><ShieldCheck size={14} className="mr-1 inline"/> Full owner access</div>:<div className="flex flex-wrap gap-2"><select value={s.role} disabled={saving} onChange={e=>void update(s,{role:e.target.value})} className="min-w-40 rounded-lg border px-3 py-2 text-xs">{roles.map(r=><option key={r.value} value={r.value}>{r.label}</option>)}</select><span className={s.is_active?"self-center text-xs font-bold text-green-700":"self-center text-xs font-bold text-gray-500"}>{s.is_active?"Active":"Disabled"}</span></div>}
    {s.user_id!==ownerId&&<button disabled={saving} onClick={()=>void update(s,{is_active:!s.is_active})} className="inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold"><UserX size={13}/>{s.is_active?"Deactivate":"Reactivate"}</button>}
   </article>)}{!staff.length&&<p className="py-8 text-center text-sm text-[#899487]">No staff accounts yet.</p>}</div>
  </section>
 </div></main>;
}
