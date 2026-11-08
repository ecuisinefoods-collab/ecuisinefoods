import Link from "next/link";
import { ShoppingBag } from "lucide-react";
export function SiteHeader() {
 return <header className="sticky top-0 z-30 border-b border-[#e7e8df] bg-white/95 backdrop-blur"><div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4">
 <Link href="/" className="flex items-center gap-2" aria-label="eCuisinefoods home"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#245b42] text-lg font-bold text-white">e</span><span><span className="block text-lg font-bold tracking-tight text-[#173e2d]">Cuisinefoods</span><span className="block text-[10px] font-semibold uppercase tracking-[.19em] text-[#7b8276]">Good food, better living</span></span></Link>
 <nav aria-label="Main navigation" className="hidden items-center gap-6 text-sm font-semibold text-[#435348] md:flex"><Link href="/">Home</Link><Link href="/shop">Shop</Link><Link href="/about">About</Link><Link href="/faq">FAQ</Link><Link href="/contact">Contact</Link></nav>
 <Link href="/cart" className="inline-flex items-center gap-2 rounded-full bg-[#245b42] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#173e2d]"><ShoppingBag size={16}/> Cart</Link>
 </div></header>;
}