"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export function BrandLogoUploader() {
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  const [error,setError]=useState("");
  async function upload(file?:File) {
    if(!supabase||!file)return;
    if(!["image/jpeg","image/png","image/webp"].includes(file.type)||file.size>5*1024*1024){setError("Choose a JPG, PNG or WebP logo under 5 MB.");return;}
    setBusy(true);setError("");setMessage("");
    const ext=file.name.split(".").pop()?.toLowerCase()||"jpg";
    const path="branding/ecuisinefoods-logo-"+Date.now()+"."+ext;
    const {error:uploadError}=await supabase.storage.from("product-images").upload(path,file,{upsert:true,contentType:file.type,cacheControl:"3600"});
    if(uploadError){setError(uploadError.message);setBusy(false);return;}
    const {data}=supabase.storage.from("product-images").getPublicUrl(path);
    const {error:saveError}=await supabase.from("site_settings").upsert({setting_key:"store_logo_url",setting_value:data.publicUrl,updated_at:new Date().toISOString()},{onConflict:"setting_key"});
    if(saveError)setError(saveError.message);else setMessage("Your original logo is saved. Refresh the storefront to see it.");
    setBusy(false);
  }
  return <section className="mb-6 rounded-2xl border border-[#e5ebe2] bg-white p-5 shadow-sm"><h2 className="text-sm font-bold text-[#304735]">Storefront brand logo</h2><p className="mt-1 text-xs text-[#7d897a]">Upload your official eCuisinefoods logo. It will replace the text logo in the storefront header.</p><label className="mt-4 inline-flex cursor-pointer items-center rounded-xl bg-[#245b42] px-4 py-3 text-xs font-bold text-white">{busy?"Uploading logo…":"Choose original logo image"}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={e=>void upload(e.target.files?.[0])} className="sr-only"/></label>{message&&<p role="status" className="mt-3 text-xs font-semibold text-green-700">{message}</p>}{error&&<p role="alert" className="mt-3 text-xs text-red-700">{error}</p>}</section>;
}
