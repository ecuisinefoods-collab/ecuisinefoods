"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, RefreshCw, ShieldAlert, Download, Pencil, Trash2 } from "lucide-react";

type Order = {
  id: string; order_number: number; customer_name: string; phone: string; email: string | null;
  fulfillment_method: string; pickup_location_id: string | null; delivery_state: string | null;
  delivery_city: string | null; street_address: string | null; house_number_landmark: string | null;
  order_notes: string | null; status: string; subtotal: number; delivery_fee: number; total: number; created_at: string;
};
type Item = { id: string; order_id: string; product_name: string; pack_size: string; quantity: number; line_total: number };
const statuses = ["New", "Confirmed", "Processing", "Ready for pickup", "Out for delivery", "Completed", "Cancelled"];
const money = (n: number) => new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(Number(n) || 0);

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [allowed, setAllowed] = useState(false);\n  const [role, setRole] = useState("");
  const [saving, setSaving] = useState("");

  const load = useCallback(async () => {
    if (!supabase) { setError("Database connection is not configured."); setLoading(false); return; }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setError("Please sign in through the admin dashboard first."); setLoading(false); return; }
    const { data: profile, error: profileError } = await supabase.from("admin_profiles").select("role,is_active").eq("user_id", session.user.id).maybeSingle();
    if (profileError || !profile?.is_active || !["owner", "store_manager", "order_officer", "finance_officer", "analyst"].includes(profile.role)) {
      setError("Your account does not have permission to view customer orders."); setLoading(false); return;
    }
    setAllowed(true);\n    setRole(profile.role);
    const { data, error: orderError } = await supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(150);
    if (orderError) { setError(orderError.message); setLoading(false); return; }
    const rows = (data || []) as Order[];
    setOrders(rows);
    if (rows.length) {
      const { data: itemRows, error: itemError } = await supabase.from("order_items").select("id,order_id,product_name,pack_size,quantity,line_total").in("order_id", rows.map(o => o.id));
      if (itemError) setError(itemError.message); else setItems((itemRows || []) as Item[]);
    } else setItems([]);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function updateStatus(order: Order, status: string) {
    if (!supabase) return;
    setSaving(order.id); setError("");
    const { error: updateError } = await supabase.from("orders").update({ status, updated_at: new Date().toISOString() }).eq("id", order.id);
    if (updateError) setError(updateError.message);
    else setOrders(current => current.map(o => o.id === order.id ? { ...o, status } : o));
    setSaving("");
  }

  function downloadOrders(){const cols=["order_number","customer_name","phone","email","fulfillment_method","delivery_state","delivery_city","street_address","house_number_landmark","order_notes","status","subtotal","delivery_fee","total","created_at"];const safe=(v:unknown)=>{let x=String(v??"");if(/^[=+@-]/.test(x))x="'"+x;return '"'+x.replace(/"/g,'""')+'"';};const body=[cols.join(","),...orders.map(o=>cols.map(k=>safe((o as unknown as Record<string,unknown>)[k])).join(","))].join("\\r\\n");const url=URL.createObjectURL(new Blob(["\\uFEFF"+body],{type:"text/csv;charset=utf-8"}));const a=document.createElement("a");a.href=url;a.download="ecuisinefoods-orders-"+new Date().toISOString().slice(0,10)+".csv";a.click();URL.revokeObjectURL(url);}
  async function editOrder(order:Order){if(!supabase||!["owner","store_manager","order_officer"].includes(role))return;const customer_name=window.prompt("Customer name",order.customer_name);if(customer_name===null)return;const phone=window.prompt("Phone number",order.phone);if(phone===null)return;const email=window.prompt("Email (leave blank if none)",order.email||"");if(email===null)return;const order_notes=window.prompt("Order notes",order.order_notes||"");if(order_notes===null)return;setSaving(order.id);const {error:e}=await supabase.from("orders").update({customer_name:customer_name.trim(),phone:phone.trim(),email:email.trim()||null,order_notes:order_notes.trim()||null,updated_at:new Date().toISOString()}).eq("id",order.id);if(e)setError(e.message);else await load();setSaving("");}
  async function deleteOrder(order:Order){if(!supabase||role!=="owner")return;if(!window.confirm("Permanently erase order #"+order.order_number+" and its associated line items if database rules permit? This cannot be undone and affects sales reports."))return;setSaving(order.id);const {error:e}=await supabase.from("orders").delete().eq("id",order.id);if(e)setError(e.message);else await load();setSaving("");}
  return <main className="min-h-screen bg-[#f5f7f3] px-4 py-8 text-[#25392b] sm:px-8">
    <div className="mx-auto max-w-6xl">
      <Link href="/admin" className="inline-flex items-center gap-2 text-sm font-semibold text-[#42694b]"><ArrowLeft size={16}/> Admin dashboard</Link>
      <div className="mt-6 flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#8a9787]">Order management</p><h1 className="mt-1 text-3xl font-semibold text-[#1e3b29]">Customer orders</h1><p className="mt-2 text-sm text-[#7b887a]">Review customer details, line items and fulfilment progress.</p></div>
        <button onClick={downloadOrders} className="inline-flex items-center gap-2 rounded-xl border border-[#e3e9e0] bg-white px-4 py-3 text-xs font-bold"><Download size={14}/> Download CSV</button><button onClick={() => { setLoading(true); setError(""); void load(); }} className="inline-flex items-center gap-2 rounded-xl border border-[#e3e9e0] bg-white px-4 py-3 text-xs font-bold"><RefreshCw size={14}/> Refresh</button>
      </div>
      {error && <p role="alert" className="mt-5 flex items-center gap-2 rounded-xl bg-red-50 p-4 text-sm text-red-700"><ShieldAlert size={17}/>{error}</p>}
      {loading ? <p className="mt-8 text-sm text-[#68806b]">Loading orders…</p> : !allowed ? null : orders.length === 0 ?
        <div className="mt-8 rounded-2xl border border-[#e5ebe2] bg-white p-10 text-center"><h2 className="font-bold">No customer orders yet</h2><p className="mt-2 text-sm text-[#879286]">New orders will appear here when secure order submission is enabled.</p></div> :
        <div className="mt-7 space-y-4">{orders.map(order => <article key={order.id} className="rounded-2xl border border-[#e5ebe2] bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><p className="text-xs font-bold uppercase tracking-wider text-[#7d8b7c]">Order #{order.order_number}</p><h2 className="mt-1 text-lg font-bold">{order.customer_name}</h2><p className="mt-1 text-xs text-[#7d8b7c]">{order.phone}{order.email ? " · " + order.email : ""} · {new Date(order.created_at).toLocaleString("en-NG")}</p></div>
            <div className="text-right"><p className="text-lg font-bold text-[#245b42]">{money(order.total)}</p><div className="mb-2 flex justify-end gap-2"><button disabled={saving===order.id} onClick={()=>void editOrder(order)} className="inline-flex items-center gap-1 rounded-lg bg-[#eef3eb] px-2 py-1.5 text-[10px] font-bold text-[#42664a]"><Pencil size={12}/> Edit details</button>{role==="owner"&&<button disabled={saving===order.id} onClick={()=>void deleteOrder(order)} className="inline-flex items-center gap-1 rounded-lg bg-[#fbefed] px-2 py-1.5 text-[10px] font-bold text-[#a05f54]"><Trash2 size={12}/> Erase</button>}</div><select disabled={saving === order.id} value={order.status} onChange={e => void updateStatus(order, e.target.value)} className="mt-2 rounded-lg border border-[#dfe6dc] bg-[#fbfcfa] px-3 py-2 text-xs font-bold">{statuses.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
          </div>
          <div className="mt-4 grid gap-4 border-t border-[#edf0eb] pt-4 md:grid-cols-2">
            <div><p className="text-[10px] font-bold uppercase tracking-wider text-[#8a9787]">Items</p><div className="mt-2 space-y-2">{items.filter(i => i.order_id === order.id).map(i => <div key={i.id} className="flex justify-between gap-3 text-xs"><span>{i.product_name} · {i.pack_size} × {i.quantity}</span><b>{money(i.line_total)}</b></div>)}</div></div>
            <div><p className="text-[10px] font-bold uppercase tracking-wider text-[#8a9787]">Fulfilment</p><p className="mt-2 text-xs font-semibold capitalize">{order.fulfillment_method}</p><p className="mt-1 text-xs text-[#657266]">{order.fulfillment_method === "pickup" ? "Pickup location reference: " + (order.pickup_location_id || "Not specified") : [order.street_address, order.delivery_city, order.delivery_state, order.house_number_landmark].filter(Boolean).join(", ")}</p>{order.order_notes && <p className="mt-2 text-xs text-[#657266]">Note: {order.order_notes}</p>}<p className="mt-3 text-xs text-[#657266]">Subtotal {money(order.subtotal)} · Delivery {money(order.delivery_fee)}</p></div>
          </div>
        </article>)}</div>}
    </div>
  </main>;
}
