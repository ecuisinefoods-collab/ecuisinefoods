"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Circle, Headset, MapPin, Package, Search, Truck } from "lucide-react";
import { supabase } from "@/lib/supabase";

type TrackingItem = { product_name: string; pack_size: string; quantity: number };
type TrackingResult = {
  found: boolean;
  order_number?: number;
  status?: string;
  payment_status?: string;
  fulfillment_method?: string;
  pickup_city?: string;
  pickup_location_name?: string;
  delivery_state?: string;
  delivery_city?: string;
  delivery_area?: string;
  created_at?: string;
  items?: TrackingItem[];
};

const formatDate = (value?: string) => value
  ? new Date(value).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })
  : "Date unavailable";

export default function TrackOrderPage() {
  const [code, setCode] = useState("");
  const [result, setResult] = useState<TrackingResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const lookup = useCallback(async (trackingCode: string) => {
    const value = trackingCode.trim();
    if (!value) {
      setError("Enter the private tracking code from your order confirmation.");
      return;
    }
    if (!supabase) {
      setError("Order tracking is temporarily unavailable. Please contact eCuisine support.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);
    try {
      const { data, error: rpcError } = await supabase.rpc("track_order_request", {
        p_tracking_code: value,
      });
      if (rpcError) {
        setError("We could not check this order right now. Please try again or contact our team.");
      } else if (!data?.found) {
        setError("We could not find an order with that tracking code. Check your confirmation message and try again.");
      } else {
        setResult(data as TrackingResult);
      }
    } catch {
      setError("Something went wrong while checking your order. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get("code");
    if (value) {
      setCode(value);
      void lookup(value);
    }
  }, [lookup]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void lookup(code);
  }

  const isDelivery = result?.fulfillment_method === "delivery";
  const steps = useMemo(
    () => ["New", "Confirmed", "Processing", isDelivery ? "Out for delivery" : "Ready for pickup", "Completed"],
    [isDelivery]
  );
  const currentIndex = result ? steps.indexOf(result.status || "New") : -1;
  const isCancelled = result?.status === "Cancelled";
  const destination = result
    ? isDelivery
      ? [result.delivery_area, result.delivery_city, result.delivery_state].filter(Boolean).join(" · ")
      : [result.pickup_city, result.pickup_location_name].filter(Boolean).join(" · ")
    : "";
  const supportText = result
    ? "Hello eCuisine, I need help with order #" + result.order_number
      + ". Current status: " + (result.status || "Not available")
      + ". Payment status: " + (result.payment_status || "Not available") + "."
    : "Hello eCuisine, I need help tracking my order.";
  const supportUrl = "https://wa.me/2348080942328?text=" + encodeURIComponent(supportText);

  return (
    <main className="min-h-screen bg-[#f5f7f2] px-4 pb-24 pt-7 sm:px-6 sm:pt-10">
      <div className="mx-auto max-w-5xl">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-[#41634b] transition hover:text-[#173e2d]">
          <ArrowLeft size={15} /> Back to store
        </Link>

        <section className="mt-6 overflow-hidden rounded-[30px] border border-white bg-white shadow-[0_24px_80px_rgba(24,57,37,.08)]">
          <div className="relative overflow-hidden bg-gradient-to-br from-[#173e2d] via-[#20553c] to-[#2a6748] px-6 py-9 text-white sm:px-10 sm:py-12">
            <div className="pointer-events-none absolute -right-14 -top-24 h-64 w-64 rounded-full border border-white/10" />
            <div className="pointer-events-none absolute -right-2 -top-12 h-40 w-40 rounded-full border border-white/10" />
            <div className="relative max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.18em] text-[#d8e8d7]">
                <Truck size={13} /> eCuisine order care
              </span>
              <h1 className="mt-5 text-3xl font-semibold tracking-tight sm:text-5xl">Your order, at a glance.</h1>
              <p className="mt-4 max-w-xl text-sm leading-7 text-[#e2eee1] sm:text-base">
                See where your order is, check its payment status and find your pickup or delivery details in one place.
              </p>
            </div>
          </div>

          <div className="grid gap-8 p-5 sm:p-9 lg:grid-cols-[.85fr_1.15fr]">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.16em] text-[#82917f]">Find an order</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#1d3b29]">Enter your tracking code</h2>
              <p className="mt-3 text-sm leading-6 text-[#788577]">
                Use the private code from your order confirmation. No customer account is needed.
              </p>
              <form onSubmit={submit} className="mt-6 space-y-3">
                <label htmlFor="tracking-code" className="block text-xs font-bold text-[#526552]">Private tracking code</label>
                <input
                  id="tracking-code"
                  required
                  autoComplete="off"
                  value={code}
                  onChange={event => setCode(event.target.value)}
                  placeholder="Paste your tracking code"
                  className="w-full rounded-2xl border border-[#dce5d9] bg-[#fbfcfa] px-4 py-3.5 text-sm text-[#203329] outline-none transition placeholder:text-[#a0aa9e] focus:border-[#6e9b76] focus:bg-white focus:ring-4 focus:ring-[#e8f1e6]"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#245b42] px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#245b42]/15 transition hover:-translate-y-0.5 hover:bg-[#173e2d] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Search size={16} /> {loading ? "Checking order…" : "Track my order"}
                </button>
              </form>
              <p className="mt-4 text-[11px] leading-5 text-[#96a092]">Keep your tracking code private. Anyone with the code may be able to view the order summary.</p>
              {error && (
                <div role="alert" className="mt-5 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm leading-6 text-red-700">
                  {error}
                </div>
              )}
              <div className="mt-7 rounded-2xl bg-[#f2f6ef] p-4">
                <p className="text-sm font-bold text-[#294b32]">Order more easily next time</p>
                <p className="mt-1 text-xs leading-5 text-[#768575]">Create an eCuisine account to keep your order history together.</p>
                <Link href="/account" className="mt-3 inline-flex text-xs font-bold text-[#245b42] hover:underline">Open my account <span aria-hidden="true">→</span></Link>
              </div>
            </div>

            <div className="min-h-[260px] rounded-[24px] border border-[#e8eee5] bg-[#fbfcfa] p-5 sm:p-6">
              {!result ? (
                <div className="flex h-full min-h-[230px] flex-col items-center justify-center text-center">
                  <span className="grid h-16 w-16 place-items-center rounded-3xl bg-[#edf4ea] text-[#4c7654]"><Package size={27} /></span>
                  <h3 className="mt-5 text-lg font-semibold text-[#284432]">Your delivery updates live here</h3>
                  <p className="mt-2 max-w-sm text-sm leading-6 text-[#8a9588]">Enter your tracking code to see the latest progress and order details.</p>
                </div>
              ) : (
                <section aria-live="polite">
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#e6ece2] pb-5">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[.16em] text-[#94a092]">Order reference</p>
                      <h2 className="mt-1 text-2xl font-bold tracking-tight text-[#1e3e2b]">#{result.order_number}</h2>
                      <p className="mt-1 text-xs text-[#899586]">Placed {formatDate(result.created_at)}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className={"rounded-full px-3 py-1.5 text-[11px] font-bold " + (isCancelled ? "bg-red-50 text-red-700" : "bg-[#eaf3e7] text-[#2c6540]")}>
                        {result.status || "Status unavailable"}
                      </span>
                      <span className="rounded-full bg-[#fff5e5] px-3 py-1.5 text-[11px] font-bold capitalize text-[#896326]">
                        Payment: {result.payment_status || "Unknown"}
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#edf0e9]">
                      <p className="text-[10px] font-black uppercase tracking-wider text-[#98a294]">How you receive it</p>
                      <p className="mt-1 text-sm font-bold capitalize text-[#294431]">{isDelivery ? "Home delivery" : "Pickup"}</p>
                    </div>
                    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#edf0e9]">
                      <p className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-[#98a294]"><MapPin size={12} /> {isDelivery ? "Delivery area" : "Pickup location"}</p>
                      <p className="mt-1 text-sm font-bold text-[#294431]">{destination || "Details unavailable"}</p>
                    </div>
                  </div>

                  <div className="mt-7">
                    <h3 className="font-bold text-[#203b2b]">Order progress</h3>
                    {isCancelled ? (
                      <p className="mt-3 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm leading-6 text-red-700">This order is cancelled. Contact our team on WhatsApp if you need help with next steps.</p>
                    ) : currentIndex < 0 ? (
                      <p className="mt-3 rounded-2xl bg-[#fff6e7] p-4 text-sm leading-6 text-[#80612c]">Your order currently shows “{result.status}”. Contact the team if you need help understanding this update.</p>
                    ) : (
                      <ol className="mt-4 grid gap-2 sm:grid-cols-5">
                        {steps.map((step, index) => {
                          const complete = index <= currentIndex;
                          const current = index === currentIndex;
                          return (
                            <li key={step} className={"rounded-2xl border p-3 " + (current ? "border-[#9abb9e] bg-[#edf5ea]" : complete ? "border-[#e0eadc] bg-white" : "border-[#e9eee6] bg-white/50")}>
                              <span className={"inline-flex h-7 w-7 items-center justify-center rounded-full " + (complete ? "bg-[#245b42] text-white" : "bg-[#eff2ed] text-[#a1aa9e]")}>
                                {complete ? <CheckCircle2 size={16} /> : <Circle size={15} />}
                              </span>
                              <p className={"mt-2 text-[11px] font-bold leading-5 " + (complete ? "text-[#245b42]" : "text-[#929d91]")}>{step}</p>
                              {current && <p className="mt-1 text-[9px] font-bold uppercase tracking-wider text-[#6f8d70]">Current stage</p>}
                            </li>
                          );
                        })}
                      </ol>
                    )}
                  </div>

                  <div className="mt-7">
                    <h3 className="font-bold text-[#203b2b]">Items in this order</h3>
                    <div className="mt-3 space-y-2">
                      {(result.items || []).map((item, index) => (
                        <div key={index} className="flex items-center justify-between gap-3 rounded-xl bg-white px-4 py-3 text-sm ring-1 ring-[#edf0e9]">
                          <span className="min-w-0 text-[#48584b]">{item.product_name} <span className="text-[#98a194]">· {item.pack_size}</span></span>
                          <b className="shrink-0 text-[#315b43]">× {item.quantity}</b>
                        </div>
                      ))}
                    </div>
                  </div>

                  <a href={supportUrl} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#eaf4e8] px-5 py-3 text-sm font-bold text-[#245b42] transition hover:bg-[#dfeedd]">
                    <Headset size={16} /> Get help with this order
                  </a>
                </section>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
