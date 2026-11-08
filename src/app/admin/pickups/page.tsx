"use client";
import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, MapPin, Plus, Save, Power } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Pickup = { id:string; city:string; location_name:string; address:string|null; opening_hours:string|null; contact_phone:string|null; instructions:string|null; is_active:boolean; sort_order:number };
type Draft = { city:string; location_name:string; address:string; opening_hours:string; contact_phone:string; instructions:string; is_active:boolean; sort_order:string };
const empty:Draft={city:"",location_name:"",address:"",opening_hours:"",contact_phone:"",instructions:"",is_active:true,sort_order:"0"};

export default function PickupManagementPage(){
 const [rows,setRows]=useState<Pickup[]>([]);
 const [draft,setDraft]=useState<Draft>(empty);
 const [editing,setEditing]=useState<string|null>(null);
 const [role,setRole]=useState("");
 const [loading,setLoading]=useState(true);
 const [saving,setSaving]=useState(false);
 const [error,setError]=useState("");
 const [message,setMessage]=useState("");
 const load=useCallback(async()=>{
  if(!supabase){setError("Database connection is not configured.");setLoading(false);return;}
  const {data:{user}}=await supabase.auth.getUser();
  if(!user){setError("Please sign in through the admin dashboard.");setLoading(false);return;}
  const {data:profile}=await supabase.from("admin_profiles").select("role,is_active").eq("user_id",user.id).maybeSingle();
  if(!profile?.is_active||!["owner","store_manager"].includes(profile.role)){setError("Only the owner or a store manager can manage pickup locations.");setLoading(false);return;}
  setRole(profile.role);
  const {data,error:queryError}=await supabase.from("pickup_locations").select("*").order("sort_order").order("city").order("location_name");
  if(queryError)setError(queryError.message);else setRows((data||[]) as Pickup[]);
  setLoading(false);
 },[]);
 useEffect(()=>{void load();},[load]);
 function reset(){setDraft(empty);setEditing(null);}
 async function save(e:FormEvent){
  e.preventDefault();if(!supabase)return;
  const city=draft.city.trim(), location_name=draft.location_name.trim();
  if(!city||!location_name){setError("Enter both a city and a pickup location name.");return;}
  setSaving(true);setError("");setMessage("");
  const payload={city,location_name,address:draft.address.trim()||null,opening_hours:draft.opening_hours.trim()||null,contact_phone:draft.contact_phone.trim()||null,instructions:draft.instructions.trim()||null,is_active:draft.is_active,sort_order:Number(draft.sort_order)||0};
  const result=editing?await supabase.from("pickup_locations").update(payload).eq("id",editing):await supabase.from("pickup_locations").insert(payload);
  if(result.error)setError(result.error.message);else{
   const {data:{user}}=await supabase.auth.getUser();
   if(user)await supabase.from("admin_audit_logs").insert({actor_user_id:user.id,actor_email:user.email,action:editing?"update_pickup_location":"create_pickup_location",resource_type:"pickup_location",resource_id:editing,details:{city,location_name,is_active:draft.is_active}});
   setMessage(editing?"Pickup location updated.":"Pickup location added.");reset();await load();
  }
  setSaving(false);
 }
 function edit(row:Pickup){setEditing(row.id);setDraft({city:row.city,location_name:row.location_name,address:row.address||"",opening_hours:row.opening_hours||"",contact_phone:row.contact_phone||"",instructions:row.instructions||"",is_active:row.is_active,sort_order:String(row.sort_order??0)});window.scrollTo({top:0,behavior:"smooth"});}
 async function toggle(row:Pickup){if(!supabase)return;const {error:e}=await supabase.from("pickup_locations").update({is_active:!row.is_active}).eq("id",row.id);if(e)setError(e.message);else{setMessage(row.is_active?"Pickup point paused.":"Pickup point activated.");await load();}}
 if(loading)return <main className="admin-glass-shell p-10">Loading pickup locations…</main>;
 if(!role)return <main className="admin-glass-shell min-h-screen p-8"><p className="text-red-700">{error}</p><Link href="/admin">Back to admin</Link></main>;
 return <main className="admin-glass-shell min-h-screen px-4 py-8 text-[#25392b] sm:px-8"><div className="mx-auto max-w-5xl">
  <Link href="/admin" className="inline-flex items-center gap-2 text-sm font-semibold text-[#42694b]"><ArrowLeft size={16}/> Admin dashboard</Link>
  <div className="mt-6 flex items-center gap-3"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/70 text-[#245b42] shadow"><MapPin size={22}/></span><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#8a9787]">Fulfilment settings</p><h1 className="text-3xl font-semibold text-[#1e3b29]">Pickup locations</h1><p className="mt-1 text-sm text-[#718071]">Manage the collection points customers can choose at checkout.</p></div></div>
  {error&&<p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}{message&&<p className="mt-5 rounded-xl bg-green-50 p-4 text-sm text-green-800">{message}</p>}
  <form onSubmit={save} className="mt-6 grid gap-4 rounded-3xl border border-white/70 bg-white/65 p-5 shadow-xl shadow-[#506f56]/10 backdrop-blur-xl sm:grid-cols-2">
   <h2 className="font-bold sm:col-span-2">{editing?"Edit pickup point":"Add a pickup point"}</h2>
   <label className="text-xs font-semibold">City / town<input required value={draft.city} onChange={e=>setDraft({...draft,city:e.target.value})} placeholder="e.g. Jos" className="mt-1 block w-full rounded-xl border p-3 text-sm"/></label>
   <label className="text-xs font-semibold">Location name<input required value={draft.location_name} onChange={e=>setDraft({...draft,location_name:e.target.value})} placeholder="e.g. Terminus" className="mt-1 block w-full rounded-xl border p-3 text-sm"/></label>
   <label className="text-xs font-semibold sm:col-span-2">Full address<input value={draft.address} onChange={e=>setDraft({...draft,address:e.target.value})} placeholder="Street, building, landmark and directions" className="mt-1 block w-full rounded-xl border p-3 text-sm"/></label>
   <label className="text-xs font-semibold">Operating hours<input value={draft.opening_hours} onChange={e=>setDraft({...draft,opening_hours:e.target.value})} placeholder="e.g. Mon–Sat, 9am–5pm" className="mt-1 block w-full rounded-xl border p-3 text-sm"/></label>
   <label className="text-xs font-semibold">Contact phone<input value={draft.contact_phone} onChange={e=>setDraft({...draft,contact_phone:e.target.value})} placeholder="Optional location contact" className="mt-1 block w-full rounded-xl border p-3 text-sm"/></label>
   <label className="text-xs font-semibold sm:col-span-2">Collection instructions<textarea rows={2} value={draft.instructions} onChange={e=>setDraft({...draft,instructions:e.target.value})} placeholder="Tell customers where to go and what to bring." className="mt-1 block w-full rounded-xl border p-3 text-sm"/></label>
   <label className="text-xs font-semibold">Display order<input type="number" value={draft.sort_order} onChange={e=>setDraft({...draft,sort_order:e.target.value})} className="mt-1 block w-full rounded-xl border p-3 text-sm"/></label>
   <label className="flex items-center gap-2 self-end pb-3 text-sm"><input type="checkbox" checked={draft.is_active} onChange={e=>setDraft({...draft,is_active:e.target.checked})}/> Available at checkout</label>
   <div className="flex gap-2 sm:col-span-2"><button disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-[#245b42] px-5 py-3 text-sm font-bold text-white"><Save size={15}/>{saving?"Saving…":editing?"Save changes":"Add pickup point"}</button>{editing&&<button type="button" onClick={reset} className="rounded-xl border px-5 py-3 text-sm">Cancel</button>}</div>
  </form>
  <section className="mt-7 rounded-3xl border border-white/70 bg-white/65 p-5 shadow-xl shadow-[#506f56]/10 backdrop-blur-xl"><div className="flex items-center justify-between gap-3"><div><h2 className="font-bold">Your pickup points ({rows.length})</h2><p className="mt-1 text-xs text-[#829080]">Pause a location instead of deleting it, so old order references remain intact.</p></div><span className="rounded-full bg-[#edf3e9] px-3 py-1 text-xs font-bold text-[#42664a]">{rows.filter(x=>x.is_active).length} active</span></div>
   <div className="mt-4 divide-y divide-[#dce6da]/70">{rows.map(row=><article key={row.id} className="flex flex-wrap items-center gap-3 py-4"><MapPin size={18} className="text-[#66816a]"/><div className="min-w-0 flex-1"><p className="text-sm font-bold">{row.city} · {row.location_name}</p><p className="mt-1 text-xs leading-5 text-[#7c897b]">{row.address||"Address not added"}{row.opening_hours?" · "+row.opening_hours:""}</p></div><span className={row.is_active?"text-xs font-bold text-green-700":"text-xs font-bold text-gray-500"}>{row.is_active?"Active":"Paused"}</span><button onClick={()=>edit(row)} className="rounded-lg border px-3 py-2 text-xs font-bold">Edit</button><button onClick={()=>void toggle(row)} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs"><Power size={12}/>{row.is_active?"Pause":"Activate"}</button></article>)}{!rows.length&&<p className="py-8 text-center text-sm text-[#899487]">No pickup points have been created yet.</p>}</div>
  </section>
 </div></main>;
}
