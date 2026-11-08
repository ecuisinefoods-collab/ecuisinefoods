import { CheckoutForm } from "@/components/checkout-form";
import { SiteHeader } from "@/components/site-header";
import { supabase } from "@/lib/supabase";
export default async function CheckoutRoute() {
 let locations: { id:string; city:"Jos"|"Bauchi"; location_name:string; instructions:string|null }[]=[];
 if(supabase){const {data}=await supabase.from("pickup_locations").select("id,city,location_name,instructions").eq("is_active",true).order("city").order("location_name");locations=(data??[]) as typeof locations;}
 return <main className="min-h-screen bg-[#fbfaf7]"><div className="bg-[#173e2d] px-4 py-2 text-center text-xs text-white">Good food, better living</div><SiteHeader/><CheckoutForm locations={locations}/></main>;
}