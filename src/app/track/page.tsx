"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Circle, ClipboardList, Headset, MapPin, PackageCheck, Search, Truck } from "lucide-react";
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

const moneyDate = (value?: string) => value
  ? new Date(value).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })
  : "Not available";

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
        setError("We could not check this order right now. Please try again or contact eCuisine support.");
      } else if (!data?.found) {
        setError("We could not find an order with that tracking code. Check the private code from your order confirmation and try again.");
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
  const supportText = result
    ? "Hello eCuisine, I need help with order #" + result.order_number
      + ". Current order status: " + (result.status || "Not available")
      + ". Payment status: " + (result.payment_status || "Not available")
      + ". Please assist me."
    : "Hello eCuisine, I need help tracking my order.";
  const supportUrl = "https://wa.me/2348080942328?text=" + encodeURIComponent(supportText);
  const destination = result
    ? isDelivery
      ? [result.delivery_area, result.delivery_city, result.delivery_state].filter(Boolean).join(" · ")
      : [result.pickup_city, result.pickup_location_name].filter(Boolean).join(" · ")
    : "";

  return (
    <main className="storefront-glass min-h-screen bg-[#fbfaf7] px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-[#42694b]">
          <ArrowLeft size={15} /> Back to store
        </Link>

        <section className="mt-7 overflow-hidden rounded-3xl border border-white/70 bg-white/75 shadow-2xl shadow-[#506f56]/10 backdrop-blur-2xl">
          <div className="bg-[#173e2d] px-6 py-7 text-white sm:px-9">
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10">
                <Truck size={23} />
              </span>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#d2e3d1]">eCuisine order care</p>
                <h1 className="mt-1 text-3xl font-semibold tracking-tight">Track your order</h1>
              </div>
            </div>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-[#e4eee2]">
              See the latest order progress, payment status and your selected pickup or delivery details.
              You can track an order without creating an account.
            </p>
          </div>

          <div className="p-5 sm:p-9">
            <form onSubmit={submit} className="rounded-2xl border border-[#e2e9df] bg-[#f8faf6] p-4 sm:p-5">
              <label htmlFor="tracking-code" className="block text-xs font-bold text-[#526552]">
                Private tracking code
              </label>
              <div className="mt-2 flex flex-col gap-3 sm:flex-row">
                <input
                  id="tracking-code"
                  required
                  autoComplete="off"
                  value={code}
                  onChange={event => setCode(event.target.value)}
                  placeholder="Paste the code from your order confirmation"
                  className="min-w-0 flex-1 rounded-xl border border-[#dce5d9] bg-white px-4 py-3 text-sm text-[#203329] outline-none focus:border-[#245b42]"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#245b42] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#173e2d] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Search size={15} /> {loading ? "Checking order…" : "Track order"}
                </button>
              </div>
              <p className="mt-2 text-[11px] leading-5 text-[#879286]">
                Your tracking code is private. Keep it safe and do not post it publicly.
              </p>
            </form>

            {error && (
              <div role="alert" className="mt-5 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
            )}

            {result && (
              <section className="mt-7" aria-live="polite">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#e9eee6] pb-5">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[.18em] text-[#879286]">Order reference</p>
                    <h2 className="mt-1 text-2xl font-bold text-[#173e2d]">#{result.order_number}</h2>
                    <p className="mt-1 text-xs text-[#829080]">Placed {moneyDate(result.created_at)}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className={"rounded-full px-3 py-1.5 text-xs font-bold " + (isCancelled ? "bg-red-50 text-red-700" : "bg-[#edf5ea] text-[#245b42]")}>
                      {result.status || "Status unavailable"}
                    </span>
                    <span className="rounded-full bg-[#fff7e8] px-3 py-1.5 text-xs font-bold text-[#806126]">
                      Payment: {result.payment_status || "Not available"}
                    </span>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-[#f7f8f3] p-4">
                    <p className="text-[10px] font-black uppercase tracking-wider text-[#899487]">Fulfilment</p>
                    <p className="mt-1 text-sm font-bold capitalize text-[#263d2d]">
                      {result.fulfillment_method === "delivery" ? "Home delivery" : "Pickup"}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-[#f7f8f3] p-4">
                    <p className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-[#899487]">
                      <MapPin size={12} /> {isDelivery ? "Delivery area" : "Pickup location"}
                    </p>
                    <p className="mt-1 text-sm font-bold text-[#263d2d]">{destination || "Details unavailable"}</p>
                  </div>
                </div>

                <div className="mt-7">
                  <div className="flex items-center gap-2">
                    <PackageCheck size={18} className="text-[#245b42]" />
                    <h3 className="font-bold text-[#203329]">Order progress</h3>
                  </div>
                  {isCancelled ? (
                    <p className="mt-3 rounded-xl border border-red-100 bg-red-50 p-4 text-sm leading-6 text-red-700">
                      This order is cancelled. Contact our team on WhatsApp if you need an explanation or help with next steps.
                    </p>
                  ) : currentIndex < 0 ? (
                    <p className="mt-3 rounded-xl bg-[#fff7e8] p-4 text-sm leading-6 text-[#795b21]">
                      Your order currently has the status “{result.status}”. Contact our team for help understanding this update.
                    </p>
                  ) : (
                    <ol className="mt-4 grid gap-3 sm:grid-cols-5">
                      {steps.map((step, index) => {
                        const complete = index <= currentIndex;
                        const current = index === currentIndex;
                        return (
                          <li key={step} className={"rounded-2xl border p-3 " + (current ? "border-[#8fb497] bg-[#edf5ea]" : complete ? "border-[#d7e5d4] bg-[#f7faf5]" : "border-[#e7ebe4] bg-white")}>
                            <span className={"inline-flex h-7 w-7 items-center justify-center rounded-full " + (complete ? "bg-[#245b42] text-white" : "bg-[#eef1eb] text-[#9aa598]")}>
                              {complete ? <CheckCircle2 size={16} /> : <Circle size={15} />}
                            </span>
                            <p className={"mt-2 text-xs font-bold leading-5 " + (complete ? "text-[#245b42]" : "text-[#899487]")}>{step}</p>
                            {current && <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-[#628064]">Current stage</p>}
                          </li>
                        );
                      })}
                    </ol>
                  )}
                </div>

                <div className="mt-7">
                  <h3 className="font-bold text-[#203329]">Items in this order</h3>
                  <div className="mt-3 space-y-2">
                    {(result.items || []).map((item, index) => (
                      <div key={index} className="flex items-center justify-between gap-3 rounded-xl border border-[#edf0e9] bg-white p-3 text-sm">
                        <span className="min-w-0 text-[#405044]">{item.product_name} <span className="text-[#899288]">· {item.pack_size}</span></span>
                        <b className="shrink-0 text-[#315b43]">× {item.quantity}</b>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-7 flex flex-col gap-3 rounded-2xl bg-[#f1f6ee] p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <Headset size={19} className="mt-0.5 shrink-0 text-[#245b42]" />
                    <div>
                      <p className="text-sm font-bold text-[#244b34]">Need help with this order?</p>
                      <p className="mt-1 text-xs leading-5 text-[#68766b]">Message our team with this order number and its latest status already included.</p>
                    </div>
                  </div>
                  <a href={supportUrl} target="_blank" rel="noopener noreferrer" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-[#16834a] px-5 py-3 text-xs font-bold text-white">
                    <Headset size={14} /> Contact order support
                  </a>
                </div>
              </section>
            )}

            <div className="mt-7 flex flex-wrap gap-4 border-t border-[#e9eee6] pt-5 text-sm">
              <Link href="/faq" className="font-bold text-[#245b42]">Read the FAQs</Link>
              <Link href="/contact" className="font-bold text-[#245b42]">Contact eCuisine</Link>
              <Link href="/shop" className="inline-flex items-center gap-1 font-bold text-[#245b42]"><ClipboardList size={14} /> Continue shopping</Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
