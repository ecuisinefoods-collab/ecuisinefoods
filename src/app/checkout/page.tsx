import { CheckoutForm } from "@/components/checkout-form";
import { SiteHeader } from "@/components/site-header";
import { supabase } from "@/lib/supabase";

export default async function CheckoutRoute() {
  let locations: { id: string; city: "Jos" | "Bauchi"; location_name: string; instructions: string | null }[] = [];
  let deliveryZones: { id: string; state: string; city: string; area_name: string; delivery_fee: number; minimum_order_amount: number; estimated_days: string | null; instructions: string | null; sort_order: number }[] = [];

  if (supabase) {
    const { data } = await supabase.from("pickup_locations")
      .select("id,city,location_name,instructions,address,opening_hours,contact_phone")
      .eq("is_active", true).order("city").order("location_name");
    locations = (data ?? []) as typeof locations;

    const { data: zones } = await supabase.from("delivery_zones")
      .select("id,state,city,area_name,delivery_fee,minimum_order_amount,estimated_days,instructions,sort_order")
      .eq("is_active", true)
      .in("state", ["Plateau", "Federal Capital Territory"])
      .in("city", ["Jos", "Abuja"])
      .order("sort_order").order("created_at").order("id");
    deliveryZones = (zones ?? []) as typeof deliveryZones;
  }

  return <main className="storefront-glass min-h-screen bg-[#fbfaf7]">
    <div className="bg-[#173e2d] px-4 py-2 text-center text-xs text-white">Good food, better living</div>
    <SiteHeader />
    <CheckoutForm locations={locations} deliveryZones={deliveryZones} />
  </main>;
}
