"use client";

import Link from "next/link";
import { useEffect,useState } from "react";
import { ArrowRight,Heart,Leaf,ShieldCheck,Sparkles,Sprout,Users,Quote } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { supabase } from "@/lib/supabase";

type Member={name:string;role:string;bio:string;image_url:string};
type Story={
 eyebrow:string;title:string;highlight:string;intro:string;hero_image:string;
 origin_title:string;origin_text:string;purpose_title:string;purpose_text:string;
 ceo_eyebrow:string;ceo_heading:string;ceo_name:string;ceo_role:string;ceo_image:string;ceo_message:string;
 team_eyebrow:string;team_title:string;team_text:string;members:Member[];
 values:{title:string;text:string}[];closing_title:string;closing_text:string
};
const defaults:Story={
 eyebrow:"A little about us",title:"Good food.",highlight:"Better living.",
 intro:"We believe the everyday choices we make around food deserve care. eCuisinefoods is here to make discovering thoughtful food choices feel simpler, warmer and more inspiring.",
 hero_image:"",
 origin_title:"A thoughtful approach to everyday food.",
 origin_text:"At eCuisinefoods, our story is shaped by a simple belief: good food should come with care, clarity and a sense of trust. We are building a brand that brings useful food choices and a more considered shopping experience closer to the people we serve.",
 purpose_title:"Rooted in community. Growing with purpose.",
 purpose_text:"With our presence in Jos and Bauchi, we are working to make it easier for customers to discover our products and collect their orders locally. Every step forward is guided by the same promise: keep listening, keep improving and keep putting customers first.",
 ceo_eyebrow:"A personal note",ceo_heading:"A message from our CEO",ceo_name:"",ceo_role:"Chief Executive Officer · eCuisinefoods",ceo_image:"",
 ceo_message:"To every customer, family and friend of eCuisinefoods,\n\nThank you for giving us a place in your everyday lives. We believe thoughtful food choices should be easier to discover, easier to understand and more convenient to enjoy. That belief guides the way we are building eCuisinefoods.\n\nOur promise is simple: to keep listening, to communicate honestly and to serve with care. We know trust is earned through the details — the information we share, the way we handle each order and the attention we give when someone needs help.\n\nWe are building this brand one thoughtful decision and one customer relationship at a time. Your trust is something we never take for granted.\n\nThank you for being part of our journey. We look forward to growing with you.\n\nWith gratitude,",
 team_eyebrow:"The people behind the promise",team_title:"Good people. One shared purpose.",
 team_text:"Behind eCuisinefoods is a team brought together by a shared commitment to thoughtful food, genuine service and doing the little things well. From the care that goes into each decision to the conversations we have with customers, our people help shape the experience we want every customer to remember.",
 members:[],
 values:[{title:"Care in every choice",text:"We pay attention to the products we offer and the details customers need to make informed choices."},{title:"Trust, always",text:"We value honest information, clear communication and a dependable experience at every step."},{title:"Better, together",text:"We keep learning from our customers and growing with the communities we serve."}],
 closing_title:"We're glad you're part of our story.",closing_text:"Discover eCuisinefoods and join us as we make everyday food choices feel a little more thoughtful."
};

export default function AboutPage(){
 const [story,setStory]=useState<Story>(defaults);
 useEffect(()=>{let active=true;if(!supabase)return;supabase.from("site_settings").select("setting_value").eq("setting_key","about_page_config").maybeSingle().then(({data})=>{if(active&&data?.setting_value){try{setStory({...defaults,...JSON.parse(data.setting_value)});}catch{/* keep the designed defaults */}}});return()=>{active=false;};},[]);
 const paragraphs=story.ceo_message.split(/\n\s*\n/).map(p=>p.trim()).filter(Boolean);
 return <main className="min-h-screen overflow-hidden bg-[#fbfaf6] text-[#1c3528]">
  <div className="bg-[#174d35] px-4 py-2.5 text-center text-xs font-bold tracking-[.16em] text-white">GOOD FOOD · BETTER LIVING</div><SiteHeader/>
  <section className="relative isolate overflow-hidden bg-[#f2f5ec]">
   <div className="pointer-events-none absolute -right-36 -top-32 h-[34rem] w-[34rem] rounded-full bg-[#f1d77b]/30 blur-3xl"/><div className="pointer-events-none absolute -bottom-48 -left-28 h-[34rem] w-[34rem] rounded-full bg-[#c8dfc2]/55 blur-3xl"/>
   <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 py-16 sm:py-24 lg:grid-cols-[1fr_.95fr] lg:gap-16 lg:py-28">
    <div className="max-w-2xl">
     <p className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[.22em] text-[#9a741c]"><Sparkles size={16}/>{story.eyebrow}</p>
     <h1 className="mt-6 text-6xl font-black leading-[.98] tracking-[-.065em] text-[#173d2b] sm:text-7xl lg:text-[5.7rem]">{story.title}<br/><span className="text-[#c08e20]">{story.highlight}</span></h1>
     <p className="mt-8 max-w-xl text-lg leading-9 text-[#617166] sm:text-xl sm:leading-9">{story.intro}</p>
     <div className="mt-9 flex flex-wrap gap-3"><Link href="/shop" className="inline-flex items-center gap-3 rounded-full bg-[#176044] px-7 py-4 text-base font-bold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-[#10482f]">Explore our shop <ArrowRight size={18}/></Link><Link href="/contact" className="rounded-full border border-[#cbd8c8] bg-white/80 px-7 py-4 text-base font-bold text-[#315a40]">Talk to us</Link></div>
     <div className="mt-12 flex items-center gap-4 border-t border-[#dce5d7] pt-6"><span className="grid h-12 w-12 place-items-center rounded-full bg-[#fff0bd] text-[#a87914]"><Heart size={21}/></span><div><p className="text-base font-extrabold text-[#294b35]">Made with care. Shared with purpose.</p><p className="mt-1 text-sm text-[#7c8b7e]">The heart of eCuisinefoods</p></div></div>
    </div>
    <div className="relative mx-auto w-full max-w-[560px]"><div className="absolute -inset-4 rotate-[-3deg] rounded-[2.8rem] bg-[#e6c65f]/70"/><div className="relative aspect-[4/4.3] overflow-hidden rounded-[2.4rem] border-[7px] border-white bg-[radial-gradient(circle_at_25%_20%,#f9e8a8,transparent_35%),linear-gradient(145deg,#dcebd7,#9fbea0_55%,#315f43)] shadow-[0_30px_80px_-35px_rgba(30,66,43,.45)]">
      {story.hero_image?<img src={story.hero_image} alt="eCuisinefoods story" className="absolute inset-0 h-full w-full object-cover"/>:<div className="absolute inset-0 p-7 sm:p-10"><div className="absolute -right-12 top-10 h-64 w-64 rounded-full border-[30px] border-white/25"/><div className="absolute -bottom-16 -left-12 h-72 w-72 rounded-full bg-[#f2d46f]/90"/><div className="absolute left-[17%] top-[17%] h-44 w-44 rounded-full bg-[#f8f2df]/90 shadow-2xl"/><div className="absolute left-[26%] top-[26%] grid h-28 w-28 place-items-center rounded-full bg-[#1d6847] text-[#ffe8a0] shadow-xl"><Sprout size={56}/></div><div className="absolute bottom-8 right-8 max-w-[220px] rounded-3xl border border-white/50 bg-white/85 p-5 shadow-xl backdrop-blur-sm"><p className="text-xs font-black uppercase tracking-[.16em] text-[#a57a1b]">Our philosophy</p><p className="mt-2 text-2xl font-black leading-tight text-[#1d452f]">A better kind of everyday.</p></div></div>}
      <div className="absolute left-5 top-5 rounded-full border border-white/50 bg-white/90 px-4 py-2 text-xs font-extrabold uppercase tracking-[.16em] text-[#28543a]">eCuisinefoods · Good food, better living</div>
     </div><div className="absolute -bottom-7 -left-5 grid h-20 w-20 place-items-center rounded-[1.7rem] bg-[#174d35] text-[#f5d775] shadow-xl sm:-left-8 sm:h-24 sm:w-24"><Leaf size={36}/></div>
    </div>
   </div>
  </section>

  <section className="mx-auto grid max-w-7xl gap-10 px-5 py-20 sm:py-28 lg:grid-cols-[.72fr_1.28fr] lg:gap-24">
   <div><p className="text-xs font-black uppercase tracking-[.2em] text-[#a77c1d]">Our story</p><h2 className="mt-4 max-w-sm text-4xl font-black leading-[1.06] tracking-[-.045em] text-[#183d2b] sm:text-5xl">{story.origin_title}</h2><div className="mt-7 h-1 w-16 rounded-full bg-[#d5b44d]"/></div>
   <div className="flex flex-col justify-center"><p className="max-w-3xl text-lg leading-9 text-[#5d6f62] sm:text-xl sm:leading-10">{story.origin_text}</p><div className="mt-12 grid gap-8 border-t border-[#e4e8df] pt-8 sm:grid-cols-2"><div><p className="text-xs font-black uppercase tracking-[.2em] text-[#a77c1d]">Our roots</p><h3 className="mt-3 text-2xl font-black leading-snug text-[#214b34]">{story.purpose_title}</h3></div><p className="text-base leading-8 text-[#718074]">{story.purpose_text}</p></div></div>
  </section>

  <section className="relative overflow-hidden bg-[#173f2c] py-20 text-white sm:py-28">
   <div className="pointer-events-none absolute -right-24 top-0 h-96 w-96 rounded-full border-[55px] border-white/[.04]"/><div className="pointer-events-none absolute -bottom-40 -left-24 h-96 w-96 rounded-full bg-[#d8bd59]/10 blur-2xl"/>
   <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 lg:grid-cols-[.78fr_1.22fr] lg:gap-20">
    <div className="relative mx-auto w-full max-w-[430px]">
     <div className="absolute -inset-3 rotate-[3deg] rounded-[2.4rem] bg-[#d8bd59]"/>
     <div className="relative aspect-[4/5] overflow-hidden rounded-[2.1rem] border-[7px] border-white/90 bg-[linear-gradient(145deg,#dbe9d2,#6e9a70_55%,#214c35)] shadow-2xl">
      {story.ceo_image?<img src={story.ceo_image} alt={story.ceo_name||"eCuisinefoods CEO"} className="absolute inset-0 h-full w-full object-cover object-center"/>:<div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-[#f7e6a5]"><span className="grid h-28 w-28 place-items-center rounded-full border border-white/40 bg-white/10"><Users size={52}/></span><p className="text-sm font-bold tracking-wide">CEO portrait</p><p className="text-xs text-white/70">Add the photo in your admin editor</p></div>}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#102d1e]/90 via-[#102d1e]/30 to-transparent p-7 pt-20"><p className="text-lg font-black">{story.ceo_name||"eCuisinefoods CEO"}</p><p className="mt-1 text-sm font-semibold text-[#f4d778]">{story.ceo_role}</p></div>
     </div>
     {story.members.filter(member=>member.name.trim()).length>0&&<div className="relative mt-7 flex flex-wrap gap-3">{story.members.filter(member=>member.name.trim()).map((member,index)=><div key={member.name+index} className="flex min-w-[145px] items-center gap-3 rounded-2xl border border-white/15 bg-white/10 p-2.5 backdrop-blur-sm">{member.image_url?<img src={member.image_url} alt={member.name} className="h-14 w-14 shrink-0 rounded-full border-2 border-[#e8cf77] object-cover"/>:<span className="grid h-14 w-14 shrink-0 place-items-center rounded-full border-2 border-[#e8cf77] bg-white/10 text-[#f4d778]"><Users size={23}/></span>}<div className="min-w-0"><p className="truncate text-xs font-extrabold text-white">{member.name}</p>{member.role&&<p className="mt-1 line-clamp-2 text-[10px] font-semibold text-white/65">{member.role}</p>}</div></div>)}</div>}
    </div>
    <div className="max-w-3xl">
     <p className="text-xs font-black uppercase tracking-[.22em] text-[#e8cf77]">{story.ceo_eyebrow}</p>
     <h2 className="mt-4 text-4xl font-black leading-tight tracking-[-.045em] sm:text-5xl lg:text-6xl">{story.ceo_heading}</h2>
     <div className="mt-8 flex items-start gap-4"><Quote size={40} className="mt-1 shrink-0 text-[#e8cf77]"/><div className="space-y-5">{paragraphs.map((paragraph,index)=><p key={index} className="text-lg leading-9 text-white/85 sm:text-xl sm:leading-9">{paragraph}</p>)}</div></div>
     <div className="mt-9 border-t border-white/15 pt-6"><p className="text-xl font-black">{story.ceo_name||"Chief Executive Officer"}</p><p className="mt-1 text-sm font-semibold text-[#e8cf77]">{story.ceo_role}</p></div>
    </div>
   </div>
  </section>

  <section className="bg-[#f0f4eb] py-20 sm:py-24"><div className="mx-auto max-w-7xl px-5">
   <div className="grid gap-6 sm:grid-cols-[.8fr_1.2fr] sm:items-end"><div><p className="text-xs font-black uppercase tracking-[.2em] text-[#a77c1d]">What matters to us</p><h2 className="mt-3 text-4xl font-black tracking-[-.045em] text-[#183d2b] sm:text-5xl">A few things we'll never compromise.</h2></div><p className="max-w-lg text-base leading-8 text-[#718074] sm:justify-self-end">The values that shape the way we choose, serve and grow.</p></div>
   <div className="mt-12 grid gap-4 md:grid-cols-3">{story.values.map((v,i)=><article key={v.title} className="rounded-[1.8rem] border border-[#e0e8dc] bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-xl sm:p-8"><div className="flex items-center justify-between"><span className="grid h-14 w-14 place-items-center rounded-2xl bg-[#eaf2e7] text-[#286043]">{i===0?<Leaf size={24}/>:i===1?<ShieldCheck size={24}/>:<Sprout size={24}/>}</span><span className="text-sm font-black tracking-[.16em] text-[#c5a54a]">0{i+1}</span></div><h3 className="mt-8 text-2xl font-black text-[#1c432e]">{v.title}</h3><p className="mt-3 text-base leading-8 text-[#788579]">{v.text}</p></article>)}</div>
  </div></section>

  <section className="mx-auto max-w-7xl px-5 py-20 sm:py-28"><div className="grid gap-10 lg:grid-cols-[.82fr_1.18fr] lg:items-center">
   <div className="relative min-h-[310px] overflow-hidden rounded-[2rem] bg-[#194d35] p-8 text-white sm:min-h-[390px] sm:p-11"><div className="absolute -right-14 -top-16 h-64 w-64 rounded-full border-[36px] border-white/10"/><div className="absolute -bottom-20 -left-10 h-64 w-64 rounded-full bg-[#d8bd59]/90"/><div className="relative z-10 flex h-full flex-col justify-between"><span className="grid h-16 w-16 place-items-center rounded-2xl bg-white/10 text-[#f4d775]"><Users size={30}/></span><div className="mt-16"><p className="text-xs font-black uppercase tracking-[.2em] text-[#f3d778]">People make the difference</p><p className="mt-3 max-w-xs text-3xl font-black leading-tight">Good work starts with good people.</p></div></div></div>
   <div><p className="text-xs font-black uppercase tracking-[.2em] text-[#a77c1d]">{story.team_eyebrow}</p><h2 className="mt-4 max-w-xl text-4xl font-black leading-[1.06] tracking-[-.045em] text-[#183d2b] sm:text-5xl">{story.team_title}</h2><p className="mt-6 max-w-2xl text-lg leading-9 text-[#66766a]">{story.team_text}</p>
    {story.members.length>0&&<div className="mt-9 grid gap-4 sm:grid-cols-2">{story.members.map((m,i)=><article key={m.name+i} className="flex items-start gap-4 rounded-2xl border border-[#e6eae2] bg-white p-5">{m.image_url?<img src={m.image_url} alt={m.name} className="h-20 w-20 shrink-0 rounded-xl object-cover"/>:<span className="grid h-20 w-20 shrink-0 place-items-center rounded-xl bg-[#eaf2e7] text-[#286043]"><Users size={25}/></span>}<div className="min-w-0"><h3 className="text-lg font-extrabold text-[#234b34]">{m.name}</h3><p className="mt-1 text-sm font-bold text-[#a77c1d]">{m.role}</p>{m.bio&&<p className="mt-2 text-sm leading-6 text-[#7b877d]">{m.bio}</p>}</div></article>)}</div>}
   </div>
  </div></section>

  <section className="px-5 pb-20 sm:pb-28"><div className="mx-auto max-w-7xl rounded-[2.2rem] bg-[#173f2c] px-7 py-14 text-center text-white sm:px-14 sm:py-20"><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-white/10 text-[#f2d16c]"><Heart size={26}/></span><p className="mt-6 text-xs font-black uppercase tracking-[.22em] text-[#f2d16c]">Growing with you</p><h2 className="mx-auto mt-4 max-w-2xl text-4xl font-black tracking-[-.045em] sm:text-5xl">{story.closing_title}</h2><p className="mx-auto mt-5 max-w-xl text-lg leading-8 text-white/75">{story.closing_text}</p><Link href="/shop" className="mt-8 inline-flex items-center gap-3 rounded-full bg-[#f1d16a] px-7 py-4 text-base font-black text-[#183d2b] hover:bg-[#ffe08a]">Discover eCuisinefoods <ArrowRight size={18}/></Link></div></section>
 </main>;
}
