"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

export function ReferralTracker(){
  useEffect(()=>{
    const params=new URLSearchParams(window.location.search);
    const code=(params.get("ref")||"").trim().toUpperCase();
    if(!code || !/^[A-Z0-9-]{4,40}$/.test(code)) return;

    // Each referral visit gets a fresh attribution token. Only its hash is stored server-side.
    const attributionToken = `${crypto.randomUUID()}${crypto.randomUUID()}`;
    try{
      window.localStorage.setItem("ecuisine_partner_referral",code);
      window.localStorage.setItem("ecuisine_partner_referral_at",String(Date.now()));
      window.localStorage.setItem("ecuisine_partner_referral_click_token",attributionToken);
    }catch{
      return;
    }

    if(supabase){
      void supabase.rpc("record_partner_referral_click",{
        p_referral_code:code,
        p_landing_path:window.location.pathname,
        p_attribution_token:attributionToken
      }).then(({error})=>{
        if(error) console.warn("Referral click could not be recorded.");
      });
    }
  },[]);
  return null;
}
