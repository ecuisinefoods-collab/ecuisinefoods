"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

const REFERRAL_CODE_KEY="ecuisine_program_referral";
const REFERRAL_AT_KEY="ecuisine_program_referral_at";
const REFERRAL_TOKEN_KEY="ecuisine_program_referral_token";

export function ReferralTracker(){
  useEffect(()=>{
    const params=new URLSearchParams(window.location.search);
    const code=(params.get("ref")||"").trim().toUpperCase();
    if(!code || !/^[A-Z0-9-]{4,40}$/.test(code)) return;

    const attributionToken = `${crypto.randomUUID()}${crypto.randomUUID()}`;
    try{
      const existingCode=window.localStorage.getItem(REFERRAL_CODE_KEY);
      const existingAt=Number(window.localStorage.getItem(REFERRAL_AT_KEY)||0);
      const existingToken=window.localStorage.getItem(REFERRAL_TOKEN_KEY);
      if(existingCode&&existingAt&&existingToken&&Date.now()-existingAt<30*24*60*60*1000)return;
      window.localStorage.setItem(REFERRAL_CODE_KEY,code);
      window.localStorage.setItem(REFERRAL_AT_KEY,String(Date.now()));
      window.localStorage.setItem(REFERRAL_TOKEN_KEY,attributionToken);
    }catch{
      return;
    }

    if(supabase){
      void supabase.rpc("record_affiliate_program_referral_click",{
        p_referral_code:code,
        p_landing_path:window.location.pathname,
        p_attribution_token:attributionToken
      }).then(({error})=>{
        if(error){
          try{
            if(window.localStorage.getItem(REFERRAL_TOKEN_KEY)===attributionToken){
              window.localStorage.removeItem(REFERRAL_CODE_KEY);
              window.localStorage.removeItem(REFERRAL_AT_KEY);
              window.localStorage.removeItem(REFERRAL_TOKEN_KEY);
            }
          }catch{/* Storage may be unavailable. */}
          console.warn("Affiliate referral could not be recorded.");
        }
      });
    }
  },[]);
  return null;
}
