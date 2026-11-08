"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, LoaderCircle, Save, Palette, Type, Image as ImageIcon, Undo2, Redo2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { BrandLogoUploader } from "@/components/brand-logo-uploader";

type Config = {
  announcement:string; hero_eyebrow:string; hero_title:string; hero_highlight:string;
  hero_description:string; hero_primary_cta:string; hero_secondary_cta:string;
  promise_title:string; promise_description:string; quote:string; quote_attribution:string;
  brand_primary:string; brand_dark:string; brand_accent:string; brand_background:string;
  brand_surface:string; brand_text:string; font_family:string;
  social_facebook:string; social_instagram:string; social_tiktok:string; social_x:string; social_youtube:string; social_whatsapp:string; social_linkedin:string; social_threads:string;
};
const defaults:Config = {
 announcement:"Fresh from eCuisinefoods · Good food, better living", hero_eyebrow:"Fresh picks. Better living.",
 hero_title:"Nourish your day.", hero_highlight:"Live a little better.",
 hero_description:"Discover thoughtful food choices from eCuisinefoods. We are bringing wholesome everyday goodness closer to homes in Jos, Bauchi and beyond.",
 hero_primary_cta:"Shop our products", hero_secondary_cta:"Our story",
 promise_title:"Good food is where better living begins.",
 promise_description:"We are building a food brand grounded in quality, nutrition, trust, innovation and natural ingredients. Thank you for being part of our journey.",
 quote:"We believe every family deserves thoughtful food choices and a brand they can trust.", quote_attribution:"The eCuisinefoods vision",
 brand_primary:"#245b42", brand_dark:"#173e2d", brand_accent:"#8a744b", brand_background:"#f7f3e9", brand_surface:"#fbfaf7", brand_text:"#26352b", font_family:"Arial, Helvetica, sans-serif",
 social_facebook:"https://www.facebook.com/share/1Dwqaoq7hd/", social_instagram:"https://www.instagram.com/ecuisine_official", social_tiktok:"https://www.tiktok.com/@ecuisine_official", social_x:"", social_youtube:"", social_whatsapp:"", social_linkedin:"", social_threads:""
};
const fields:[keyof Config,string,string][]=[
 ["announcement","Announcement bar","Text at the very top of the website"],
 ["hero_eyebrow","Hero small heading","Short label above the main heading"],
 ["hero_title","Hero main heading","First line of the homepage headline"],
 ["hero_highlight","Hero highlighted heading","Second, accent-coloured headline line"],
 ["hero_description","Hero description","Main introductory paragraph"],
 ["hero_primary_cta","Primary button label","Text on the shop button"],
 ["hero_secondary_cta","Secondary button label","Text on the story button"],
 ["promise_title","Brand promise heading","Heading in the lower homepage section"],
 ["promise_description","Brand promise write-up","Paragraph explaining your brand promise"],
 ["quote","Featured brand quote","Large quotation on the homepage"],
 ["quote_attribution","Quote attribution","Name or team shown below the quote"]
];
export default function StorefrontEditorPage(){
 const [config,setConfig]=useState<Config>(defaults);
 const [mascotEnabled,setMascotEnabled]=useState(false);
 const [authorized,setAuthorized]=useState(false);
 const [loading,setLoading]=useState(true);
 const [saving,setSaving]=useState(false);
 const [message,setMessage]=useState("");
 const [error,setError]=useState("");
 const [undoStack,setUndoStack]=useState<Config[]>([]);
 const [redoStack,setRedoStack]=useState<Config[]>([]);
 const load=useCallback(async()=>{
  if(!supabase){setError("Database connection is not configured.");setLoading(false);return;}
  const {data:{user}}=await supabase.auth.getUser();
  if(!user){setError("Please sign in through the admin dashboard.");setLoading(false);return;}
  const {data:profile}=await supabase.from("admin_profiles").select("role,is_active").eq("user_id",user.id).maybeSingle();
  if(!profile?.is_active||!["owner","store_manager"].includes(profile.role)){setError("Only the owner or an authorised store manager can edit the storefront.");setLoading(false);return;}
  setAuthorized(true);
  const {data:settings,error:readError}=await supabase.from("site_settings").select("setting_key,setting_value").in("setting_key",["storefront_config","discount_mascot_enabled"]);
  if(readError)setError(readError.message);
  else {
   const savedConfig=settings?.find(item=>item.setting_key==="storefront_config")?.setting_value;
   const savedMascot=settings?.find(item=>item.setting_key==="discount_mascot_enabled")?.setting_value;
   if(savedConfig){try{setConfig({...defaults,...JSON.parse(savedConfig)});}catch{setError("Saved storefront settings could not be read. Defaults are shown.");}}
   setMascotEnabled(savedMascot==="true");
  }
  setLoading(false);
 },[]);
 useEffect(()=>{void load();},[load]);
 const change=(key:keyof Config,value:string)=>setConfig(current=>{
  if(current[key]===value)return current;
  setUndoStack(stack=>[...stack,current].slice(-100));
  setRedoStack([]);
  return {...current,[key]:value};
 });
 const undo=useCallback(()=>{
  setUndoStack(stack=>{
   if(!stack.length)return stack;
   const previous=stack[stack.length-1];
   setConfig(current=>{setRedoStack(items=>[...items,current].slice(-100));return previous;});
   return stack.slice(0,-1);
  });
 },[]);
 const redo=useCallback(()=>{
  setRedoStack(stack=>{
   if(!stack.length)return stack;
   const next=stack[stack.length-1];
   setConfig(current=>{setUndoStack(items=>[...items,current].slice(-100));return next;});
   return stack.slice(0,-1);
  });
 },[]);
 useEffect(()=>{
  const handleKeyDown=(event:KeyboardEvent)=>{
   if(!(event.ctrlKey||event.metaKey)||event.key.toLowerCase()!=="z")return;
   event.preventDefault();
   if(event.shiftKey)redo();else undo();
  };
  const handleRedo=(event:KeyboardEvent)=>{
   if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==="y"){event.preventDefault();redo();}
  };
  window.addEventListener("keydown",handleKeyDown);
  window.addEventListener("keydown",handleRedo);
  return ()=>{window.removeEventListener("keydown",handleKeyDown);window.removeEventListener("keydown",handleRedo);};
 },[undo,redo]);
 const save=async(e:FormEvent<HTMLFormElement>)=>{
  e.preventDefault();if(!supabase||!authorized)return;setSaving(true);setError("");setMessage("");
  const now=new Date().toISOString();
  const [configSave,mascotSave]=await Promise.all([
   supabase.from("site_settings").upsert({setting_key:"storefront_config",setting_value:JSON.stringify(config),updated_at:now},{onConflict:"setting_key"}),
   supabase.from("site_settings").upsert({setting_key:"discount_mascot_enabled",setting_value:String(mascotEnabled),updated_at:now},{onConflict:"setting_key"})
  ]);
  const saveError=configSave.error||mascotSave.error;
  if(saveError)setError(saveError.message);else setMessage("Storefront settings saved. Refresh the live website to see your changes.");
  setSaving(false);
 };
 if(loading)return <main className="admin-glass-shell grid min-h-screen place-items-center bg-[#f5f7f3] text-sm text-[#42694b]"><LoaderCircle className="mr-2 animate-spin"/>Loading storefront editor…</main>;
 if(!authorized)return <main className="min-h-screen bg-[#f5f7f3] p-8"><div className="mx-auto max-w-lg rounded-2xl bg-white p-7"><h1 className="text-xl font-bold">Storefront editor access</h1><p className="mt-3 text-sm text-red-700">{error}</p><Link href="/admin" className="mt-5 inline-flex text-sm font-bold text-[#315b43]">Back to admin</Link></div></main>;
 return <main className="min-h-screen bg-[#f5f7f3] px-4 py-8 text-[#26392c] sm:px-8"><div className="mx-auto max-w-5xl">
  <Link href="/admin" className="inline-flex items-center gap-2 text-xs font-bold text-[#65806a]"><ArrowLeft size={14}/> Admin overview</Link>
  <div className="mt-5"><p className="text-[10px] font-extrabold uppercase tracking-[.2em] text-[#8b9986]">Website content management</p><h1 className="mt-1 text-3xl font-semibold tracking-tight text-[#1c3c29]">Storefront editor</h1><p className="mt-2 text-sm text-[#7d897a]">Edit the visible words and brand colours used on your homepage. Save to update the live storefront.</p></div>
  {error&&<p role="alert" className="mt-5 rounded-xl bg-red-50 p-3 text-xs text-red-700">{error}</p>}
  {message&&<p role="status" className="mt-5 rounded-xl bg-green-50 p-3 text-xs font-semibold text-green-800">{message}</p>}
  <div className="mt-6"><BrandLogoUploader/></div>
  <form onSubmit={save} className="mt-6 space-y-6">
   <section className="rounded-2xl border border-[#e4e9e1] bg-white p-5 shadow-sm sm:p-7"><h2 className="font-bold">Discount mascot visibility</h2><p className="mt-2 text-xs leading-5 text-[#7d897a]">Keep the promotional mascot hidden from shoppers until you switch it on here. Save your changes to publish the setting.</p><label className="mt-4 flex cursor-pointer items-center gap-3 rounded-xl border border-[#e4e9e1] p-4"><input type="checkbox" checked={mascotEnabled} onChange={event=>setMascotEnabled(event.target.checked)} className="h-5 w-5 accent-[#5d3b91]"/><span><span className="block text-sm font-bold text-[#26392c]">Show discount mascot on the storefront</span><span className="mt-1 block text-xs text-[#899487]">{mascotEnabled?"Enabled — shoppers can see and tap the mascot.":"Disabled — mascot stays hidden from shoppers."}</span></span></label></section>
   <section className="rounded-2xl border border-[#e4e9e1] bg-white p-5 shadow-sm sm:p-7"><div className="mb-5 flex items-center gap-2"><Type size={18}/><h2 className="font-bold">Homepage write-ups</h2></div><div className="grid gap-4 sm:grid-cols-2">{fields.map(([key,label,hint])=><label key={key} className={["hero_description","promise_description","quote"].includes(key)?"sm:col-span-2 block text-xs font-bold text-[#405443]":"block text-xs font-bold text-[#405443]"}>{label}<span className="mt-1 block text-[10px] font-normal text-[#899487]">{hint}</span>{["hero_description","promise_description","quote"].includes(key)?<textarea rows={3} value={config[key]} onChange={e=>change(key,e.target.value)} className="mt-2 w-full rounded-xl border border-[#dfe6dc] bg-[#fbfcfa] px-4 py-3 text-sm font-normal outline-none focus:border-[#4c805b]"/>:<input value={config[key]} onChange={e=>change(key,e.target.value)} className="mt-2 w-full rounded-xl border border-[#dfe6dc] bg-[#fbfcfa] px-4 py-3 text-sm font-normal outline-none focus:border-[#4c805b]"/>}</label>)}</div></section>
   <section className="rounded-2xl border border-[#e4e9e1] bg-white p-5 shadow-sm sm:p-7"><h2 className="font-bold">Social media links</h2><p className="mt-2 text-xs text-[#7d897a]">Add your profile or business URLs. Leave any platform blank to hide it from the storefront footer.</p><div className="mt-5 grid gap-4 sm:grid-cols-2">{([["social_facebook","Facebook"],["social_instagram","Instagram"],["social_tiktok","TikTok"],["social_x","X / Twitter"],["social_youtube","YouTube"],["social_whatsapp","WhatsApp Business"],["social_linkedin","LinkedIn"],["social_threads","Threads"]] as [keyof Config,string][]).map(([key,label])=><label key={key} className="block text-xs font-bold text-[#405443]">{label}<input type="url" value={config[key]} onChange={e=>change(key,e.target.value)} placeholder="https://…" className="mt-2 w-full rounded-xl border border-[#dfe6dc] bg-[#fbfcfa] px-4 py-3 text-sm font-normal outline-none focus:border-[#4c805b"/></label>)}</div></section>
   <section className="rounded-2xl border border-[#e4e9e1] bg-white p-5 shadow-sm sm:p-7"><div className="mb-5 flex items-center gap-2"><Palette size={18}/><h2 className="font-bold">Storefront colours</h2></div><p className="mb-5 text-xs text-[#7d897a]">Choose your primary, dark, accent, background, surface and text colours.</p><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{([["brand_primary","Primary buttons and highlights"],["brand_dark","Deep brand colour"],["brand_accent","Gold/accent colour"],["brand_background","Hero background"],["brand_surface","Section background"],["brand_text","Main text colour"]] as [keyof Config,string][]).map(([key,label])=><label key={key} className="flex items-center gap-3 rounded-xl border border-[#edf0e9] p-3 text-xs font-semibold"><input type="color" value={config[key]} onChange={e=>change(key,e.target.value)} className="h-10 w-12 cursor-pointer rounded border-0 bg-transparent"/><span className="flex-1">{label}<small className="mt-1 block font-mono text-[10px] text-[#899487]">{config[key]}</small></span></label>)}</div></section>
   <section className="rounded-2xl border border-[#e4e9e1] bg-white p-5 shadow-sm sm:p-7"><div className="mb-5 flex items-center gap-2"><ImageIcon size={18}/><h2 className="font-bold">Live preview</h2></div><div className="overflow-hidden rounded-2xl p-6" style={{backgroundColor:config.brand_background,color:config.brand_text,fontFamily:config.font_family}}><p className="text-xs font-bold">{config.hero_eyebrow}</p><h3 className="mt-2 text-3xl font-black">{config.hero_title}<br/><span style={{color:config.brand_accent}}>{config.hero_highlight}</span></h3><p className="mt-3 max-w-xl text-sm">{config.hero_description}</p><span className="mt-4 inline-flex rounded-full px-4 py-2 text-xs font-bold text-white" style={{backgroundColor:config.brand_primary}}>{config.hero_primary_cta}</span></div></section>
   <div className="sticky bottom-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#e4e9e1] bg-white/95 p-3 shadow-xl backdrop-blur"><div className="flex flex-wrap gap-2"><button type="button" disabled={!undoStack.length} onClick={undo} title="Undo (Ctrl+Z)" className="inline-flex items-center gap-2 rounded-xl border border-[#dfe6dc] px-3 py-3 text-xs font-bold text-[#536b57] disabled:cursor-not-allowed disabled:opacity-40"><Undo2 size={14}/>Undo</button><button type="button" disabled={!redoStack.length} onClick={redo} title="Redo (Ctrl+Shift+Z or Ctrl+Y)" className="inline-flex items-center gap-2 rounded-xl border border-[#dfe6dc] px-3 py-3 text-xs font-bold text-[#536b57] disabled:cursor-not-allowed disabled:opacity-40"><Redo2 size={14}/>Redo</button><button type="button" onClick={()=>{setUndoStack(stack=>[...stack,config].slice(-100));setRedoStack([]);setConfig(defaults);}} className="rounded-xl border border-[#dfe6dc] px-4 py-3 text-xs font-bold text-[#536b57]">Reset editor defaults</button></div><button disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-[#245b42] px-6 py-3 text-xs font-bold text-white disabled:opacity-60"><Save size={15}/>{saving?"Saving…":"Save storefront changes"}</button></div><p className="text-center text-[10px] text-[#899487]">Undo/redo tracks up to 100 changes in this editing session. Keyboard: Ctrl/⌘+Z to undo, Ctrl/⌘+Shift+Z or Ctrl/⌘+Y to redo.</p>
  </form>
 </div></main>;
}
