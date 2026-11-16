"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Bot, Headphones, MessageCircle, Send, X, ArrowUpRight, LoaderCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";

type ChatMessage={role:"user"|"assistant";content:string};
const greeting:ChatMessage={role:"assistant",content:"Hello! I’m the eCuisinefoods assistant. Ask me about our products, pack sizes, pickup points, ordering or payment options. When a question needs a person to check it, I’ll help connect you with our team."};

export function AssistantWidget(){
 const [open,setOpen]=useState(false);
 const [conversationId,setConversationId]=useState("");
 const [messages,setMessages]=useState<ChatMessage[]>([greeting]);
 const [draft,setDraft]=useState("");
 const [busy,setBusy]=useState(false);
 const [needsHuman,setNeedsHuman]=useState(false);
 const [handoffReason,setHandoffReason]=useState("");
 const [contactOpen,setContactOpen]=useState(false);
 const [visitorName,setVisitorName]=useState("");
 const [visitorPhone,setVisitorPhone]=useState("");
 const [visitorEmail,setVisitorEmail]=useState("");
 const [handoffBusy,setHandoffBusy]=useState(false);
 const [handoffSaved,setHandoffSaved]=useState(false);
 const [whatsappUrl,setWhatsappUrl]=useState("");
 const bottomRef=useRef<HTMLDivElement>(null);

 useEffect(()=>{if(!conversationId&&typeof crypto!=="undefined")setConversationId(crypto.randomUUID());},[conversationId]);
 useEffect(()=>{bottomRef.current?.scrollIntoView({behavior:"smooth",block:"end"});},[messages,busy,needsHuman,contactOpen]);

 const sendMessage=async(event:FormEvent<HTMLFormElement>)=>{
  event.preventDefault();
  const message=draft.trim();
  if(!message||busy)return;
  if(!supabase){
   setMessages(current=>[...current,{role:"user",content:message},{role:"assistant",content:"Our chat service is not connected right now. Please contact our team on WhatsApp at +234 808 094 2328."}]);
   setDraft("");setNeedsHuman(true);return;
  }
  if(!conversationId){setMessages(current=>[...current,{role:"assistant",content:"The chat is starting. Please send your question again in a moment."}]);return;}
  const prior=messages.filter((item,index)=>!(index===0&&item===greeting)).slice(-8);
  setMessages(current=>[...current,{role:"user",content:message}]);
  setDraft("");setBusy(true);
  try{
   const {data,error}=await supabase.functions.invoke("ecuisine-assistant",{body:{action:"chat",conversation_id:conversationId,message,history:prior}});
   if(error)throw error;
   const reply=typeof data?.reply==="string"?data.reply:"I couldn't complete that response just now. Our team can help on WhatsApp.";
   setMessages(current=>[...current,{role:"assistant",content:reply}]);
   if(data?.needs_human){setNeedsHuman(true);setHandoffReason(typeof data.handoff_reason==="string"?data.handoff_reason:"Our team can check this for you.");}
  }catch{
   setMessages(current=>[...current,{role:"assistant",content:"I’m having trouble connecting right now. You can still reach our team directly on WhatsApp at +234 808 094 2328."}]);
   setNeedsHuman(true);setHandoffReason("The assistant service could not be reached.");
  }finally{setBusy(false);}
 };

 const saveHandoff=async(channel:"admin_inbox"|"whatsapp")=>{
  if(!supabase||!conversationId){setContactOpen(true);return;}
  setHandoffBusy(true);setWhatsappUrl("");
  try{
   const {data,error}=await supabase.functions.invoke("ecuisine-assistant",{body:{
    action:"handoff",conversation_id:conversationId,channel,
    visitor_name:visitorName,visitor_phone:visitorPhone,visitor_email:visitorEmail
   }});
   if(error)throw error;
   if(data?.whatsapp_url)setWhatsappUrl(data.whatsapp_url);
   setHandoffSaved(true);
  }catch{
   setMessages(current=>[...current,{role:"assistant",content:"I couldn't save the handoff just now. Please use the WhatsApp contact option to reach our team directly."}]);
  }finally{setHandoffBusy(false);}
 };

 return <>
  {open&&<section aria-label="eCuisinefoods AI assistant" className="fixed bottom-[106px] right-3 z-[80] flex h-[min(650px,calc(100dvh-132px))] w-[min(420px,calc(100vw-24px))] flex-col overflow-hidden rounded-[26px] border border-[#dce7d9] bg-[#fffefa] shadow-[0_24px_80px_rgba(14,49,29,.24)] sm:bottom-24 sm:right-6">
   <header className="flex items-center justify-between gap-3 bg-[#174d35] px-5 py-4 text-white">
    <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/10 text-[#f4dc87]"><Bot size={23}/></span><div><p className="text-base font-extrabold">eCuisine assistant</p><p className="mt-0.5 text-xs text-white/75">Helpful answers · Human support when needed</p></div></div>
    <button type="button" aria-label="Close assistant" onClick={()=>setOpen(false)} className="grid h-10 w-10 place-items-center rounded-full bg-white/10 hover:bg-white/20"><X size={19}/></button>
   </header>
   <div className="flex-1 space-y-4 overflow-y-auto bg-[#f7f8f2] px-4 py-5 sm:px-5">
    <div className="flex justify-center"><span className="rounded-full bg-white px-3 py-1.5 text-[11px] font-semibold text-[#758275] shadow-sm">eCuisinefoods customer care</span></div>
    {messages.map((item,index)=><div key={index} className={item.role==="user"?"flex justify-end":"flex justify-start"}>
      <div className={item.role==="user"?"max-w-[88%] rounded-2xl rounded-br-md bg-[#1b6444] px-4 py-3 text-[15px] leading-7 text-white shadow-sm":"max-w-[92%] rounded-2xl rounded-bl-md border border-[#e4eadf] bg-white px-4 py-3 text-[15px] leading-7 text-[#344b39] shadow-sm"}>{item.content}</div>
    </div>)}
    {busy&&<div className="flex justify-start"><div className="flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-[#68796b] shadow-sm"><LoaderCircle size={16} className="animate-spin"/>Thinking through that…</div></div>}
    {needsHuman&&<div className="rounded-2xl border border-[#e8dcae] bg-[#fff8df] p-4">
      <div className="flex items-start gap-2"><Headphones size={19} className="mt-0.5 shrink-0 text-[#96721e]"/><div><p className="text-sm font-extrabold text-[#604c1d]">A member of our team can help</p><p className="mt-1 text-sm leading-6 text-[#78673a]">{handoffReason||"This needs a team member to verify the details."} This conversation can be sent to our support inbox, and you can also continue on WhatsApp.</p></div></div>
      {!handoffSaved&&!contactOpen&&<button type="button" onClick={()=>setContactOpen(true)} className="mt-3 rounded-full bg-[#245b42] px-4 py-2.5 text-sm font-bold text-white">Connect me to the team</button>}
      {contactOpen&&!handoffSaved&&<div className="mt-4 space-y-3">
       <p className="text-xs font-bold text-[#69572a]">Contact details (optional, to help the team reply)</p>
       <input value={visitorName} onChange={e=>setVisitorName(e.target.value)} placeholder="Your name" aria-label="Your name" className="w-full rounded-xl border border-[#e3d7b0] bg-white px-3 py-3 text-sm text-[#344b39] outline-none focus:border-[#9b7b29]"/>
       <input value={visitorPhone} onChange={e=>setVisitorPhone(e.target.value)} placeholder="Phone / WhatsApp number" aria-label="Phone or WhatsApp number" className="w-full rounded-xl border border-[#e3d7b0] bg-white px-3 py-3 text-sm text-[#344b39] outline-none focus:border-[#9b7b29]"/>
       <input type="email" value={visitorEmail} onChange={e=>setVisitorEmail(e.target.value)} placeholder="Email (optional)" aria-label="Email" className="w-full rounded-xl border border-[#e3d7b0] bg-white px-3 py-3 text-sm text-[#344b39] outline-none focus:border-[#9b7b29]"/>
       <button type="button" disabled={handoffBusy} onClick={()=>void saveHandoff("admin_inbox")} className="w-full rounded-xl bg-[#245b42] px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{handoffBusy?"Sending…":"Send conversation to admin inbox"}</button>
       <button type="button" disabled={handoffBusy} onClick={()=>void saveHandoff("whatsapp")} className="w-full rounded-xl border border-[#cbd8c8] bg-white px-4 py-3 text-sm font-bold text-[#245b42] disabled:opacity-50">Prepare WhatsApp handoff</button>
      </div>}
      {handoffSaved&&<div className="mt-3 rounded-xl bg-white p-3 text-sm font-semibold text-[#3c6044]"><p>Your conversation is saved for the eCuisine team.</p>{whatsappUrl&&<a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-2 font-bold text-[#176044] underline">Open WhatsApp to send the message <ArrowUpRight size={15}/></a>}</div>}
     </div>}
    <div ref={bottomRef}/>
   </div>
   <form onSubmit={sendMessage} className="border-t border-[#e5ebe1] bg-white p-3 sm:p-4">
    <div className="flex items-end gap-2 rounded-2xl border border-[#dce7d9] bg-[#fbfcf9] p-2 focus-within:border-[#679077]">
     <textarea rows={1} value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();void sendMessage(e as unknown as FormEvent<HTMLFormElement>);}}} placeholder="Ask eCuisine a question…" aria-label="Message the eCuisine assistant" className="max-h-28 min-h-11 flex-1 resize-y bg-transparent px-2 py-3 text-[15px] leading-6 text-[#294432] outline-none placeholder:text-[#97a398]"/>
     <button type="submit" disabled={busy||!draft.trim()} aria-label="Send message" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#176044] text-white hover:bg-[#10482f] disabled:opacity-40"><Send size={18}/></button>
    </div>
    <p className="mt-2 px-1 text-xs leading-5 text-[#8a9689]">Chats are saved so eCuisine support can help when needed. Please don’t share passwords, PINs, OTPs or banking codes.</p>
   </form>
  </section>}
  <button type="button" onClick={()=>setOpen(value=>!value)} aria-label={open?"Close eCuisine assistant":"Chat with eCuisine assistant"} className="fixed bottom-[104px] right-4 z-[81] flex items-center gap-3 rounded-full border-2 border-white bg-[#174d35] px-4 py-3.5 text-white shadow-[0_12px_35px_rgba(15,54,31,.3)] transition hover:-translate-y-1 sm:bottom-6 sm:right-6">
   {open?<X size={21}/>:<MessageCircle size={22}/>}<span className="pr-1 text-sm font-extrabold">{open?"Close chat":"Ask eCuisine"}</span>
  </button>
 </>;
}
