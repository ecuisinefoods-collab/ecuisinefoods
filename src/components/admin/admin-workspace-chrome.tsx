"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity, BarChart3, Bot, Boxes, ChevronDown, ClipboardList, CreditCard, Handshake,
  LayoutDashboard, MapPin, Megaphone, Package, ShieldCheck, ShoppingBag,
  Store, Truck, Wallet, Database, Star, Image as ImageIcon, Tags, Users,
  type LucideIcon,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type AdminIdentity = { user_id: string; role: string; display_name: string | null; is_active: boolean };
type NavItem = { label: string; href: string; icon: LucideIcon; roles?: string[] };
type NavGroup = { label: string; icon: LucideIcon; items: NavItem[] };

const groups: NavGroup[] = [
  { label: "Store & catalogue", icon: Store, items: [
    { label: "Products", href: "/admin/products", icon: Package, roles: ["owner", "store_manager"] },
    { label: "Inventory", href: "/admin/inventory", icon: Boxes, roles: ["owner", "store_manager", "analyst"] },
    { label: "Storefront editor", href: "/admin/storefront", icon: LayoutDashboard, roles: ["owner", "store_manager"] },
    { label: "Media library", href: "/admin/storefront/media", icon: ImageIcon, roles: ["owner", "store_manager"] },
    { label: "Customer reviews", href: "/admin/reviews", icon: Star, roles: ["owner", "store_manager"] },
    { label: "Our story", href: "/admin/story", icon: Users, roles: ["owner", "store_manager"] },
    { label: "Sales counter", href: "/admin/sales-counter", icon: Activity, roles: ["owner"] },
  ]},
  { label: "Orders & fulfilment", icon: Truck, items: [
    { label: "Orders", href: "/admin/orders", icon: ShoppingBag, roles: ["owner", "store_manager", "order_officer", "finance_officer", "analyst"] },
    { label: "Payments", href: "/admin/payments", icon: CreditCard, roles: ["owner", "store_manager"] },
    { label: "Delivery", href: "/admin/delivery", icon: Truck, roles: ["owner", "store_manager"] },
    { label: "Pickup locations", href: "/admin/pickups", icon: MapPin, roles: ["owner", "store_manager"] },
  ]},
  { label: "Marketing & growth", icon: Megaphone, items: [
    { label: "Promotions & banners", href: "/admin/promotions", icon: Megaphone, roles: ["owner", "marketing_manager"] },
    { label: "Coupons", href: "/admin/coupons", icon: Tags, roles: ["owner", "marketing_manager"] },
    { label: "Partnerships", href: "/admin/partnerships", icon: Handshake, roles: ["owner", "store_manager", "marketing_manager"] },
    { label: "Affiliates", href: "/admin/affiliates", icon: Users, roles: ["owner", "store_manager", "marketing_manager"] },
    { label: "Affiliate performance", href: "/admin/partners", icon: ClipboardList, roles: ["owner", "store_manager", "marketing_manager", "affiliate_manager"] },
  ]},
  { label: "Finance & reports", icon: BarChart3, items: [
    { label: "Finance", href: "/admin/finance", icon: Wallet, roles: ["owner", "finance_officer", "analyst"] },
    { label: "Analytics", href: "/admin/analytics", icon: BarChart3, roles: ["owner", "store_manager", "finance_officer", "analyst"] },
    { label: "Data exports", href: "/admin/exports", icon: Database, roles: ["owner"] },
  ]},
  { label: "People & administration", icon: ShieldCheck, items: [
    { label: "Team & permissions", href: "/admin/team", icon: ShieldCheck, roles: ["owner"] },
    { label: "AI assistant", href: "/admin/assistant", icon: Bot, roles: ["owner", "store_manager", "order_officer"] },
  ]},
];

function roleName(role: string) {
  return role === "owner" ? "CEO & owner" : role.replaceAll("_", " ");
}

export default function AdminWorkspaceChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const activeGroup = groups.find(group => group.items.some(item =>
    item.href === pathname || pathname.startsWith(item.href + "/")
  ));
  const [identity, setIdentity] = useState<AdminIdentity | null>(null);
  const [ready, setReady] = useState(false);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(activeGroup?.label ?? null);

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

  useEffect(() => {
    setExpandedGroup(activeGroup?.label ?? null);
  }, [pathname]);

  const hasAccess = Boolean(identity?.is_active);
  const visibleGroups = groups.map(group => ({
    ...group,
    items: group.items.filter(item => !item.roles || item.roles.includes(identity?.role || "")),
  })).filter(group => group.items.length > 0);
  const isActive = (href: string) => href === "/admin"
    ? pathname === "/admin"
    : pathname === href || pathname.startsWith(href + "/");

  const renderGroupLinks = (group: NavGroup, mobile = false) => (
    <nav aria-label={group.label}>
      {group.items.map(item => (
        <Link
          key={item.href}
          href={item.href}
          className={[
            "admin-global-link",
            isActive(item.href) ? "is-active" : "",
            mobile ? "admin-global-mobile-link" : "",
          ].filter(Boolean).join(" ")}
        >
          <item.icon size={16}/><span>{item.label}</span>
        </Link>
      ))}
    </nav>
  );

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

            <div className="admin-global-dropdown-groups">
              {visibleGroups.map(group => {
                const expanded = expandedGroup === group.label;
                return (
                  <section className="admin-global-nav-group" key={group.label}>
                    <button
                      type="button"
                      className={expanded ? "admin-global-group-toggle is-expanded" : "admin-global-group-toggle"}
                      aria-expanded={expanded}
                      onClick={() => setExpandedGroup(expanded ? null : group.label)}
                    >
                      <span className="admin-global-group-icon"><group.icon size={16}/></span>
                      <span className="admin-global-group-copy">
                        <strong>{group.label}</strong>
                        <small>{group.items.length} {group.items.length === 1 ? "section" : "sections"}</small>
                      </span>
                      <ChevronDown size={16} className="admin-global-group-chevron"/>
                    </button>
                    {expanded && renderGroupLinks(group)}
                  </section>
                );
              })}
            </div>

            <div className="admin-global-sidebar-footer">
              <span className="admin-global-avatar">{(identity?.display_name || "e").trim().slice(0, 1).toUpperCase()}</span>
              <span><strong>{identity?.display_name || "eCuisine Admin"}</strong><small>{roleName(identity?.role || "admin")}</small></span>
            </div>
          </aside>

          <div className="admin-global-mobile-nav">
            <div className="admin-global-mobile-top">
              <Link href="/admin" className="admin-global-mobile-brand">
                <span className="admin-global-brand-mark">e</span><strong>eCuisine Admin</strong>
              </Link>
              <span className="admin-global-mobile-role">{roleName(identity?.role || "admin")}</span>
            </div>
            <div className="admin-global-mobile-menu" aria-label="Admin menu">
              <Link href="/admin" className={isActive("/admin") ? "admin-global-mobile-overview is-active" : "admin-global-mobile-overview"}>
                <LayoutDashboard size={15}/> Overview
              </Link>
              {visibleGroups.map(group => {
                const expanded = expandedGroup === group.label;
                return (
                  <section className="admin-global-mobile-group" key={group.label}>
                    <button
                      type="button"
                      className={expanded ? "admin-global-mobile-group-toggle is-expanded" : "admin-global-mobile-group-toggle"}
                      aria-expanded={expanded}
                      onClick={() => setExpandedGroup(expanded ? null : group.label)}
                    >
                      <group.icon size={15}/><span>{group.label}</span>
                      <ChevronDown size={15} className="admin-global-group-chevron"/>
                    </button>
                    {expanded && renderGroupLinks(group, true)}
                  </section>
                );
              })}
            </div>
          </div>
        </>
      )}
      <div className="admin-layout-content">{children}</div>
      {!ready && <span className="admin-layout-auth-loading" aria-hidden="true"/>}
    </div>
  );
}
