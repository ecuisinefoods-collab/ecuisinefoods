"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  Activity, ArrowDownRight, ArrowUpRight, BarChart3, Boxes, Truck,
  ChevronRight, CircleDollarSign, ClipboardList, LogOut, LayoutDashboard,
  Megaphone, Package, ShieldCheck, ShoppingBag, Users, Wallet, CreditCard,
  Handshake, MapPin, Tags, Image as ImageIcon, Star, Database, Bot,
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
      setError("This account does not have active eCuisine admin access.");
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
        options: { emailRedirectTo: "https://ecuisinefoods.onrender.com/admin" },
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

  if (loading && !profile) return <main className="admin-glass-shell grid min-h-screen place-items-center bg-[#f4f6f1] text-sm font-semibold text-[#42694b]">Loading secure workspace…</main>;

  if (!profile) {
    return (
      <main className="admin-glass-shell flex min-h-screen items-center justify-center bg-[#f4f6f1] px-4 py-10">
        <section className="w-full max-w-md rounded-[2rem] border border-[#e4e9df] bg-white p-7 shadow-xl shadow-[#1b3825]/5 sm:p-9">
          <div className="mb-8 flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#1d4b34] text-xl font-black text-white">e</div>
            <div><p className="text-lg font-extrabold tracking-tight text-[#1b3b2a]">eCuisine</p><p className="text-xs text-[#7b887c]">Business control centre</p></div>
          </div>
          <p className="text-xs font-bold uppercase tracking-[.18em] text-[#8b9a85]">Secure administrator access</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#193b2a]">{mode === "signup" ? "Set up your owner access." : "Welcome back."}</h1>
          <p className="mt-2 text-sm leading-6 text-[#738071]">{mode === "signup" ? "Create the first owner login. Your role activates only after the email address is verified." : "Sign in with your approved admin account to manage the eCuisine business."}</p>
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
    { label: "Completed sales", value: money(stats.revenue), note: "Revenue from completed website orders", icon: CircleDollarSign, tone: "green" },
    { label: "Total orders", value: String(stats.orders), note: "Orders recorded in the store", icon: ShoppingBag, tone: "blue" },
    { label: "Listed products", value: String(stats.products), note: "Products in your catalogue", icon: Boxes, tone: "gold" },
    { label: "Recorded income", value: money(stats.income), note: "Manually recorded finance entries", icon: ArrowUpRight, tone: "teal" },
    { label: "Recorded expenses", value: money(stats.expenses), note: "Manually recorded finance entries", icon: ArrowDownRight, tone: "rose" },
    { label: "Recorded net", value: money(stats.income - stats.expenses), note: "Recorded income less expenses", icon: Wallet, tone: "purple" },
  ];

  const sections = [
    {
      id: "store",
      number: "01",
      title: "Store & catalogue",
      description: "Your products, stock, storefront appearance and customer-facing content.",
      icon: Package,
      tone: "green",
      tools: [
        { label: "Products", description: "Add and edit products, pack sizes and prices.", href: "/admin/products", icon: Package, roles: ["owner", "store_manager"], action: "Manage catalogue" },
        { label: "Inventory", description: "Review stock levels and inventory movements.", href: "/admin/inventory", icon: Boxes, roles: ["owner", "store_manager", "analyst"], action: "View inventory" },
        { label: "Storefront editor", description: "Manage homepage content and storefront sections.", href: "/admin/storefront", icon: LayoutDashboard, roles: ["owner", "store_manager"], action: "Edit storefront" },
        { label: "Media library", description: "Manage images used around the storefront.", href: "/admin/storefront/media", icon: ImageIcon, roles: ["owner", "store_manager"], action: "Open library" },
        { label: "Customer reviews", description: "Review and moderate customer feedback.", href: "/admin/reviews", icon: Star, roles: ["owner", "store_manager"], action: "View reviews" },
        { label: "Sales counter", description: "Set the historical products-sold baseline.", href: "/admin/sales-counter", icon: Activity, roles: ["owner"], action: "Edit baseline" },
      ],
    },
    {
      id: "orders",
      number: "02",
      title: "Orders & fulfilment",
      description: "Keep customer orders, payments, pickups and deliveries moving.",
      icon: ShoppingBag,
      tone: "blue",
      tools: [
        { label: "Orders", description: "Confirm, process and complete customer orders.", href: "/admin/orders", icon: ClipboardList, roles: ["owner", "store_manager", "order_officer", "finance_officer", "analyst"], action: "Manage orders" },
        { label: "Payment settings", description: "Configure supported checkout payment methods.", href: "/admin/payments", icon: CreditCard, roles: ["owner", "store_manager"], action: "Configure payments" },
        { label: "Delivery setup", description: "Manage delivery destinations and fees.", href: "/admin/delivery", icon: Truck, roles: ["owner", "store_manager"], action: "Manage delivery" },
        { label: "Pickup locations", description: "Manage customer pickup locations.", href: "/admin/pickups", icon: MapPin, roles: ["owner", "store_manager"], action: "Manage pickups" },
      ],
    },
    {
      id: "growth",
      number: "03",
      title: "Marketing & growth",
      description: "Run campaigns, build partnerships and grow your customer reach.",
      icon: Megaphone,
      tone: "gold",
      tools: [
        { label: "Promotions & banners", description: "Create and schedule storefront offers.", href: "/admin/promotions", icon: Megaphone, roles: ["owner", "marketing_manager"], action: "Manage promotions" },
        { label: "Coupons", description: "Create and manage discount codes.", href: "/admin/coupons", icon: Tags, roles: ["owner", "marketing_manager"], action: "Manage coupons" },
        { label: "Partnership enquiries", description: "Review business and collaboration enquiries.", href: "/admin/partnerships", icon: Handshake, roles: ["owner", "store_manager", "marketing_manager"], action: "View enquiries" },
        { label: "Affiliate programme", description: "Manage affiliate applications and activity.", href: "/admin/affiliates", icon: Users, roles: ["owner", "store_manager", "marketing_manager"], action: "Manage affiliates" },
        { label: "Affiliate performance", description: "Review referral traffic, attributed orders, conversions and commissions by affiliate.", href: "/admin/partners", icon: ClipboardList, roles: ["owner", "store_manager", "marketing_manager", "affiliate_manager"], action: "View performance" },
      ],
    },
    {
      id: "finance",
      number: "04",
      title: "Finance & reports",
      description: "Understand revenue, expenses and how the business is performing.",
      icon: BarChart3,
      tone: "purple",
      tools: [
        { label: "Finance", description: "Review recorded income, expenses and transactions.", href: "/admin/finance", icon: Wallet, roles: ["owner", "finance_officer", "analyst"], action: "Open finance" },
        { label: "Analytics", description: "Explore store traffic, activity and business trends.", href: "/admin/analytics", icon: BarChart3, roles: ["owner", "store_manager", "finance_officer", "analyst"], action: "View analytics" },
        { label: "Data exports", description: "Download business records and reports.", href: "/admin/exports", icon: Database, roles: ["owner"], action: "Export records" },
      ],
    },
    {
      id: "people",
      number: "05",
      title: "People & administration",
      description: "Control team access and use the tools that support daily operations.",
      icon: ShieldCheck,
      tone: "teal",
      tools: [
        { label: "Team & permissions", description: "Invite staff, assign roles and remove old accounts.", href: "/admin/team", icon: Users, roles: ["owner"], action: "Manage team" },
        { label: "AI assistant & knowledge", description: "Manage the assistant and its business knowledge.", href: "/admin/assistant", icon: Bot, roles: ["owner", "store_manager", "order_officer"], action: "Open assistant" },
      ],
    },
  ].map(section => ({
    ...section,
    tools: section.tools.filter(tool => tool.roles.includes(profile.role)),
  })).filter(section => section.tools.length > 0);

  const firstName = profile.display_name?.trim().split(/\\s+/)[0] || (profile.role === "owner" ? "CEO" : "there");

  return (
    <main className="admin-glass-shell admin-dashboard-root admin-dashboard-page min-h-screen text-[#25392b]">
      <section>
        <header className="admin-topbar-premium sticky top-0 z-10 flex items-center justify-between border-b px-5 py-4 backdrop-blur sm:px-8">
          <div>
            <p className="admin-topbar-kicker text-[10px] font-bold uppercase tracking-[.18em]">eCuisine business workspace</p>
            <h1 className="admin-topbar-title mt-1 text-lg font-bold">Business dashboard</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="admin-role-pill hidden rounded-full px-3 py-2 text-[10px] font-bold capitalize sm:inline-flex">{profile.role === "owner" ? "CEO / Owner" : profile.role.replaceAll("_", " ")}</span>
            <button onClick={signOut} className="admin-signout inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold"><LogOut size={15}/> Sign out</button>
          </div>
        </header>

        <div className="admin-dashboard-content mx-auto max-w-[1440px] px-5 py-6 sm:px-8 sm:py-9">
          <section className="admin-dashboard-hero mb-7 overflow-hidden rounded-[28px] px-6 py-7 sm:px-8 sm:py-9">
            <div className="admin-dashboard-hero-orb admin-dashboard-hero-orb--one"/>
            <div className="admin-dashboard-hero-orb admin-dashboard-hero-orb--two"/>
            <div className="relative z-[1] flex flex-wrap items-end justify-between gap-6">
              <div className="max-w-2xl">
                <span className="admin-dashboard-hero-eyebrow"><span/> YOUR CONTROL CENTRE</span>
                <h2 className="mt-4 text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl">Welcome back, {firstName}.</h2>
                <p className="mt-3 max-w-xl text-sm leading-6 text-[#e2eee3]">Everything you need to manage eCuisine in one place. Choose a business area below to get straight to the right tools.</p>
              </div>
              <div className="admin-dashboard-hero-actions">
                <Link href="/admin/orders" className="admin-dashboard-hero-action admin-dashboard-hero-action--primary"><ShoppingBag size={16}/> View orders</Link>
                {(profile.role === "owner" || profile.role === "store_manager") && <Link href="/admin/products" className="admin-dashboard-hero-action"><Package size={16}/> Manage products</Link>}
              </div>
            </div>
            <div className="admin-dashboard-hero-foot">
              <span><Activity size={13}/> Live workspace</span>
              <span className="admin-dashboard-hero-foot-divider"/>
              <span>{profile.role === "owner" ? "Full owner access" : profile.role.replaceAll("_", " ") + " access"}</span>
            </div>
          </section>

          <section aria-labelledby="dashboard-metrics-title">
            <div className="admin-dashboard-section-heading">
              <div><p className="admin-dashboard-section-eyebrow">AT A GLANCE</p><h2 id="dashboard-metrics-title">Business snapshot</h2><p>Key figures from your current eCuisine records.</p></div>
              <span className="admin-connection-pill inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[10px] font-semibold"><Activity size={13}/> Connected to Supabase</span>
            </div>
            <div className="admin-dashboard-metrics grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {cards.map(card => <article key={card.label} className={"admin-dashboard-metric admin-dashboard-metric--"+card.tone}>
                <div className="flex items-start justify-between gap-3"><div><p className="admin-dashboard-metric-label">{card.label}</p><p className="admin-dashboard-metric-value">{card.value}</p><p className="admin-dashboard-metric-note">{card.note}</p></div><span className="admin-dashboard-metric-icon"><card.icon size={19}/></span></div>
              </article>)}
            </div>
          </section>

          <section className="mt-9" aria-labelledby="dashboard-categories-title">
            <div className="admin-dashboard-section-heading">
              <div><p className="admin-dashboard-section-eyebrow">WORKSPACE DIRECTORY</p><h2 id="dashboard-categories-title">Explore by business area</h2><p>Tools are organised by what you need to get done.</p></div>
              <span className="admin-dashboard-tool-count">{sections.reduce((sum, section) => sum + section.tools.length, 0)} available tools</span>
            </div>
            <div className="admin-dashboard-category-grid">
              {sections.map(section => <section key={section.id} id={"dashboard-"+section.id} className={"admin-dashboard-category admin-dashboard-category--"+section.tone}>
                <div className="admin-dashboard-category-head">
                  <span className="admin-dashboard-category-icon"><section.icon size={20}/></span>
                  <div className="min-w-0 flex-1">
                    <span className="admin-dashboard-category-number">AREA {section.number}</span>
                    <h3>{section.title}</h3>
                  </div>
                  <span className="admin-dashboard-category-count">{section.tools.length}</span>
                </div>
                <p className="admin-dashboard-category-description">{section.description}</p>
                <div className="admin-dashboard-tool-list">
                  {section.tools.map(tool => <Link href={tool.href} key={tool.href} className="admin-dashboard-tool">
                    <span className="admin-dashboard-tool-icon"><tool.icon size={16}/></span>
                    <span className="min-w-0 flex-1"><strong>{tool.label}</strong><small>{tool.description}</small></span>
                    <span className="admin-dashboard-tool-go"><ChevronRight size={15}/></span>
                  </Link>)}
                </div>
              </section>)}
            </div>
          </section>

          <section className="mt-9" aria-labelledby="recent-orders-title">
            <div className="admin-dashboard-section-heading">
              <div><p className="admin-dashboard-section-eyebrow">LATEST ACTIVITY</p><h2 id="recent-orders-title">Recent orders</h2><p>Keep an eye on your latest customer activity.</p></div>
              <Link href="/admin/orders" className="admin-dashboard-view-all">View all orders <ChevronRight size={15}/></Link>
            </div>
            <section className="admin-dashboard-orders overflow-hidden rounded-2xl border">
              {orders.length ? <div className="divide-y divide-[#edf1e9]">{orders.map(order => <div key={order.id} className="admin-dashboard-order-row flex flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-6">
                <div className="flex min-w-0 items-center gap-3"><span className="admin-dashboard-order-icon"><ShoppingBag size={16}/></span><div className="min-w-0"><p className="truncate text-xs font-bold text-[#304936]">#{order.order_number} · {order.customer_name}</p><p className="mt-1 text-[10px] text-[#929d90]">{new Date(order.created_at).toLocaleString("en-NG")}</p></div></div>
                <div className="ml-auto text-right"><p className="text-xs font-bold text-[#304936]">{money(Number(order.total))}</p><span className="mt-1 inline-flex rounded-full bg-[#f1f5ee] px-2.5 py-1 text-[9px] font-bold text-[#5e795f]">{order.status}</span></div>
              </div>)}</div> : <div className="px-5 py-12 text-center"><ShoppingBag className="mx-auto text-[#b5c1b1]" size={28}/><p className="mt-3 text-xs font-semibold text-[#687968]">No orders yet</p><p className="mt-1 text-[10px] text-[#9aa497]">New customer orders will appear here.</p></div>}
            </section>
          </section>

          <p className="admin-dashboard-footnote mt-7 flex items-start gap-2 text-[10px] leading-5"><ShieldCheck size={13} className="mt-0.5 shrink-0"/> Financial figures are separated into completed order sales and manually recorded income/expenses to avoid double-counting.</p>
        </div>
      </section>
    </main>
  );
}
