import { CartPage } from "@/components/product-catalog";
import { SiteHeader } from "@/components/site-header";
export default function CartRoute() { return <main className="min-h-screen bg-[#fbfaf7]"><div className="bg-[#173e2d] px-4 py-2 text-center text-xs text-white">Good food, better living</div><SiteHeader/><CartPage/></main>; }