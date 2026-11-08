"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  Activity, ArrowDownRight, ArrowUpRight, BarChart3, Boxes, CalendarDays,
  ChevronRight, CircleDollarSign, ClipboardList, LayoutDashboard, LogOut,
  Megaphone, Package, ShieldCheck, ShoppingBag, Users, Wallet,
} from "lucide-react";

type AdminProfile = {
  user_id: string;
  email: string;
  display_name: string | null;
  role: string;
  is_active: boolean;
};
type Order = {
  id: string;
  order_number: number;
  customer_name: string;
  total: number;
  status: string;
  created_at: string;
};

const money = (value: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(value || 0);

const navItems = [
  { label: "Overview", icon: LayoutDashboard, active: true },
  { label: "Orders", icon: ClipboardList },
  { label: "Products & stock", icon: Package },
  { label: "Promotions & banners", icon: Megaphone },
  { label: "Finances", icon: Wallet },
  { label: "Team & permissions", icon: Users },
  { label: "Analytics", icon: BarChart3 },
];

export default function AdminPage() {
  const [email, setEmail] = useState("ecuisinefoods@gmail.com");
  const [password, setPassword] = useState("");
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState({ revenue: 0, orders: 0, products: 0, income: 0, expenses: 0 });
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [notice, setNotice] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async (userId: string) => {
    if (!supabase) return;
    const { data: admin, error: profileError } = await supabase
      .from("admin_profiles")
      .select("user_id,email,display_name,role,is_active")
      .eq("user_id", userId)
      .maybeSingle();

    if (profileError || !admin || !admin.is_active) {
      await supabase.auth.signOut();
      setProfile(null);
      setError("This account does not have active eCuisinefoods admin access.");
      setLoading(false);
      return;
    }
    setProfile(admin as AdminProfile);

    const [orderResult, orderCountResult, completedResult, productResult, financeResult] = await Promise.all([
      supabase.from("orders").select("id,order_number,customer_name,total,status,created_at").order("created_at", { ascending: false }).limit(8),
      supabase.from("orders").select("id", { count: "exact", head: true }),
      supabase.from("orders").select("total").eq("status", "Completed"),
      supabase.from("products").select("id", { count: "exact", head: true }),
      supabase.from("financial_transactions").select("transaction_type,amount"),
    ]);

    const orderRows = (orderResult.data ?? []) as Order[];
    const financialRows = financeResult.data ?? [];
    const income = financialRows.filter((row) => row.transaction_type === "income").reduce((sum, row) => sum + Number(row.amount), 0);
    const expenses = financialRows.filter((row) => row.transaction_type === "expense").reduce((sum, row) => sum + Number(row.amount), 0);
    setOrders(orderRows);
    setStats({
      revenue: (completedResult.data ?? []).reduce((sum, order) => sum + Number(order.total), 0),
      orders: orderCountResult.count ?? 0,
      products: productResult.count ?? 0,
      income,
      expenses,
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    let mounted = true;
    const start = async () => {
      if (!supabase) { setError("The storefront database connection is not configured."); setLoading(false); return; }
      const { data } = await supabase.auth.getSession();
      if (mounted && data.session?.user) await loadDashboard(data.session.user.id);
      else if (mounted) setLoading(false);
    };
    void start();
    const { data: listener } = supabase?.auth.onAuthStateChange((_event, session) => {
      if (session?.user) void loadDashboard(session.user.id);
      else setProfile(null);
    }) ?? { data: { subscription: { unsubscribe: () => undefined } } };
    return () => { mounted = false; listener.subscription.unsubscribe(); };
  }, [loadDashboard]);

  const signIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) return;
    setWorking(true);
    setError("");
    if (mode === "signup") {
      if (email.trim().toLowerCase() !== "ecuisinefoods@gmail.com") {
        setError("The first owner account must use ecuisinefoods@gmail.com.");
        setWorking(false);
        return;
      }
      const { error: signUpError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: { emailRedirectTo: typeof window !== "undefined" ? window.location.origin + "/admin" : undefined },
      });
      if (signUpError) setError(signUpError.message);
      else setNotice("Check ecuisinefoods@gmail.com and confirm the verification email. The owner role is assigned automatically only after email verification.");
    } else {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) setError(signInError.message);
      else if (data.user) await loadDashboard(data.user.id);
    }
    setWorking(false);
  };

  const signOut = async () => {
    await supabase?.auth.signOut();
    setProfile(null);
    setOrders([]);
    setPassword("");
  };

  if (loading && !profile) return <main className="grid min-h-screen place-items-center bg-[#f4f6f1] text-sm font-semibold text-[#42694b]">Loading secure workspace…</main>;

  if (!profile) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f4f6f1] px-4 py-10">
        <section className="w-full max-w-md rounded-[2rem] border border-[#e4e9df] bg-white p-7 shadow-xl shadow-[#1b3825]/5 sm:p-9">
          <div className="mb-8 flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#1d4b34] text-xl font-black text-white">e</div>
            <div><p className="text-lg font-extrabold tracking-tight text-[#1b3b2a]">eCuisinefoods</p><p className="text-xs text-[#7b887c]">Business control centre</p></div>
          </div>
          <p className="text-xs font-bold uppercase tracking-[.18em] text-[#8b9a85]">Secure administrator access</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#193b2a]">{mode === "signup" ? "Set up your owner access." : "Welcome back."}</h1>
          <p className="mt-2 text-sm leading-6 text-[#738071]">{mode === "signup" ? "Create the first owner login. Your role activates only after the email address is verified." : "Sign in with your approved admin account to manage the eCuisinefoods business."}</p>
          <form onSubmit={signIn} className="mt-7 space-y-4">
            <label className="block text-xs font-bold text-[#405443]">Admin email<input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} readOnly={false} className="mt-2 w-full rounded-xl border border-[#dfe6dc] bg-[#fbfcfa] px-4 py-3 text-sm outline-none focus:border-[#4c805b] read-only:text-[#758574]" /></label>
            <label className="block text-xs font-bold text-[#405443]">Password<input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="mt-2 w-full rounded-xl border border-[#dfe6dc] bg-[#fbfcfa] px-4 py-3 text-sm outline-none focus:border-[#4c805b]" /></label>
            {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-xs leading-5 text-red-700">{error}</p>}{notice && <p role="status" className="rounded-xl bg-[#edf5e9] px-4 py-3 text-xs leading-5 text-[#3d6947]">{notice}</p>}
            <button type="submit" disabled={working} className="w-full rounded-xl bg-[#1d4b34] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-[#143a28] disabled:opacity-60">{working ? "Please wait..." : mode === "signup" ? "Create owner account" : "Sign in to dashboard"}</button>
          </form>
          <div className="mt-6 flex items-start gap-2 rounded-xl bg-[#f1f5ee] p-3 text-[11px] leading-5 text-[#687968]"><ShieldCheck size={16} className="mt-0.5 shrink-0 text-[#3d704b]"/> Access is granted by the secure admin role stored in the database. A normal customer account cannot enter this dashboard.</div>
          <button type="button" onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(""); setNotice(""); setEmail("ecuisinefoods@gmail.com"); }} className="mt-5 block text-xs font-bold text-[#42694b] hover:underline">{mode === "signin" ? "First time? Set up the owner account" : "Already set up? Sign in"}</button><a href="/" className="mt-4 inline-flex text-xs font-semibold text-[#42694b] hover:underline">← Back to storefront</a>
        </section>
      </main>
    );
  }

  const cards = [
    { label: "Completed sales", value: money(stats.revenue), note: "From completed orders in the latest records", icon: CircleDollarSign, tone: "bg-[#e8f2e8] text-[#2c6841]" },
    { label: "Recent orders", value: String(stats.orders), note: "Latest orders visible to your role", icon: ShoppingBag, tone: "bg-[#edf1fa] text-[#4b6090]" },
    { label: "Active products", value: String(stats.products), note: "Products currently listed", icon: Boxes, tone: "bg-[#f8f0df] text-[#96723a]" },
    { label: "Recorded income", value: money(stats.income), note: "Manual finance entries", icon: ArrowUpRight, tone: "bg-[#e8f3ef] text-[#34745d]" },
    { label: "Recorded expenses", value: money(stats.expenses), note: "Manual finance entries", icon: ArrowDownRight, tone: "bg-[#f8eae7] text-[#a75d4e]" },
    { label: "Recorded net", value: money(stats.income - stats.expenses), note: "Income less recorded expenses", icon: Wallet, tone: "bg-[#f0ebf8] text-[#765b9c]" },
  ];

  return (
    <main className="min-h-screen bg-[#f5f7f3] text-[#25392b]">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-[#e7ece4] bg-white px-5 py-6 lg:flex">
        <a href="/" className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#1d4b34] text-xl font-black text-white">e</span><span><b className="block text-sm text-[#1b3b2a]">eCuisinefoods</b><small className="text-[10px] text-[#849082]">Admin workspace</small></span></a>
        <p className="mb-3 mt-10 text-[9px] font-extrabold uppercase tracking-[.2em] text-[#9aa597]">Workspace</p>
        <nav className="space-y-1">{navItems.map((item) => <div key={item.label} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-xs font-semibold ${item.active ? "bg-[#eaf2e8] text-[#245b39]" : "text-[#7b887c]"}`}><item.icon size={16}/>{item.label}{!item.active && <span className="ml-auto text-[9px] text-[#a6afa2]">Soon</span>}</div>)}</nav>
        <div className="mt-auto rounded-2xl bg-[#f0f5ee] p-4"><div className="flex items-center gap-2 text-xs font-bold text-[#315b3e]"><ShieldCheck size={15}/> Owner access</div><p className="mt-2 text-[10px] leading-5 text-[#738271]">Your role controls what you can view and change across the business.</p></div>
      </aside>

      <section className="lg:pl-64">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-[#e8ede5] bg-white/90 px-5 py-4 backdrop-blur sm:px-8">
          <div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#8a9787]">Business overview</p><h1 className="mt-1 text-lg font-bold text-[#203b2a]">Good day, {profile.display_name || "eCuisinefoods Owner"}</h1></div>
          <div className="flex items-center gap-3"><span className="hidden rounded-full bg-[#eaf2e8] px-3 py-2 text-[10px] font-bold capitalize text-[#376546] sm:inline-flex">{profile.role.replaceAll("_", " ")}</span><button onClick={signOut} className="inline-flex items-center gap-2 rounded-xl border border-[#e4e9e1] px-3 py-2 text-xs font-bold text-[#617060] hover:bg-[#f6f8f4]"><LogOut size={15}/> Sign out</button></div>
        </header>
        <div className="mx-auto max-w-7xl px-5 py-7 sm:px-8 sm:py-9">
          <div className="mb-7 flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-2xl font-semibold tracking-tight text-[#1e3b29] sm:text-3xl">Your business at a glance</h2><p className="mt-2 text-xs text-[#7b887a]">A live view of the information currently available in your eCuisinefoods database.</p></div><span className="inline-flex items-center gap-2 rounded-full border border-[#e3e9e0] bg-white px-3 py-2 text-[10px] font-semibold text-[#788676]"><Activity size={13} className="text-[#4e8a5d}"/> Connected to Supabase</span></div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{cards.map((card) => <article key={card.label} className="rounded-2xl border border-[#e7ece4] bg-white p-5 shadow-sm shadow-[#1b3825]/[.025]"><div className="flex items-center justify-between"><p className="text-xs font-semibold text-[#7c897b]">{card.label}</p><span className={`grid h-10 w-10 place-items-center rounded-xl ${card.tone}`}><card.icon size={19}/></span></div><p className="mt-4 text-2xl font-bold tracking-tight text-[#1d3928]">{card.value}</p><p className="mt-2 text-[10px] text-[#929d90]">{card.note}</p></article>)}</div>
          <div className="mt-7 grid gap-5 xl:grid-cols-[1.5fr_1fr]">
            <section className="overflow-hidden rounded-2xl border border-[#e7ece4] bg-white"><div className="flex items-center justify-between border-b border-[#edf0eb] px-5 py-4"><div><h3 className="text-sm font-bold text-[#294332]">Recent orders</h3><p className="mt-1 text-[10px] text-[#899487]">Latest customer activity</p></div><ClipboardList size={18} className="text-[#82917e]"/></div>{orders.length ? <div className="divide-y divide-[#f0f2ee]">{orders.map((order) => <div key={order.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"><div><p className="text-xs font-bold text-[#304936]">#{order.order_number} · {order.customer_name}</p><p className="mt-1 text-[10px] text-[#929d90]">{new Date(order.created_at).toLocaleString("en-NG")}</p></div><div className="text-right"><p className="text-xs font-bold text-[#304936]">{money(Number(order.total))}</p><span className="mt-1 inline-flex rounded-full bg-[#f1f5ee] px-2.5 py-1 text-[9px] font-bold text-[#5e795f]">{order.status}</span></div></div>)}</div> : <div className="px-5 py-12 text-center"><ShoppingBag className="mx-auto text-[#b5c1b1]" size={28}/><p className="mt-3 text-xs font-semibold text-[#687968]">No orders yet</p><p className="mt-1 text-[10px] text-[#9aa497]">New customer orders will appear here.</p></div>}</section>
            <section className="rounded-2xl border border-[#e7ece4] bg-white p-5"><div className="flex items-center gap-2"><CalendarDays size={17} className="text-[#66816a]"/><h3 className="text-sm font-bold text-[#294332]">Management modules</h3></div><p className="mt-2 text-[10px] leading-5 text-[#8b9688]">We are building out each module in stages. The first secure foundation is now in place.</p><div className="mt-5 space-y-3">{[{name:"Team roles & permissions",desc:"Owner, finance, store, marketing and order staff",icon:Users},{name:"Promotional animation manager",desc:"Create, schedule and reorder storefront slides",icon:Megaphone},{name:"Finance & reports",desc:"Track income, expenses and operating performance",icon:Wallet},{name:"Analytics & activity history",desc:"Monitor business trends and admin actions",icon:BarChart3}].map((item) => <div key={item.name} className="flex items-start gap-3 rounded-xl bg-[#f7f9f5] p-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white text-[#4b7655]"><item.icon size={16}/></span><div><p className="text-[11px] font-bold text-[#405744]">{item.name}</p><p className="mt-1 text-[10px] leading-4 text-[#8a9688]">{item.desc}</p></div><ChevronRight size={14} className="ml-auto mt-1 text-[#a5b0a1]"/></div>)}</div><a href="/admin/promotions" className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#245b42] px-4 py-3 text-xs font-bold text-white transition hover:bg-[#173e2d]"><Megaphone size={14}/> Open promotion & animation manager</a></section>
          </div>
          <p className="mt-7 flex items-center gap-2 text-[10px] leading-5 text-[#97a194]"><ShieldCheck size={13}/> Financial figures are separated into order sales and manually recorded income/expenses to avoid double-counting.</p>
        </div>
      </section>
    </main>
  );
}
