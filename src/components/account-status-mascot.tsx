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
    <div className={`flex ${compact ? "items-center gap-3" : "flex-col items-center"}`} aria-label={`eCuisine account status: ${item.title}`}>
      <div className={`mascot-stage relative isolate shrink-0 ${compact ? "h-20 w-20" : "h-56 w-56"}`}>
        <div className={`mascot-glow absolute inset-[11%] rounded-full bg-gradient-to-br from-[#e3f8d3] via-[#f4fae9] to-white ring-1 ${item.ring}`} />
        <div className="mascot-shadow absolute bottom-[7%] left-[24%] h-[7%] w-[52%] rounded-[50%] bg-[#275b31]/20 blur-md" />
        <img
          src="/eCuisine-3d-mascot.webp"
          alt={`eCuisine 3D mascot representing an ${item.title.toLowerCase()} account`}
          draggable={false}
          className="mascot-character relative z-10 h-full w-full select-none object-contain"
        />
        <span className={`mascot-status absolute z-20 grid place-items-center rounded-full shadow-[0_5px_14px_rgba(20,50,25,.24)] ring-[3px] ring-white ${item.tone} ${compact ? "right-0 top-1 h-8 w-8" : "right-[8%] top-[10%] h-12 w-12"}`}>
          <Symbol size={compact ? 16 : 23} strokeWidth={2.7} />
        </span>
      </div>
      <div className={compact ? "min-w-0" : "mt-1 text-center"}>
        <p className={`font-black tracking-tight text-[#274532] ${compact ? "text-xs" : "text-lg"}`}>{item.title}</p>
        {!compact && <p className="mt-1 text-xs text-[#7c8b7d]">{item.subtitle}</p>}
      </div>
      <style jsx>{`
        .mascot-character {
          transform-origin: 50% 72%;
          filter: drop-shadow(0 10px 10px rgba(24,75,42,.15)) saturate(1.04);
          animation: mascot-float 4s ease-in-out infinite;
        }
        .mascot-glow { box-shadow: inset 0 0 22px rgba(255,255,255,.8), 0 10px 34px rgba(79,133,54,.08); }
        .mascot-status { backdrop-filter: blur(8px); }
        @keyframes mascot-float {
          0%, 100% { transform: translate3d(0, 0, 0) rotate(-1deg); }
          50% { transform: translate3d(0, -7px, 0) rotate(1deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          .mascot-character { animation: none; }
        }
      `}</style>
    </div>
  );
}
