import { CheckoutForm } from "@/components/checkout-form";
import { supabase } from "@/lib/supabase";

export default async function CheckoutRoute() {
  let locations: { id:string; city:"Jos"|"Bauchi"; location_name:string; instructions:string|null }[] = [];
  if (supabase) {
    const { data } = await supabase.from("pickup_locations").select("id,city,location_name,instructions").eq("is_active",true).order("city").order("location_name");
    locations = (data ?? []) as typeof locations;
  }
  return <CheckoutForm locations={locations}/>;
}
