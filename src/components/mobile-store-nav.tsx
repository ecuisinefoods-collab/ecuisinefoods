"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, ShoppingBag, ClipboardList } from "lucide-react";

const items=[{href:"/",label:"Home",icon:Home},{href:"/shop",label:"Shop",icon:Search},{href:"/cart",label:"Cart",icon:ShoppingBag},{href:"/track",label:"Orders",icon:ClipboardList}];
export function MobileStoreNav(){
 const pathname=usePathname();
 return <nav aria-label="Mobile shopping navigation" className="mobile-store-nav fixed inset-x-0 bottom-0 z-[60] grid grid-cols-4 border-t border-[#dce8df] bg-white/95 px-2 pb-[max(env(safe-area-inset-bottom),8px)] pt-2 shadow-[0_-8px_30px_rgba(8,70,45,.10)] backdrop-blur-xl sm:hidden">
 {items.map(item=>{const active=item.href==="/"?pathname==="/":pathname===item.href||pathname.startsWith(item.href+"/");const Icon=item.icon;return <Link key={item.href} href={item.href} aria-current={active?"page":undefined} className={"flex flex-col items-center gap-1 rounded-xl py-1.5 text-[10px] font-bold "+(active?"text-[#087f5b]":"text-[#7d8d80]")}><Icon size={19} strokeWidth={active?2.5:2}/>{item.label}</Link>})}
 </nav>;
}
