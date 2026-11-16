"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { User } from "@supabase/supabase-js";
import {
  ArrowRight, BadgeCheck, Box, Check, CircleUserRound, Clock3, Headset,
  LockKeyhole, LogOut, PackageCheck, RefreshCw, ShieldCheck, ShoppingBag, UserRound
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type Profile = { full_name: string; phone: string };
type OrderRow = {
  id: string;
  order_number: number;
  status: string;
  payment_status: string;
  payment_method: string;
  fulfillment_method: string;
  pickup_city: string | null;
  pickup_location_name: string | null;
  delivery_area: string | null;
  delivery_city: string | null;
  delivery_state: string | null;
  total: number;
  created_at: string;
};
type OrderItem = { order_id: string; product_name: string; pack_size: string; quantity: number };
type AccountOrder = OrderRow & { items: OrderItem[] };

const money = (value: number) => "₦" + Number(value || 0).toLocaleString("en-NG");
const formatDate = (value: string) => new Date(value).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });

export default function AccountPage() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [pageLoading, setPageLoading] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [profile, setProfile] = useState<Profile>({ full_name: "", phone: "" });
  const [orders, setOrders] = useState<AccountOrder[]>([]);
  const [accountMessage, setAccountMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [activeTab, setActiveTab] = useState<"orders" | "profile">("orders");

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      setError("Customer accounts are temporarily unavailable. Please contact eCuisine support.");
      return;
    }
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active) {
        setUser(data.session?.user ?? null);
        setEmail(data.session?.user?.email ?? "");
        setAuthLoading(false);
      }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      setUser(session?.user ?? null);
      if (session?.user?.email) setEmail(session.user.email);
      if (event === "PASSWORD_RECOVERY") setRecoveryMode(true);
    });
    const query = new URLSearchParams(window.location.search);
    if (query.get("type") === "recovery") setRecoveryMode(true);
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!supabase || !user) {
      setOrders([]);
      return;
    }
    let active = true;
    const loadAccount = async () => {
      setPageLoading(true);
      setError("");
      try {
        const { data: profileData, error: profileError } = await supabase
          .from("customer_profiles")
          .select("full_name,phone")
          .eq("user_id", user.id)
          .maybeSingle();

        let loadedProfile = profileData as Profile | null;
        if (!loadedProfile && !profileError) {
          const { data: createdProfile } = await supabase
            .from("customer_profiles")
            .upsert({
              user_id: user.id,
              full_name: String(user.user_metadata?.full_name || ""),
              phone: "",
            })
            .select("full_name,phone")
            .single();
          loadedProfile = createdProfile as Profile | null;
        }

        if (active && loadedProfile) {
          setProfile(loadedProfile);
          setFullName(loadedProfile.full_name || "");
          setPhone(loadedProfile.phone || "");
        }

        let claimedCount = 0;
        if (user.email_confirmed_at) {
          const { data: claimed, error: claimError } = await supabase.rpc("claim_my_guest_orders");
          if (!claimError) claimedCount = Number(claimed || 0);
        }

        const { data: orderRows, error: ordersError } = await supabase
          .from("orders")
          .select("id,order_number,status,payment_status,payment_method,fulfillment_method,pickup_city,pickup_location_name,delivery_area,delivery_city,delivery_state,total,created_at")
          .eq("customer_user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(30);

        if (ordersError) throw ordersError;

        const ids = (orderRows || []).map((order: OrderRow) => order.id);
        let itemRows: OrderItem[] = [];
        if (ids.length) {
          const { data: savedItems, error: itemsError } = await supabase
            .from("order_items")
            .select("order_id,product_name,pack_size,quantity")
            .in("order_id", ids);
          if (itemsError) throw itemsError;
          itemRows = (savedItems || []) as OrderItem[];
        }

        const accountOrders = ((orderRows || []) as OrderRow[]).map(order => ({
          ...order,
          items: itemRows.filter(item => item.order_id === order.id),
        }));

        if (active) {
          setOrders(accountOrders);
          if (claimedCount > 0) {
            setAccountMessage(claimedCount + (claimedCount === 1 ? " previous guest order has" : " previous guest orders have") + " been linked to your account.");
          }
        }
      } catch {
        if (active) setError("We couldn't load your account details. Please refresh and try again.");
      } finally {
        if (active) setPageLoading(false);
      }
    };
    void loadAccount();
    return () => { active = false; };
  }, [user?.id]);

  const orderCounts = useMemo(() => ({
    total: orders.length,
    active: orders.filter(order => !["Completed", "Cancelled"].includes(order.status)).length,
  }), [orders]);

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setError("");
    setAccountMessage("");

    try {
      if (mode === "signup") {
        if (password.length < 8) {
          setError("Choose a password with at least 8 characters.");
          return;
        }
        if (fullName.trim().length < 2) {
          setError("Enter your full name.");
          return;
        }
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: window.location.origin + "/account",
            data: { full_name: fullName.trim() },
          },
        });
        if (signUpError) throw signUpError;
        if (data.session?.user) {
          setUser(data.session.user);
          setAccountMessage("Your eCuisine account is ready.");
        } else {
          setAccountMessage("Please check your email and confirm your address to activate your account. Then return here to sign in.");
          setMode("signin");
        }
      } else if (mode === "forgot") {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: window.location.origin + "/account?type=recovery",
        });
        if (resetError) throw resetError;
        setAccountMessage("If an account exists for that email, a password reset link has been sent.");
        setMode("signin");
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) throw signInError;
        setUser(data.user);
        setAccountMessage("Welcome back to eCuisine.");
      }
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "We couldn't complete that request. Please try again.";
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !user) return;
    setBusy(true);
    setError("");
    setAccountMessage("");
    const { error: saveError } = await supabase.from("customer_profiles").upsert({
      user_id: user.id,
      full_name: fullName.trim(),
      phone: phone.trim(),
      updated_at: new Date().toISOString(),
    });
    setBusy(false);
    if (saveError) setError("We couldn't save your profile. Please check your details and try again.");
    else {
      setProfile({ full_name: fullName.trim(), phone: phone.trim() });
      setAccountMessage("Your profile has been updated.");
    }
  }

  async function updatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    if (newPassword.length < 8) {
      setError("Choose a password with at least 8 characters.");
      return;
    }
    setBusy(true);
    setError("");
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    setBusy(false);
    if (updateError) setError("We couldn't update your password. Please try again.");
    else {
      setRecoveryMode(false);
      setNewPassword("");
      setAccountMessage("Your password has been updated. You are signed in.");
      window.history.replaceState({}, "", "/account");
    }
  }

  async function signOut() {
    if (!supabase) return;
    setBusy(true);
    await supabase.auth.signOut();
    setUser(null);
    setOrders([]);
    setBusy(false);
    setAccountMessage("You have signed out.");
  }

  const isDelivery = (order: AccountOrder) => order.fulfillment_method === "delivery";
  const statusClass = (status: string) => status === "Completed"
    ? "bg-[#e9f4e7] text-[#2f7041]"
    : status === "Cancelled"
      ? "bg-red-50 text-red-700"
      : "bg-[#fff5e4] text-[#886225]";

  if (authLoading) {
    return <main className="grid min-h-screen place-items-center bg-[#f5f7f2] px-5"><div className="flex items-center gap-3 text-sm font-semibold text-[#58705b]"><RefreshCw size={17} className="animate-spin" /> Loading your eCuisine account…</div></main>;
  }

  if (recoveryMode && user) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f5f7f2] px-5 py-12">
        <form onSubmit={updatePassword} className="w-full max-w-md rounded-[28px] border border-white bg-white p-7 shadow-[0_24px_80px_rgba(24,57,37,.09)] sm:p-9">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[#edf4e9] text-[#3e704b]"><LockKeyhole size={25} /></span>
          <h1 className="mt-5 text-2xl font-semibold text-[#1c3c29]">Choose a new password</h1>
          <p className="mt-2 text-sm leading-6 text-[#7b8878]">Use at least 8 characters to secure your eCuisine account.</p>
          <input type="password" required minLength={8} autoComplete="new-password" value={newPassword} onChange={event => setNewPassword(event.target.value)} placeholder="New password" className="mt-6 w-full rounded-xl border border-[#dce5d9] bg-[#fbfcfa] px-4 py-3.5 text-sm outline-none focus:border-[#6e9b76]" />
          {error && <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <button disabled={busy} className="mt-4 w-full rounded-xl bg-[#245b42] px-5 py-3.5 text-sm font-bold text-white disabled:opacity-50">{busy ? "Updating…" : "Update password"}</button>
        </form>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f5f7f2] pb-24">
      <section className="relative overflow-hidden bg-gradient-to-br from-[#173e2d] via-[#20553c] to-[#2d6749] px-5 pb-10 pt-8 text-white sm:pb-14 sm:pt-10">
        <div className="pointer-events-none absolute -right-16 -top-28 h-72 w-72 rounded-full border border-white/10" />
        <div className="relative mx-auto max-w-6xl">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-[#d9e8d8] hover:text-white"><ArrowRight size={14} className="rotate-180" /> Back to store</Link>
          <div className="mt-8 flex flex-wrap items-end justify-between gap-5">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.18em] text-[#dcebd9]"><CircleUserRound size={13} /> My eCuisine</span>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-5xl">{user ? "Welcome back" + (profile.full_name ? ", " + profile.full_name.split(" ")[0] : "") + "." : "A better way to shop."}</h1>
              <p className="mt-3 max-w-xl text-sm leading-7 text-[#e1ecdf]">{user ? "Your orders, profile and shopping history are together in one place." : "Create an account to keep your eCuisine orders and details together."}</p>
            </div>
            {user && <button type="button" onClick={signOut} disabled={busy} className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-white/20 disabled:opacity-50"><LogOut size={14} /> Sign out</button>}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-8 sm:py-10">
        {!user ? (
          <div className="mx-auto grid max-w-4xl overflow-hidden rounded-[30px] border border-white bg-white shadow-[0_24px_80px_rgba(24,57,37,.08)] lg:grid-cols-[.9fr_1.1fr]">
            <div className="hidden flex-col justify-between bg-[#edf4e9] p-9 lg:flex">
              <div>
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white text-[#3e704b]"><ShoppingBag size={25} /></span>
                <h2 className="mt-7 text-2xl font-semibold tracking-tight text-[#25432f]">Your food journey, all in one place.</h2>
                <p className="mt-3 text-sm leading-7 text-[#788777]">Keep track of orders, update your contact details and find your eCuisine shopping history whenever you need it.</p>
              </div>
              <div className="space-y-3 text-sm text-[#55715a]">
                <p className="flex items-center gap-2"><Check size={16} /> See previous orders</p>
                <p className="flex items-center gap-2"><Check size={16} /> Keep your details up to date</p>
                <p className="flex items-center gap-2"><Check size={16} /> Get help with an order</p>
              </div>
            </div>
            <div className="p-6 sm:p-9">
              <div className="flex gap-2 rounded-xl bg-[#f3f6f1] p-1">
                <button type="button" onClick={() => { setMode("signin"); setError(""); }} className={"flex-1 rounded-lg px-3 py-2.5 text-xs font-bold " + (mode === "signin" ? "bg-white text-[#245b42] shadow-sm" : "text-[#829080]")}>Sign in</button>
                <button type="button" onClick={() => { setMode("signup"); setError(""); }} className={"flex-1 rounded-lg px-3 py-2.5 text-xs font-bold " + (mode === "signup" ? "bg-white text-[#245b42] shadow-sm" : "text-[#829080]")}>Create account</button>
              </div>
              <h2 className="mt-7 text-2xl font-semibold tracking-tight text-[#1d3d2a]">{mode === "signup" ? "Join eCuisine" : mode === "forgot" ? "Reset your password" : "Good to see you again."}</h2>
              <p className="mt-2 text-sm leading-6 text-[#849080]">{mode === "signup" ? "Create your account with your name, email and a secure password." : mode === "forgot" ? "We’ll send a password reset link to your email address." : "Sign in to see your orders and manage your details."}</p>
              <form onSubmit={submitAuth} className="mt-6 space-y-4">
                {mode === "signup" && (
                  <label className="block text-xs font-bold text-[#607160]">Full name
                    <input required minLength={2} autoComplete="name" value={fullName} onChange={event => setFullName(event.target.value)} placeholder="Your full name" className="mt-1.5 w-full rounded-xl border border-[#dce5d9] bg-[#fbfcfa] px-4 py-3.5 text-sm font-normal text-[#203329] outline-none focus:border-[#6e9b76]" />
                  </label>
                )}
                <label className="block text-xs font-bold text-[#607160]">Email address
                  <input required type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="you@example.com" className="mt-1.5 w-full rounded-xl border border-[#dce5d9] bg-[#fbfcfa] px-4 py-3.5 text-sm font-normal text-[#203329] outline-none focus:border-[#6e9b76]" />
                </label>
                {mode !== "forgot" && (
                  <label className="block text-xs font-bold text-[#607160]">Password
                    <input required type="password" minLength={8} autoComplete={mode === "signup" ? "new-password" : "current-password"} value={password} onChange={event => setPassword(event.target.value)} placeholder="At least 8 characters" className="mt-1.5 w-full rounded-xl border border-[#dce5d9] bg-[#fbfcfa] px-4 py-3.5 text-sm font-normal text-[#203329] outline-none focus:border-[#6e9b76]" />
                  </label>
                )}
                {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm leading-5 text-red-700">{error}</p>}
                {accountMessage && <p role="status" className="rounded-xl bg-[#edf5ea] p-3 text-sm leading-5 text-[#356344]">{accountMessage}</p>}
                <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#245b42] px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#245b42]/15 transition hover:bg-[#173e2d] disabled:opacity-50">
                  {busy ? "Please wait…" : mode === "signup" ? "Create my account" : mode === "forgot" ? "Send reset link" : "Sign in"} <ArrowRight size={15} />
                </button>
              </form>
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-xs">
                {mode === "signin" ? <button type="button" onClick={() => { setMode("forgot"); setError(""); }} className="font-bold text-[#547258] hover:underline">Forgot password?</button> : <button type="button" onClick={() => { setMode("signin"); setError(""); }} className="font-bold text-[#547258] hover:underline">Back to sign in</button>}
                <Link href="/track" className="font-bold text-[#547258] hover:underline">Track as guest</Link>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-[#e7ece4] bg-white p-5 shadow-sm">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#edf4e9] text-[#46714d]"><PackageCheck size={19} /></span>
                <p className="mt-4 text-2xl font-bold text-[#25432f]">{orderCounts.total}</p>
                <p className="mt-1 text-xs font-semibold text-[#879385]">Orders in your account</p>
              </div>
              <div className="rounded-2xl border border-[#e7ece4] bg-white p-5 shadow-sm">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#fff4e2] text-[#98702e]"><Clock3 size={19} /></span>
                <p className="mt-4 text-2xl font-bold text-[#25432f]">{orderCounts.active}</p>
                <p className="mt-1 text-xs font-semibold text-[#879385]">Orders in progress</p>
              </div>
              <div className="rounded-2xl border border-[#e7ece4] bg-white p-5 shadow-sm">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#edf4e9] text-[#46714d]"><BadgeCheck size={19} /></span>
                <p className="mt-4 truncate text-lg font-bold text-[#25432f]">{user.email}</p>
                <p className="mt-1 text-xs font-semibold text-[#879385]">Signed-in email</p>
              </div>
            </div>

            {accountMessage && <p role="status" className="mt-5 rounded-xl border border-[#dce9d8] bg-[#edf5ea] p-4 text-sm text-[#356344]">{accountMessage}</p>}
            {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}

            <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
              <div className="flex gap-2 rounded-xl bg-[#e9efe6] p-1">
                <button type="button" onClick={() => setActiveTab("orders")} className={"rounded-lg px-4 py-2.5 text-xs font-bold " + (activeTab === "orders" ? "bg-white text-[#245b42] shadow-sm" : "text-[#778576]")}>My orders</button>
                <button type="button" onClick={() => setActiveTab("profile")} className={"rounded-lg px-4 py-2.5 text-xs font-bold " + (activeTab === "profile" ? "bg-white text-[#245b42] shadow-sm" : "text-[#778576]")}>Profile details</button>
              </div>
              <Link href="/shop" className="inline-flex items-center gap-2 rounded-full bg-[#245b42] px-4 py-2.5 text-xs font-bold text-white"><ShoppingBag size={14} /> Shop products</Link>
            </div>

            {activeTab === "profile" ? (
              <form onSubmit={saveProfile} className="mt-5 max-w-3xl rounded-[26px] border border-[#e7ece4] bg-white p-6 shadow-sm sm:p-8">
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#edf4e9] text-[#46714d]"><UserRound size={20} /></span>
                  <div><h2 className="font-bold text-[#24432e]">Your profile</h2><p className="mt-1 text-xs text-[#899487]">Keep your contact details current for future orders.</p></div>
                </div>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <label className="text-xs font-bold text-[#637362]">Full name
                    <input required minLength={2} value={fullName} onChange={event => setFullName(event.target.value)} className="mt-1.5 w-full rounded-xl border border-[#dce5d9] bg-[#fbfcfa] px-4 py-3 text-sm font-normal text-[#203329] outline-none focus:border-[#6e9b76]" />
                  </label>
                  <label className="text-xs font-bold text-[#637362]">Phone number
                    <input type="tel" value={phone} onChange={event => setPhone(event.target.value)} placeholder="080…" className="mt-1.5 w-full rounded-xl border border-[#dce5d9] bg-[#fbfcfa] px-4 py-3 text-sm font-normal text-[#203329] outline-none focus:border-[#6e9b76]" />
                  </label>
                  <label className="text-xs font-bold text-[#637362] sm:col-span-2">Email address
                    <input disabled value={user.email || ""} className="mt-1.5 w-full rounded-xl border border-[#e8ede5] bg-[#f5f7f3] px-4 py-3 text-sm font-normal text-[#859081]" />
                  </label>
                </div>
                <button disabled={busy} className="mt-5 rounded-xl bg-[#245b42] px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{busy ? "Saving…" : "Save profile"}</button>
              </form>
            ) : (
              <section className="mt-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div><h2 className="text-xl font-semibold text-[#1d3d2a]">Your order history</h2><p className="mt-1 text-xs text-[#879385]">Your orders are private to your account.</p></div>
                  {pageLoading && <span className="inline-flex items-center gap-2 text-xs font-semibold text-[#71816f]"><RefreshCw size={13} className="animate-spin" /> Loading</span>}
                </div>

                {pageLoading ? (
                  <div className="rounded-2xl border border-[#e7ece4] bg-white p-10 text-center text-sm text-[#879385]">Loading your orders…</div>
                ) : orders.length ? (
                  <div className="space-y-4">
                    {orders.map(order => {
                      const place = isDelivery(order)
                        ? [order.delivery_area, order.delivery_city, order.delivery_state].filter(Boolean).join(" · ")
                        : [order.pickup_city, order.pickup_location_name].filter(Boolean).join(" · ");
                      const waText = encodeURIComponent("Hello eCuisine, I need help with order #" + order.order_number + ". Status: " + order.status + ". Payment: " + order.payment_status + ".");
                      return (
                        <article key={order.id} className="rounded-[24px] border border-[#e7ece4] bg-white p-5 shadow-sm sm:p-6">
                          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#edf1ea] pb-4">
                            <div><p className="text-[10px] font-black uppercase tracking-[.16em] text-[#94a092]">Order placed {formatDate(order.created_at)}</p><h3 className="mt-1 text-xl font-bold text-[#25432f]">#{order.order_number}</h3></div>
                            <div className="flex flex-wrap gap-2"><span className={"rounded-full px-3 py-1.5 text-[10px] font-bold " + statusClass(order.status)}>{order.status}</span><span className="rounded-full bg-[#f3f5f1] px-3 py-1.5 text-[10px] font-bold capitalize text-[#6d7b6b]">{order.payment_status}</span></div>
                          </div>
                          <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto]">
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-wider text-[#9aa496]">{isDelivery(order) ? "Delivery area" : "Pickup location"}</p>
                              <p className="mt-1 text-sm font-semibold text-[#4e604f]">{place || "Details unavailable"}</p>
                              <div className="mt-3 space-y-1.5">
                                {order.items.map((item, index) => <p key={index} className="text-xs text-[#7e8a7b]">{item.product_name} · {item.pack_size} <b className="text-[#516651]">× {item.quantity}</b></p>)}
                              </div>
                            </div>
                            <div className="sm:text-right"><p className="text-[10px] font-black uppercase tracking-wider text-[#9aa496]">Order total</p><p className="mt-1 text-xl font-bold text-[#28583b]">{money(order.total)}</p></div>
                          </div>
                          <div className="mt-5 flex flex-wrap gap-3 border-t border-[#edf1ea] pt-4">
                            <a href={"https://wa.me/2348080942328?text=" + waText} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full bg-[#edf5ea] px-4 py-2.5 text-xs font-bold text-[#356344]"><Headset size={14} /> Get order help</a>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-[26px] border border-dashed border-[#ccd9c8] bg-white px-6 py-12 text-center">
                    <span className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-[#edf4e9] text-[#47744f]"><Box size={27} /></span>
                    <h3 className="mt-5 text-lg font-semibold text-[#2b4933]">Your next order starts here.</h3>
                    <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#879385]">When you shop while signed in, your orders will appear here. If you used this email for earlier orders, they’ll be linked after your email is confirmed.</p>
                    <Link href="/shop" className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#245b42] px-5 py-3 text-sm font-bold text-white">Explore the shop <ArrowRight size={15} /></Link>
                  </div>
                )}
              </section>
            )}
            <div className="mt-8 flex items-start gap-3 rounded-2xl border border-[#e3ebde] bg-[#edf4e9] p-4">
              <ShieldCheck size={18} className="mt-0.5 shrink-0 text-[#47744f]" />
              <p className="text-xs leading-5 text-[#738271]">Your account can only access orders linked to your signed-in email or created while you are signed in. Payment remains pending until eCuisine verifies receipt.</p>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
