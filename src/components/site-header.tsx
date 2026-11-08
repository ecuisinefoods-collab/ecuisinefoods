import Link from "next/link";
import { ShoppingBag } from "lucide-react";
export function SiteHeader() {
 return <header className="site-header sticky top-0 z-40 border-b border-[#e9e4d8] bg-[#fffdf8]/95 backdrop-blur-xl"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-3 sm:py-4">
 <Link href="/" className="brand-lockup flex items-center gap-3" aria-label="eCuisinefoods home"><span className="flex h-12 items-center"><img src="/images/ecuisinefoods-logo.webp" alt="eCuisinefoods — Good Food, Better Living" className="h-12 w-auto max-w-[220px] object-contain"/></span></Link>
 <Link href="/cart" className="order-2 inline-flex items-center gap-2 rounded-full bg-[#17452f] px-4 py-2.5 text-sm font-bold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-[#0e3421] sm:order-3"><ShoppingBag size={16}/> Cart</Link>
 <nav aria-label="Main navigation" className="order-3 flex w-full flex-wrap items-center justify-center gap-x-5 gap-y-2 border-t border-[#eee9dd] pt-3 text-xs font-bold text-[#435348] sm:order-2 sm:w-auto sm:border-0 sm:pt-0 sm:text-sm"><Link className="nav-link" href="/">Home</Link><Link className="nav-link" href="/shop">Shop</Link><Link className="nav-link" href="/about">About</Link><Link className="nav-link" href="/faq">FAQ</Link><Link className="nav-link" href="/contact">Contact</Link></nav>
 </div></header>;
}