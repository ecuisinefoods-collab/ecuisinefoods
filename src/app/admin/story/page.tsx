"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ImagePlus, LoaderCircle, Plus, Save, Trash2, Users } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Member = { name: string; role: string; bio: string; image_url: string };
type StoryConfig = {
  eyebrow:string; title:string; highlight:string; intro:string; hero_image:string;
  origin_title:string; origin_text:string; purpose_title:string; purpose_text:string;
  team_eyebrow:string; team_title:string; team_text:string; members:Member[];
  values:{title:string;text:string}[]; closing_title:string; closing_text:string;
};
const defaults:StoryConfig={
 eyebrow:"A little about us",title:"Good food.",highlight:"Better living.",
 intro:"We believe the everyday choices we make around food deserve care. eCuisinefoods is here to make discovering thoughtful food choices feel simpler, warmer and more inspiring.",hero_image:"",
 origin_title:"A thoughtful approach to everyday food.",
 origin_text:"At eCuisinefoods, our story is shaped by a simple belief: good food should come with care, clarity and a sense of trust. We are building a brand that brings useful food choices and a more considered shopping experience closer to the people we serve.",
 purpose_title:"Rooted in community. Growing with purpose.",
 purpose_text:"With our presence in Jos and Bauchi, we are working to make it easier for customers to discover our products and collect their orders locally. Every step forward is guided by the same promise: keep listening, keep improving and keep putting customers first.",
 team_eyebrow:"The people behind the promise",team_title:"Good people. One shared purpose.",
 team_text:"Behind eCuisinefoods is a team brought together by a shared commitment to thoughtful food, genuine service and doing the little things well. From the care that goes into each decision to the conversations we have with customers, our people help shape the experience we want every customer to remember.",
 members:[],
 values:[
  {title:"Care in every choice",text:"We pay attention to the products we offer and the details customers need to make informed choices."},
  {title:"Trust, always",text:"We value honest information, clear communication and a dependable experience at every step."},
  {title:"Better, together",text:"We keep learning from our customers and growing with the communities we serve."}
 ],
 closing_title:"We're glad you're part of our story.",
 closing_text:"Discover eCuisinefoods and join us as we make everyday food choices feel a little more thoughtful."
};
const textFields:[keyof StoryConfig,string,string][]=[
 ["eyebrow","Hero eyebrow","Small label above the main heading"],["title","Main heading","First line of the hero title"],["highlight","Highlighted heading","Second line in gold"],["intro","Hero introduction","Keep this short: two or three lines works best."],
 ["origin_title","Our story heading","The main heading for the story section"],["origin_text","Our story text","A concise paragraph about the brand"],["purpose_title","Community heading","Short supporting heading"],["purpose_text","Community text","How eCuisinefoods serves its communities"],
 ["team_eyebrow","Team eyebrow","Small label above the team section"],["team_title","Team heading","A short, memorable headline"],["team_text","Team introduction","A warm, concise introduction to your people"],
 ["closing_title","Closing heading","Final call-to-action headline"],["closing_text","Closing text","One short supporting sentence"]
];
export default function AdminStoryPage(){
 const [story,setStory]=useState<StoryConfig>(defaults);
 const [authorized,setAuthorized]=useState(false);
 const [loading,setLoading]=useState(true);
 const [saving,setSaving]=useState(false);
 const [uploading,setUploading]=useState(false);
 const [error,setError]=useState("");
 const [message,setMessage]=useState("");
 const load=useCallback(async()=>{
  if(!supabase){setError("Database connection is not configured.");setLoading(false);return;}
  const {data:{user}}=await supabase.auth.getUser();
  if(!user){setError("Please sign in through the admin dashboard.");setLoading(false);return;}
  const {data:profile}=await supabase.from("admin_profiles").select("role,is_active").eq("user_id",user.id).maybeSingle();
  if(!profile?.is_active||!["owner","store_manager"].includes(profile.role)){setError("Only the owner or an authorised store manager can edit the Our Story page.");setLoading(false);return;}
  setAuthorized(true);
  const {data,error:readError}=await supabase.from("site_settings").select("setting_value").eq("setting_key","about_page_config").maybeSingle();
  if(readError)setError(readError.message);
  else if(data?.setting_value){try{setStory({...defaults,...JSON.parse(data.setting_value)});}catch{setError("The saved story content could not be read. Defaults are shown.");}}
  setLoading(false);
 },[]);
 useEffect(()=>{void load();},[load]);
 const patch=(key:keyof StoryConfig,value:StoryConfig[keyof StoryConfig])=>setStory(current=>({...current,[key]:value}));
 const upload=async(file:File|undefined,memberIndex?:number)=>{
  if(!file||!supabase)return;
  if(!file.type.startsWith("image/")){setError("Choose an image file.");return;}
  if(file.size>5*1024*1024){setError("Images must be 5 MB or smaller.");return;}
  setUploading(true);setError("");setMessage("");
  const path="about/"+(memberIndex===undefined?"hero":("team-"+memberIndex))+"-"+crypto.randomUUID()+"."+((file.name.split(".").pop()||"jpg").toLowerCase());
  const {error:uploadError}=await supabase.storage.from("product-images").upload(path,file,{cacheControl:"31536000",upsert:false,contentType:file.type});
  if(uploadError)setError(uploadError.message);
  else{
   const {data}=supabase.storage.from("product-images").getPublicUrl(path);
   if(memberIndex===undefined)patch("hero_image",data.publicUrl);
   else setStory(current=>({...current,members:current.members.map((member,index)=>index===memberIndex?{...member,image_url:data.publicUrl}:member)}));
   setMessage("Image uploaded. Save the page to publish it.");
  }
  setUploading(false);
 };
 const save=async(event:FormEvent<HTMLFormElement>)=>{
  event.preventDefault();if(!supabase||!authorized)return;
  setSaving(true);setError("");setMessage("");
  const {error:saveError}=await supabase.from("site_settings").upsert({setting_key:"about_page_config",setting_value:JSON.stringify(story),updated_at:new Date().toISOString()},{onConflict:"setting_key"});
  if(saveError)setError(saveError.message);else setMessage("Our Story content saved. The public page will show your updates.");
  setSaving(false);
 };
 const updateMember=(index:number,changes:Partial<Member>)=>setStory(current=>({...current,members:current.members.map((member,i)=>i===index?{...member,...changes}:member)}));
 const updateValue=(index:number,changes:Partial<{title:string;text:string}>)=>setStory(current=>({...current,values:current.values.map((value,i)=>i===index?{...value,...changes}:value)}));
 if(loading)return <main className="grid min-h-screen place-items-center bg-[#f5f7f3] text-sm text-[#42694b]"><LoaderCircle className="mr-2 animate-spin"/>Loading Our Story editor…</main>;
 if(!authorized)return <main className="min-h-screen bg-[#f5f7f3] p-8"><div className="mx-auto max-w-lg rounded-2xl bg-white p-7"><h1 className="text-xl font-bold">Our Story editor access</h1><p className="mt-3 text-sm text-red-700">{error}</p><Link href="/admin" className="mt-5 inline-flex text-sm font-bold text-[#315b43]">Back to admin</Link></div></main>;
 return <main className="min-h-screen bg-[#f5f7f3] px-4 py-8 text-[#26392c] sm:px-8"><div className="mx-auto max-w-5xl">
  <Link href="/admin" className="inline-flex items-center gap-2 text-xs font-bold text-[#65806a]"><ArrowLeft size={14}/> Admin overview</Link>
  <div className="mt-5 flex flex-wrap items-end justify-between gap-4"><div><p className="text-[10px] font-extrabold uppercase tracking-[.2em] text-[#8b9986]">Website content management</p><h1 className="mt-1 text-3xl font-semibold tracking-tight text-[#1c3c29]">Our Story editor</h1><p className="mt-2 max-w-2xl text-sm text-[#7d897a]">Update the story, imagery, values and team profiles shown on your public Our Story page. Keep copy short and let the design do the talking.</p></div><Link href="/about" target="_blank" className="rounded-xl border border-[#d7e2d3] bg-white px-4 py-3 text-xs font-bold text-[#315b43]">Preview public page ↗</Link></div>
  {error&&<p role="alert" className="mt-5 rounded-xl bg-red-50 p-3 text-xs text-red-700">{error}</p>}{message&&<p role="status" className="mt-5 rounded-xl bg-[#eaf3e8] p-3 text-xs font-semibold text-[#386344]">{message}</p>}
  <form onSubmit={save} className="mt-6 space-y-6">
   <section className="rounded-2xl border border-[#e4e9e1] bg-white p-5 shadow-sm sm:p-7"><h2 className="font-bold">Hero and opening story</h2><div className="mt-5 grid gap-4 sm:grid-cols-2">{textFields.slice(0,4).map(([key,label,hint])=><label key={key} className={key==="intro"?"sm:col-span-2 block text-xs font-bold text-[#405443]":"block text-xs font-bold text-[#405443]"}>{label}<span className="mt-1 block text-[10px] font-normal text-[#899487]">{hint}</span>{key==="intro"?<textarea rows={3} value={String(story[key])} onChange={e=>patch(key,e.target.value)} className="mt-2 w-full rounded-xl border border-[#dfe6dc] bg-[#fbfcfa] px-4 py-3 text-sm font-normal"/>:<input value={String(story[key])} onChange={e=>patch(key,e.target.value)} className="mt-2 w-full rounded-xl border border-[#dfe6dc] bg-[#fbfcfa] px-4 py-3 text-sm font-normal"/>}</label>)}</div>
    <div className="mt-5"><p className="text-xs font-bold text-[#405443]">Hero image</p><p className="mt-1 text-[10px] text-[#899487]">A bright, high-quality food, ingredients or brand photograph works best. Maximum 5 MB.</p><label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-[#b9cbb6] bg-[#f7faf5] px-4 py-4 text-xs font-bold text-[#42664a]"><ImagePlus size={16}/>{uploading?"Uploading image…":"Upload hero image"}<input type="file" accept="image/*" disabled={uploading} onChange={e=>void upload(e.target.files?.[0])} className="sr-only"/></label>{story.hero_image&&<div className="mt-3 flex items-center gap-3"><img src={story.hero_image} alt="Hero preview" className="h-24 w-32 rounded-xl object-cover"/><button type="button" onClick={()=>patch("hero_image","")} className="text-xs font-bold text-red-600">Remove image</button></div>}</div>
   </section>
   <section className="rounded-2xl border border-[#e4e9e1] bg-white p-5 shadow-sm sm:p-7"><h2 className="font-bold">Our story and community</h2><div className="mt-5 grid gap-4 sm:grid-cols-2">{textFields.slice(4,8).map(([key,label,hint])=><label key={key} className="block text-xs font-bold text-[#405443]">{label}<span className="mt-1 block text-[10px] font-normal text-[#899487]">{hint}</span>{key.endsWith("_text")?<textarea rows={4} value={String(story[key])} onChange={e=>patch(key,e.target.value)} className="mt-2 w-full rounded-xl border border-[#dfe6dc] bg-[#fbfcfa] px-4 py-3 text-sm font-normal"/>:<input value={String(story[key])} onChange={e=>patch(key,e.target.value)} className="mt-2 w-full rounded-xl border border-[#dfe6dc] bg-[#fbfcfa] px-4 py-3 text-sm font-normal"/>}</label>)}</div></section>
   <section className="rounded-2xl border border-[#e4e9e1] bg-white p-5 shadow-sm sm:p-7"><h2 className="font-bold">Our values</h2><p className="mt-1 text-xs text-[#899487]">Three short value cards appear on the public page.</p><div className="mt-5 grid gap-4 md:grid-cols-3">{story.values.map((value,index)=><div key={index} className="rounded-xl border border-[#edf0e9] p-4"><label className="block text-xs font-bold">Value {index+1} title<input value={value.title} onChange={e=>updateValue(index,{title:e.target.value})} className="mt-2 w-full rounded-lg border px-3 py-2 text-sm font-normal"/></label><label className="mt-3 block text-xs font-bold">Short description<textarea rows={4} value={value.text} onChange={e=>updateValue(index,{text:e.target.value})} className="mt-2 w-full rounded-lg border px-3 py-2 text-sm font-normal"/></label></div>)}</div></section>
   <section className="rounded-2xl border border-[#e4e9e1] bg-white p-5 shadow-sm sm:p-7"><div className="flex items-center gap-2"><Users size={18}/><h2 className="font-bold">Meet our team</h2></div><div className="mt-5 grid gap-4 sm:grid-cols-2">{textFields.slice(8,11).map(([key,label,hint])=><label key={key} className={key==="team_text"?"sm:col-span-2 block text-xs font-bold text-[#405443]":"block text-xs font-bold text-[#405443]"}>{label}<span className="mt-1 block text-[10px] font-normal text-[#899487]">{hint}</span>{key==="team_text"?<textarea rows={3} value={String(story[key])} onChange={e=>patch(key,e.target.value)} className="mt-2 w-full rounded-xl border border-[#dfe6dc] bg-[#fbfcfa] px-4 py-3 text-sm font-normal"/>:<input value={String(story[key])} onChange={e=>patch(key,e.target.value)} className="mt-2 w-full rounded-xl border border-[#dfe6dc] bg-[#fbfcfa] px-4 py-3 text-sm font-normal"/>}</label>)}</div>
    <div className="mt-6 flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-sm font-bold">Team profiles ({story.members.length})</h3><p className="mt-1 text-xs text-[#899487]">Add only real team members and approved photos. Their details appear on the public page.</p></div><button type="button" onClick={()=>patch("members",[...story.members,{name:"",role:"",bio:"",image_url:""}])} className="inline-flex items-center gap-2 rounded-xl bg-[#eaf2e7] px-4 py-3 text-xs font-bold text-[#286043]"><Plus size={15}/> Add team member</button></div>
    <div className="mt-4 space-y-4">{story.members.map((member,index)=><div key={index} className="rounded-2xl border border-[#e5ebe2] bg-[#fbfcfa] p-4"><div className="flex items-center justify-between"><p className="text-xs font-bold text-[#526352]">Team member {index+1}</p><button type="button" onClick={()=>patch("members",story.members.filter((_,i)=>i!==index))} className="inline-flex items-center gap-1 text-xs font-bold text-red-600"><Trash2 size={13}/> Remove</button></div><div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-xs font-bold">Full name<input value={member.name} onChange={e=>updateMember(index,{name:e.target.value})} placeholder="Enter the team member's name" className="mt-2 w-full rounded-lg border bg-white px-3 py-2.5 text-sm font-normal"/></label><label className="text-xs font-bold">Role / position<input value={member.role} onChange={e=>updateMember(index,{role:e.target.value})} placeholder="e.g. Customer Experience" className="mt-2 w-full rounded-lg border bg-white px-3 py-2.5 text-sm font-normal"/></label><label className="text-xs font-bold sm:col-span-2">Short bio<textarea rows={2} value={member.bio} onChange={e=>updateMember(index,{bio:e.target.value})} placeholder="A short, approved introduction (optional)" className="mt-2 w-full rounded-lg border bg-white px-3 py-2.5 text-sm font-normal"/></label></div><div className="mt-3 flex flex-wrap items-center gap-3"><label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#dce5d8] bg-white px-3 py-2 text-xs font-bold text-[#42664a]"><ImagePlus size={14}/>{uploading?"Uploading…":"Upload portrait"}<input type="file" accept="image/*" disabled={uploading} onChange={e=>void upload(e.target.files?.[0],index)} className="sr-only"/></label>{member.image_url&&<><img src={member.image_url} alt="Team portrait preview" className="h-12 w-12 rounded-lg object-cover"/><button type="button" onClick={()=>updateMember(index,{image_url:""})} className="text-xs font-bold text-red-600">Remove photo</button></>}</div></div>)}</div>
   </section>
   <section className="rounded-2xl border border-[#e4e9e1] bg-white p-5 shadow-sm sm:p-7"><h2 className="font-bold">Closing message</h2><div className="mt-5 grid gap-4 sm:grid-cols-2">{textFields.slice(11).map(([key,label,hint])=><label key={key} className="block text-xs font-bold text-[#405443]">{label}<span className="mt-1 block text-[10px] font-normal text-[#899487]">{hint}</span>{key==="closing_text"?<textarea rows={3} value={String(story[key])} onChange={e=>patch(key,e.target.value)} className="mt-2 w-full rounded-xl border border-[#dfe6dc] bg-[#fbfcfa] px-4 py-3 text-sm font-normal"/>:<input value={String(story[key])} onChange={e=>patch(key,e.target.value)} className="mt-2 w-full rounded-xl border border-[#dfe6dc] bg-[#fbfcfa] px-4 py-3 text-sm font-normal"/>}</label>)}</div></section>
   <div className="sticky bottom-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#e4e9e1] bg-white/95 p-3 shadow-xl backdrop-blur"><p className="px-2 text-[11px] text-[#899487]">Changes appear on the public page after saving.</p><button disabled={saving||uploading} className="inline-flex items-center gap-2 rounded-xl bg-[#245b42] px-6 py-3 text-xs font-bold text-white disabled:opacity-60"><Save size={15}/>{saving?"Saving…":"Save Our Story page"}</button></div>
  </form>
 </div></main>;
}
