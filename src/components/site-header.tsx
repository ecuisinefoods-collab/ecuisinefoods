import Link from "next/link";
import { ShoppingBag } from "lucide-react";
export function SiteHeader() {
 return <header className="sticky top-0 z-30 border-b border-[#e7e8df] bg-white/95 backdrop-blur"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-3 sm:py-4">
 <Link href="/" className="flex items-center gap-2" aria-label="eCuisinefoods home"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#245b42] text-lg font-bold text-white">e</span><span><span className="block text-lg font-bold tracking-tight text-[#173e2d]">Cuisinefoods</span><span className="block text-[10px] font-semibold uppercase tracking-[.19em] text-[#7b8276]">Good food, better living</span></span></Link>
 <Link href="/cart" className="order-2 inline-flex items-center gap-2 rounded-full bg-[#245b42] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#173e2d] sm:order-3"><ShoppingBag size={16}/> Cart</Link>
 <nav aria-label="Main navigation" className="order-3 flex w-full flex-wrap items-center justify-center gap-x-5 gap-y-2 border-t border-[#eef0e9] pt-3 text-xs font-semibold text-[#435348] sm:order-2 sm:w-auto sm:border-0 sm:pt-0 sm:text-sm"><Link href="/">Home</Link><Link href="/shop">Shop</Link><Link href="/about">About</Link><Link href="/faq">FAQ</Link><Link href="/contact">Contact</Link></nav>
 </div></header>;
}