"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity, BarChart3, Bot, Boxes, ClipboardList, CreditCard, Handshake,
  LayoutDashboard, MapPin, Megaphone, Package, ShieldCheck, ShoppingBag,
  Truck, Users, Wallet, Database, Star, Image as ImageIcon, Tags,
  type LucideIcon,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type AdminIdentity = { user_id: string; role: string; display_name: string | null; is_active: boolean };
type NavItem = { label: string; href: string; icon: LucideIcon; roles?: string[] };
type NavGroup = { label: string; items: NavItem[] };

const groups: NavGroup[] = [
  { label: "Store & inventory", items: [
    { label: "Products", href: "/admin/products", icon: Package, roles: ["owner", "store_manager"] },
    { label: "Inventory", href: "/admin/inventory", icon: Boxes, roles: ["owner", "store_manager", "analyst"] },
    { label: "Storefront editor", href: "/admin/storefront", icon: LayoutDashboard, roles: ["owner", "store_manager"] },
    { label: "Media library", href: "/admin/storefront/media", icon: ImageIcon, roles: ["owner", "store_manager"] },
    { label: "Promotions", href: "/admin/promotions", icon: Megaphone, roles: ["owner", "marketing_manager"] },
    { label: "Coupons", href: "/admin/coupons", icon: Tags, roles: ["owner", "marketing_manager"] },
    { label: "Customer reviews", href: "/admin/reviews", icon: Star, roles: ["owner", "store_manager"] },
    { label: "Our story", href: "/admin/story", icon: Users, roles: ["owner", "store_manager"] },
    { label: "Sales counter", href: "/admin/sales-counter", icon: Activity, roles: ["owner"] },
  ]},
  { label: "Orders & fulfilment", items: [
    { label: "Orders", href: "/admin/orders", icon: ShoppingBag, roles: ["owner", "store_manager", "order_officer", "finance_officer", "analyst"] },
    { label: "Payments", href: "/admin/payments", icon: CreditCard, roles: ["owner", "store_manager"] },
    { label: "Delivery", href: "/admin/delivery", icon: Truck, roles: ["owner", "store_manager"] },
    { label: "Pickup locations", href: "/admin/pickups", icon: MapPin, roles: ["owner", "store_manager"] },
  ]},
  { label: "Growth & reporting", items: [
    { label: "Analytics", href: "/admin/analytics", icon: BarChart3, roles: ["owner", "store_manager", "finance_officer", "analyst"] },
    { label: "Partnerships", href: "/admin/partnerships", icon: Handshake, roles: ["owner", "store_manager", "marketing_manager"] },
    { label: "Affiliates", href: "/admin/affiliates", icon: Users, roles: ["owner", "store_manager", "marketing_manager"] },
    { label: "Partner operations", href: "/admin/partners", icon: ClipboardList, roles: ["owner", "store_manager", "marketing_manager"] },
    { label: "Finance", href: "/admin/finance", icon: Wallet, roles: ["owner", "finance_officer", "analyst"] },
    { label: "Data exports", href: "/admin/exports", icon: Database, roles: ["owner"] },
  ]},
  { label: "Administration", items: [
    { label: "Team & permissions", href: "/admin/team", icon: ShieldCheck, roles: ["owner"] },
    { label: "AI assistant", href: "/admin/assistant", icon: Bot, roles: ["owner", "store_manager", "order_officer"] },
  ]},
];

const quickLinks: NavItem[] = [
  { label: "Overview", href: "/admin", icon: LayoutDashboard },
  { label: "Products", href: "/admin/products", icon: Package, roles: ["owner", "store_manager"] },
  { label: "Orders", href: "/admin/orders", icon: ShoppingBag, roles: ["owner", "store_manager", "order_officer", "finance_officer", "analyst"] },
  { label: "Analytics", href: "/admin/analytics", icon: BarChart3, roles: ["owner", "store_manager", "finance_officer", "analyst"] },
  { label: "Team", href: "/admin/team", icon: Users, roles: ["owner"] },
];

function roleName(role: string) {
  return role === "owner" ? "CEO & owner" : role.replaceAll("_", " ");
}

export default function AdminWorkspaceChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [identity, setIdentity] = useState<AdminIdentity | null>(null);
  const [ready, setReady] = useState(false);

  const loadIdentity = useCallback(async (userId: string) => {
    if (!supabase) { setIdentity(null); setReady(true); return; }
    const { data } = await supabase
      .from("admin_profiles")
      .select("user_id,role,display_name,is_active")
      .eq("user_id", userId)
      .maybeSingle();
    setIdentity(data?.is_active ? data as AdminIdentity : null);
    setReady(true);
  }, []);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!supabase) { if (mounted) setReady(true); return; }
      const { data: { user } } = await supabase.auth.getUser();
      if (mounted) {
        if (user) await loadIdentity(user.id);
        else { setIdentity(null); setReady(true); }
      }
    };
    void load();
    const { data: listener } = supabase?.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setIdentity(null);
        setReady(true);
      } else {
        window.setTimeout(() => { void loadIdentity(session.user.id); }, 0);
      }
    }) ?? { data: { subscription: { unsubscribe: () => undefined } } };
    return () => { mounted = false; listener.subscription.unsubscribe(); };
  }, [loadIdentity]);

  const hasAccess = Boolean(identity?.is_active);
  const visibleGroups = groups.map(group => ({
    ...group,
    items: group.items.filter(item => !item.roles || item.roles.includes(identity?.role || "")),
  })).filter(group => group.items.length > 0);
  const mobileItems = quickLinks.filter(item => !item.roles || item.roles.includes(identity?.role || ""));
  const isActive = (href: string) => href === "/admin"
    ? pathname === "/admin"
    : pathname === href || pathname.startsWith(href + "/");

  return (
    <div className={hasAccess ? "admin-shell-has-sidebar" : ""}>
      {hasAccess && (
        <>
          <aside className="admin-global-sidebar" aria-label="Admin workspace navigation">
            <Link href="/admin" className="admin-global-brand">
              <span className="admin-global-brand-mark">e</span>
              <span><strong>eCuisine</strong><small>Business workspace</small></span>
            </Link>
            <div className="admin-global-overview">
              <span className="admin-global-section-label">Workspace</span>
              <Link href="/admin" className={isActive("/admin") ? "admin-global-link is-active" : "admin-global-link"}>
                <LayoutDashboard size={16}/> Overview
              </Link>
            </div>
            {visibleGroups.map(group => (
              <section className="admin-global-nav-group" key={group.label}>
                <p className="admin-global-section-label">{group.label}</p>
                <nav>
                  {group.items.map(item => (
                    <Link key={item.href} href={item.href} className={isActive(item.href) ? "admin-global-link is-active" : "admin-global-link"}>
                      <item.icon size={16}/><span>{item.label}</span>
                    </Link>
                  ))}
                </nav>
              </section>
            ))}
            <div className="admin-global-sidebar-footer">
              <span className="admin-global-avatar">{(identity?.display_name || "e").trim().slice(0, 1).toUpperCase()}</span>
              <span><strong>{identity?.display_name || "eCuisine Admin"}</strong><small>{roleName(identity?.role || "admin")}</small></span>
            </div>
          </aside>
          <div className="admin-global-mobile-nav">
            <div className="admin-global-mobile-top">
              <Link href="/admin" className="admin-global-mobile-brand"><span className="admin-global-brand-mark">e</span><strong>eCuisine Admin</strong></Link>
              <span className="admin-global-mobile-role">{roleName(identity?.role || "admin")}</span>
            </div>
            <nav aria-label="Quick admin navigation">
              {mobileItems.map(item => (
                <Link key={item.href} href={item.href} className={isActive(item.href) ? "is-active" : ""}>
                  <item.icon size={14}/>{item.label}
                </Link>
              ))}
            </nav>
          </div>
        </>
      )}
      <div className="admin-layout-content">{children}</div>
      {!ready && <span className="admin-layout-auth-loading" aria-hidden="true"/>}
    </div>
  );
}
