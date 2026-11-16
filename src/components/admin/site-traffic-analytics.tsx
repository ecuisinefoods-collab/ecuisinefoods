"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Eye, Users, FileText, Globe2, RefreshCw } from "lucide-react";

type Visit = {
  id: number;
  visitor_id: string;
  page_path: string;
  referrer_host: string | null;
  campaign_source: string | null;
  created_at: string;
};

const lagosDate = (value: string | Date) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));

const timeLabel = (value: string) =>
  new Date(value).toLocaleString("en-NG", { timeZone: "Africa/Lagos", dateStyle: "medium", timeStyle: "short" });

export function SiteTrafficAnalytics() {
  const [days, setDays] = useState<7 | 30 | 90>(30);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!supabase) {
      setError("The analytics database connection is unavailable.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const { data, error: queryError } = await supabase
      .from("site_visit_events")
      .select("id,visitor_id,page_path,referrer_host,campaign_source,created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(20000);
    if (queryError) {
      setError(queryError.message);
      setVisits([]);
    } else {
      setVisits((data || []) as Visit[]);
    }
    setLoading(false);
  }, [days]);

  useEffect(() => { void load(); }, [load]);

  const metrics = useMemo(() => {
    const today = lagosDate(new Date());
    const unique = new Set(visits.map((visit) => visit.visitor_id));
    const todayVisits = visits.filter((visit) => lagosDate(visit.created_at) === today);
    const todayUnique = new Set(todayVisits.map((visit) => visit.visitor_id));
    const pageCounts = new Map<string, number>();
    const sourceCounts = new Map<string, number>();
    const dailyCounts = new Map<string, number>();
    for (const visit of visits) {
      pageCounts.set(visit.page_path, (pageCounts.get(visit.page_path) || 0) + 1);
      const source = visit.campaign_source || visit.referrer_host || "Direct / unknown";
      sourceCounts.set(source, (sourceCounts.get(source) || 0) + 1);
      const date = lagosDate(visit.created_at);
      dailyCounts.set(date, (dailyCounts.get(date) || 0) + 1);
    }
    const daysToShow = Array.from({ length: 14 }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (13 - index));
      const key = lagosDate(date);
      return { key, label: new Intl.DateTimeFormat("en-NG", { timeZone: "Africa/Lagos", day: "numeric", month: "short" }).format(date), count: dailyCounts.get(key) || 0 };
    });
    return {
      total: visits.length,
      unique: unique.size,
      today: todayVisits.length,
      todayUnique: todayUnique.size,
      pages: Array.from(pageCounts, ([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count).slice(0, 7),
      sources: Array.from(sourceCounts, ([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count).slice(0, 7),
      daily: daysToShow,
    };
  }, [visits]);

  const maxDaily = Math.max(1, ...metrics.daily.map((day) => day.count));

  return (
    <section className="mt-7 rounded-3xl border border-[#dfe8dd] bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#789078]">Storefront audience</p>
          <h2 className="mt-1 text-xl font-bold text-[#1e3b29]">Website visitors & visits</h2>
          <p className="mt-1 text-xs text-[#879286]">Traffic from the public eCuisine website. Admin pages are excluded.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl bg-[#f1f5ef] p-1">
            {([7, 30, 90] as const).map((option) => (
              <button key={option} onClick={() => setDays(option)} className={`rounded-lg px-3 py-2 text-[11px] font-bold ${days === option ? "bg-[#245b42] text-white shadow-sm" : "text-[#657664]"}`}>
                {option} days
              </button>
            ))}
          </div>
          <button onClick={() => void load()} aria-label="Refresh visitor analytics" className="rounded-xl border border-[#e3eae1] p-2.5 text-[#52745a] hover:bg-[#f7f9f5]"><RefreshCw size={15}/></button>
        </div>
      </div>

      {error ? <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-xs text-red-700">Visitor analytics could not load: {error}</p> : loading ? (
        <p className="mt-6 text-xs text-[#718271]">Loading visitor data…</p>
      ) : (
        <>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Page views", value: metrics.total.toLocaleString("en-NG"), note: `Last ${days} days`, icon: Eye },
              { label: "Unique visitors", value: metrics.unique.toLocaleString("en-NG"), note: "Distinct anonymous browsers", icon: Users },
              { label: "Today's visits", value: metrics.today.toLocaleString("en-NG"), note: `${metrics.todayUnique} unique today`, icon: Globe2 },
              { label: "Pages visited", value: metrics.pages.length ? String(new Set(visits.map((visit) => visit.page_path)).size) : "0", note: "Different storefront pages", icon: FileText },
            ].map((item) => (
              <article key={item.label} className="rounded-2xl border border-[#e8eee6] bg-[#fbfcfa] p-4">
                <div className="flex items-center justify-between"><p className="text-[11px] font-semibold text-[#788777]">{item.label}</p><item.icon size={17} className="text-[#5e8065]"/></div>
                <p className="mt-2 text-2xl font-bold tracking-tight text-[#1e3b29]">{item.value}</p>
                <p className="mt-1 text-[10px] text-[#97a194]">{item.note}</p>
              </article>
            ))}
          </div>

          {visits.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-[#dce6d9] bg-[#fafcf9] px-5 py-9 text-center">
              <Eye className="mx-auto text-[#9aad98]" size={25}/>
              <p className="mt-3 text-sm font-bold text-[#405744]">Visitor tracking is ready</p>
              <p className="mt-1 text-xs text-[#879286]">No storefront visits have been recorded in this period yet. Open the public website in another tab to create the first test visit.</p>
            </div>
          ) : (
            <div className="mt-6 grid gap-5 xl:grid-cols-[1.5fr_1fr]">
              <section className="rounded-2xl border border-[#e8eee6] p-4 sm:p-5">
                <h3 className="text-sm font-bold text-[#294332]">Daily visits</h3>
                <p className="mt-1 text-[10px] text-[#879286]">Last 14 days · Lagos time</p>
                <div className="mt-5 flex h-40 items-end gap-1.5 border-b border-l border-[#e8eee5] px-2 pb-2 sm:gap-2">
                  {metrics.daily.map((day) => (
                    <div key={day.key} className="group relative flex h-full min-w-0 flex-1 items-end justify-center">
                      <div title={`${day.label}: ${day.count} visits`} className="w-full max-w-5 rounded-t-md bg-[#39734f] transition-opacity group-hover:opacity-75" style={{ height: `${day.count ? Math.max(4, day.count / maxDaily * 100) : 0}%` }}/>
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex justify-between text-[9px] text-[#8b9788]"><span>{metrics.daily[0]?.label}</span><span>{metrics.daily[6]?.label}</span><span>{metrics.daily[13]?.label}</span></div>
              </section>
              <section className="rounded-2xl border border-[#e8eee6] p-4 sm:p-5">
                <h3 className="text-sm font-bold text-[#294332]">Top pages</h3>
                <p className="mt-1 text-[10px] text-[#879286]">Most viewed storefront routes</p>
                <div className="mt-4 space-y-3">
                  {metrics.pages.map((page) => (
                    <div key={page.label}>
                      <div className="mb-1 flex items-center justify-between gap-3 text-[11px]"><span className="min-w-0 truncate text-[#526452]">{page.label}</span><b className="shrink-0 text-[#315b3e]">{page.count}</b></div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-[#edf2eb]"><div className="h-full rounded-full bg-[#83a58a]" style={{ width: `${page.count / Math.max(1, metrics.pages[0]?.count || 1) * 100}%` }}/></div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}

          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <section className="rounded-2xl border border-[#e8eee6] p-4 sm:p-5">
              <h3 className="text-sm font-bold text-[#294332]">Traffic sources</h3>
              <p className="mt-1 text-[10px] text-[#879286]">Referring domains and campaign tags</p>
              <div className="mt-4 space-y-2">
                {metrics.sources.length ? metrics.sources.map((source) => (
                  <div key={source.label} className="flex items-center justify-between gap-3 rounded-lg bg-[#f8faf7] px-3 py-2 text-[11px]"><span className="truncate text-[#596a58]">{source.label}</span><b className="text-[#315b3e]">{source.count}</b></div>
                )) : <p className="text-xs text-[#879286]">No source information yet.</p>}
              </div>
            </section>
            <section className="rounded-2xl border border-[#e8eee6] p-4 sm:p-5">
              <h3 className="text-sm font-bold text-[#294332]">Recent storefront activity</h3>
              <p className="mt-1 text-[10px] text-[#879286]">Latest recorded page visits</p>
              <div className="mt-4 space-y-2">
                {visits.slice(0, 7).map((visit) => (
                  <div key={visit.id} className="flex items-start justify-between gap-3 border-b border-[#f0f3ee] pb-2 last:border-0">
                    <div className="min-w-0"><p className="truncate text-[11px] font-semibold text-[#526452]">{visit.page_path}</p><p className="mt-1 truncate text-[9px] text-[#98a294]">{visit.campaign_source || visit.referrer_host || "Direct / unknown"}</p></div>
                    <time className="shrink-0 text-[9px] text-[#879286]">{timeLabel(visit.created_at)}</time>
                  </div>
                ))}
              </div>
            </section>
          </div>
          <p className="mt-4 text-[10px] leading-5 text-[#96a092]">Visitors are counted using a random browser identifier stored locally on their device. No names, email addresses, IP addresses, or full referrer URLs are collected. Counts are approximate and may exclude visitors who block browser storage or tracking.</p>
        </>
      )}
    </section>
  );
}
