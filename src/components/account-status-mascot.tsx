"use client";

import { AlertTriangle, Ban, CheckCircle2, Clock3, PauseCircle, ShieldAlert, Sparkles } from "lucide-react";

type AccountStatus = "active" | "paused" | "suspended" | "banned" | "deleted" | "under_review" | "restored" | string;

const visuals: Record<string, { title: string; subtitle: string; symbol: typeof ShieldAlert; tone: string; ring: string }> = {
  active: { title: "Active", subtitle: "All systems go", symbol: Sparkles, tone: "bg-emerald-500 text-white", ring: "ring-emerald-200" },
  paused: { title: "Paused", subtitle: "Temporarily on hold", symbol: PauseCircle, tone: "bg-amber-400 text-[#49330a]", ring: "ring-amber-200" },
  suspended: { title: "Suspended", subtitle: "Access temporarily restricted", symbol: Clock3, tone: "bg-orange-500 text-white", ring: "ring-orange-200" },
  banned: { title: "Banned", subtitle: "Access permanently blocked", symbol: Ban, tone: "bg-rose-600 text-white", ring: "ring-rose-200" },
  deleted: { title: "Removed", subtitle: "No longer in the programme", symbol: ShieldAlert, tone: "bg-slate-600 text-white", ring: "ring-slate-200" },
  under_review: { title: "Under review", subtitle: "We're checking the account", symbol: AlertTriangle, tone: "bg-amber-400 text-[#49330a]", ring: "ring-amber-200" },
  restored: { title: "Restored", subtitle: "Welcome back", symbol: CheckCircle2, tone: "bg-emerald-500 text-white", ring: "ring-emerald-200" },
};

export default function AccountStatusMascot({ status, compact = false }: { status: AccountStatus; compact?: boolean }) {
  const item = visuals[status] || visuals.active;
  const Symbol = item.symbol;
  return (
    <div className={`flex ${compact ? "items-center gap-3" : "flex-col items-center"}`}>
      <div className={`relative ${compact ? "h-20 w-20" : "h-56 w-56"}`}>
        <div className={`absolute inset-[12%] rounded-full bg-gradient-to-br from-[#dff3c9] via-[#eff8e7] to-white blur-[1px] ring-1 ${item.ring}`} />
        <img
          src="/affiliate-sad-mascot.svg"
          alt={`eCuisine ${item.title.toLowerCase()} account mascot`}
          className={`account-mascot-float relative z-10 h-full w-full object-contain drop-shadow-[0_12px_12px_rgba(24,75,42,.18)] ${status === "active" || status === "restored" ? "account-mascot-happy" : ""}`}
        />
        <span className={`absolute z-20 grid place-items-center rounded-full shadow-lg ring-4 ring-white ${item.tone} ${compact ? "right-0 top-1 h-8 w-8" : "right-[8%] top-[10%] h-12 w-12"}`}>
          <Symbol size={compact ? 16 : 23} strokeWidth={2.7} />
        </span>
      </div>
      <div className={compact ? "min-w-0" : "mt-2 text-center"}>
        <p className={`font-black text-[#274532] ${compact ? "text-xs" : "text-lg"}`}>{item.title}</p>
        {!compact && <p className="mt-1 text-xs text-[#7c8b7d]">{item.subtitle}</p>}
      </div>
      <style jsx>{`
        .account-mascot-float { animation: mascotFloat 3.4s ease-in-out infinite; transform-origin: 50% 65%; }
        .account-mascot-happy { filter: drop-shadow(0 12px 12px rgba(24,75,42,.18)) saturate(1.12); }
        @keyframes mascotFloat { 0%,100% { transform: translateY(0) rotate(-1deg); } 50% { transform: translateY(-7px) rotate(1deg); } }
        @media (prefers-reduced-motion: reduce) { .account-mascot-float { animation: none; } }
      `}</style>
    </div>
  );
}
