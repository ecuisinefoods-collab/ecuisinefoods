"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Bot, BookOpen, Check, CircleAlert, Clock3, Headphones, LoaderCircle, MessageSquare, Plus, Save, Search, Send, Trash2, Users } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Knowledge={id:string;title:string;category:string;content:string;is_active:boolean;sort_order:number;updated_at:string};
type Conversation={id:string;status:string;needs_human:boolean;handoff_reason:string|null;handoff_channel:string|null;visitor_name:string|null;visitor_email:string|null;visitor_phone:string|null;subject:string|null;created_at:string;last_message_at:string;};
type ChatMessage={id:string;role:string;content:string;created_at:string};
const blankKnowledge={title:"",category:"General",content:"",is_active:true,sort_order:100};
const dateLabel=(value:string)=>new Date(value).toLocaleString("en-NG",{dateStyle:"medium",timeStyle:"short"});
const whatsappNumber=(value:string)=>{const digits=value.replace(/\\D/g,"");if(digits.startsWith("0"))return "234"+digits.slice(1);if(digits.length===10)return "234"+digits;return digits;};

export default function AssistantAdminPage(){
 const [role,setRole]=useState("");
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [message,setMessage]=useState("");
 const [tab,setTab]=useState<"inbox"|"knowledge">("inbox");
 const [conversations,setConversations]=useState<Conversation[]>([]);
 const [selected,setSelected]=useState<Conversation|null>(null);
 const [messages,setMessages]=useState<ChatMessage[]>([]);
 const [messagesLoading,setMessagesLoading]=useState(false);
 const [search,setSearch]=useState("");
 const [knowledge,setKnowledge]=useState<Knowledge[]>([]);
 const [editing,setEditing]=useState<string|null>(null);
 const [draft,setDraft]=useState(blankKnowledge);
 const [saving,setSaving]=useState(false);
 const canEdit=["owner","store_manager"].includes(role);
 const isOwner=role==="owner";

 const loadConversations=useCallback(async()=>{
  if(!supabase)return;
  const {data,error:queryError}=await supabase.from("assistant_conversations").select("*").order("needs_human",{ascending:false}).order("last_message_at",{ascending:false}).limit(80);
  if(queryError){setError(queryError.message);return;}
  const items=(data||[]) as Conversation[];
  setConversations(items);
  if(selected){const fresh=items.find(item=>item.id===selected.id);if(fresh)setSelected(fresh);}
 },[selected]);

 const loadKnowledge=useCallback(async()=>{
  if(!supabase||!canEdit)return;
  const {data,error:queryError}=await supabase.from("assistant_knowledge").select("*").order("sort_order").order("title");
  if(queryError)setError(queryError.message);else setKnowledge((data||[]) as Knowledge[]);
 },[canEdit]);

 useEffect(()=>{
  let alive=true;
  const start=async()=>{
   if(!supabase){setError("Database connection is not configured.");setLoading(false);return;}
   const {data:{user}}=await supabase.auth.getUser();
   if(!user){setError("Please sign in through the admin dashboard.");setLoading(false);return;}
   const {data:profile}=await supabase.from("admin_profiles").select("role,is_active").eq("user_id",user.id).maybeSingle();
   if(!profile?.is_active||!["owner","store_manager","order_officer"].includes(profile.role)){setError("Your account does not have access to the assistant inbox.");setLoading(false);return;}
   if(!alive)return;
   setRole(profile.role);
   const [inboxResult,knowledgeResult]=await Promise.all([
    supabase.from("assistant_conversations").select("*").order("needs_human",{ascending:false}).order("last_message_at",{ascending:false}).limit(80),
    ["owner","store_manager"].includes(profile.role)?supabase.from("assistant_knowledge").select("*").order("sort_order").order("title"):Promise.resolve({data:[],error:null})
   ]);
   if(!alive)return;
   if(inboxResult.error)setError(inboxResult.error.message);else setConversations((inboxResult.data||[]) as Conversation[]);
   if(knowledgeResult.error)setError(knowledgeResult.error.message);else setKnowledge((knowledgeResult.data||[]) as Knowledge[]);
   setLoading(false);
  };
  void start();
  return()=>{alive=false;};
 },[]);

 const openConversation=async(item:Conversation)=>{
  setSelected(item);setMessages([]);setMessagesLoading(true);
  if(!supabase){setMessagesLoading(false);return;}
  const {data,error:queryError}=await supabase.from("assistant_messages").select("id,role,content,created_at").eq("conversation_id",item.id).order("created_at");
  if(queryError)setError(queryError.message);else setMessages((data||[]) as ChatMessage[]);
  setMessagesLoading(false);
 };

 const updateStatus=async(status:"in_progress"|"resolved")=>{
  if(!supabase||!selected)return;
  setSaving(true);setError("");setMessage("");
  const {error:updateError}=await supabase.from("assistant_conversations").update({
   status,needs_human:status!=="resolved",updated_at:new Date().toISOString()
  }).eq("id",selected.id);
  if(updateError)setError(updateError.message);
  else{setMessage(status==="resolved"?"Conversation marked resolved.":"Conversation marked in progress.");await loadConversations();}
  setSaving(false);
 };

 const saveKnowledge=async(event:FormEvent<HTMLFormElement>)=>{
  event.preventDefault();if(!supabase||!canEdit)return;
  if(draft.title.trim().length<3||draft.content.trim().length<10){setError("Please add a clear title and at least 10 characters of business information.");return;}
  setSaving(true);setError("");setMessage("");
  const payload={title:draft.title.trim(),category:draft.category.trim()||"General",content:draft.content.trim(),is_active:draft.is_active,sort_order:Number(draft.sort_order)||100,updated_at:new Date().toISOString()};
  const query=editing
   ?supabase.from("assistant_knowledge").update(payload).eq("id",editing)
   :supabase.from("assistant_knowledge").insert(payload);
  const {error:saveError}=await query;
  if(saveError)setError(saveError.message);
  else{setMessage(editing?"Knowledge entry updated.":"Knowledge entry added.");setDraft(blankKnowledge);setEditing(null);await loadKnowledge();}
  setSaving(false);
 };
 const editKnowledge=(item:Knowledge)=>{
  setEditing(item.id);setDraft({title:item.title,category:item.category,content:item.content,is_active:item.is_active,sort_order:item.sort_order});
  setError("");setMessage("");
 };
 const removeKnowledge=async(item:Knowledge)=>{
  if(!supabase||!isOwner||!window.confirm("Permanently delete this knowledge entry from the assistant's approved business information?"))return;
  const {data:deleted,error:deleteError}=await supabase.from("assistant_knowledge").delete().eq("id",item.id).select("id").maybeSingle();
  if(deleteError)setError(deleteError.message);else if(!deleted)setError("The knowledge entry was not deleted. Refresh and try again.");else{setMessage("Knowledge entry deleted.");if(editing===item.id){setEditing(null);setDraft(blankKnowledge);}await loadKnowledge();}
 };
 const visibleConversations=conversations.filter(item=>{
  const term=search.trim().toLowerCase();
  return !term||[item.subject,item.visitor_name,item.visitor_email,item.visitor_phone,item.handoff_reason].some(value=>value?.toLowerCase().includes(term));
 });
 const pendingCount=conversations.filter(item=>item.needs_human&&item.status!=="resolved").length;

 if(loading)return <main className="grid min-h-screen place-items-center bg-[#f5f7f3] text-[#42694b]"><LoaderCircle className="mr-2 animate-spin"/>Loading assistant workspace…</main>;
 if(!role)return <main className="min-h-screen bg-[#f5f7f3] p-8"><div className="mx-auto max-w-lg rounded-2xl bg-white p-7"><h1 className="text-xl font-bold text-[#203b2a]">Assistant workspace access</h1><p className="mt-3 text-sm text-red-700">{error}</p><Link href="/admin" className="mt-5 inline-flex text-sm font-bold text-[#315b43]">Back to admin</Link></div></main>;

 return <main className="min-h-screen bg-[#f5f7f3] px-4 py-7 text-[#26392c] sm:px-8"><div className="mx-auto max-w-7xl">
  <Link href="/admin" className="inline-flex items-center gap-2 text-xs font-bold text-[#65806a]"><ArrowLeft size={14}/> Admin overview</Link>
  <div className="mt-5 flex flex-wrap items-end justify-between gap-4"><div><p className="text-[10px] font-extrabold uppercase tracking-[.2em] text-[#8b9986]">Customer experience</p><h1 className="mt-1 flex items-center gap-3 text-3xl font-semibold tracking-tight text-[#1c3c29]"><Bot size={30}/> eCuisine assistant</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[#7d897a]">Review customer conversations, handle questions that need a person and maintain the approved business knowledge used to ground the assistant's answers.</p></div><div className="rounded-2xl border border-[#e3eae0] bg-white px-4 py-3"><p className="text-xs text-[#7d897a]">Needs attention</p><p className="mt-1 text-2xl font-black text-[#244e35]">{pendingCount}</p></div></div>
  {error&&<p role="alert" className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
  {message&&<p role="status" className="mt-5 rounded-xl bg-[#eaf3e8] p-3 text-sm font-semibold text-[#386344]">{message}</p>}
  <div className="mt-6 rounded-2xl border border-[#dce8d8] bg-[#edf4e9] p-4 sm:p-5">
   <div className="flex items-start gap-3"><Bot size={21} className="mt-0.5 shrink-0 text-[#356344]"/><div className="min-w-0">
    <p className="text-base font-extrabold text-[#294633]">Secure AI connection</p>
    <p className="mt-1 text-sm leading-6 text-[#647565]">To enable the assistant's AI replies, add <strong>OPENAI_API_KEY</strong> as a secret in Supabase Edge Function settings. Keep this key server-side—never paste it into the storefront, a knowledge entry or a customer message.</p>
    <a href="https://supabase.com/dashboard/project/clbvdtnazsqgyjobcitd/functions/secrets" target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex rounded-full bg-[#245b42] px-4 py-2.5 text-sm font-bold text-white">Open Supabase function secrets ↗</a>
    <p className="mt-3 text-xs leading-5 text-[#718071]">The assistant is configured to use GPT-6 Luna for focused, high-volume customer questions. Standard API pricing is usage-based: $0.10 per million input tokens and $0.50 per million output tokens. Actual charges depend on traffic and tokens used.</p>
   </div></div>
  </div>
  <div className="mt-6 flex flex-wrap items-center gap-2"><button type="button" onClick={()=>setTab("inbox")} className={"inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-bold "+(tab==="inbox"?"bg-[#245b42] text-white":"border border-[#dce5d8] bg-white text-[#516c56]")}><MessageSquare size={16}/> Support inbox <span className="rounded-full bg-white/15 px-2 py-0.5 text-xs">{pendingCount}</span></button>{canEdit&&<button type="button" onClick={()=>setTab("knowledge")} className={"inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-bold "+(tab==="knowledge"?"bg-[#245b42] text-white":"border border-[#dce5d8] bg-white text-[#516c56]")}><BookOpen size={16}/> Business knowledge</button>}<Link href="/admin/assistant/knowledge" className="inline-flex items-center gap-2 rounded-full border border-[#dce5d8] bg-white px-5 py-3 text-sm font-bold text-[#516c56] hover:bg-[#f1f6ee]">Knowledge files & AI training ↗</Link></div>

  {tab==="inbox"&&<section className="mt-5 grid min-h-[680px] gap-5 xl:grid-cols-[.85fr_1.15fr]">
   <div className="rounded-2xl border border-[#e3eae0] bg-white p-4 shadow-sm sm:p-5">
    <div className="flex items-center justify-between gap-3"><div><h2 className="font-bold text-[#2d4934]">Customer conversations</h2><p className="mt-1 text-xs text-[#8a9688]">{conversations.length} recent conversations</p></div><button type="button" onClick={()=>void loadConversations()} className="rounded-lg border border-[#e0e8dc] px-3 py-2 text-xs font-bold text-[#4e6b53]">Refresh</button></div>
    <label className="mt-4 flex items-center gap-2 rounded-xl border border-[#e4eae0] bg-[#fbfcfa] px-3 py-2.5"><Search size={16} className="text-[#879584]"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search customer, phone or topic" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#9ca69a]"/></label>
    <div className="mt-4 space-y-2">{visibleConversations.map(item=><button type="button" key={item.id} onClick={()=>void openConversation(item)} className={"w-full rounded-xl border p-4 text-left transition "+(selected?.id===item.id?"border-[#91b49a] bg-[#f1f7ef]":"border-[#edf0eb] bg-white hover:bg-[#fafcf8]")}>
      <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-extrabold text-[#294633]">{item.visitor_name||"Website visitor"}</p><p className="mt-1 truncate text-xs text-[#788678]">{item.subject||"Customer question"}</p></div>{item.needs_human&&item.status!=="resolved"&&<span className="shrink-0 rounded-full bg-[#fff3d5] px-2 py-1 text-[10px] font-bold text-[#8a6616]">Needs attention</span>}</div>
      <p className="mt-2 line-clamp-2 text-xs leading-5 text-[#879285]">{item.handoff_reason||"General customer conversation"}</p>
      <div className="mt-3 flex items-center justify-between gap-2"><span className={"rounded-full px-2 py-1 text-[10px] font-bold "+(item.status==="resolved"?"bg-[#edf0ed] text-[#6d796e]":item.status==="in_progress"?"bg-[#e9f1ff] text-[#49658c]":"bg-[#eaf4e8] text-[#3c704a]")}>{item.status.replace("_"," ")}</span><span className="text-[10px] text-[#9aa396]">{dateLabel(item.last_message_at)}</span></div>
     </button>)}
     {!visibleConversations.length&&<div className="rounded-xl border border-dashed border-[#d7e1d4] p-8 text-center"><MessageSquare size={25} className="mx-auto text-[#9aa998]"/><p className="mt-3 text-sm font-bold text-[#506b54]">No conversations found</p><p className="mt-1 text-xs text-[#909a8d]">New customer chats that need support will appear here.</p></div>}
    </div>
   </div>
   <div className="rounded-2xl border border-[#e3eae0] bg-white p-4 shadow-sm sm:p-6">
    {selected?<><div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#edf0eb] pb-4"><div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#8c9989]">Conversation · {selected.id.slice(0,8).toUpperCase()}</p><h2 className="mt-1 text-xl font-extrabold text-[#294633]">{selected.visitor_name||"Website visitor"}</h2><p className="mt-1 text-sm text-[#7d897a]">{selected.visitor_email||"No email provided"}{selected.visitor_phone?" · "+selected.visitor_phone:""}</p></div><span className="rounded-full bg-[#f4f6f1] px-3 py-2 text-xs font-bold text-[#677763]">{dateLabel(selected.created_at)}</span></div>
      {selected.needs_human&&<div className="mt-4 flex items-start gap-3 rounded-xl bg-[#fff7df] p-4"><CircleAlert size={19} className="mt-0.5 shrink-0 text-[#9a751e]"/><div><p className="text-sm font-bold text-[#694f18]">Human follow-up requested</p><p className="mt-1 text-sm leading-6 text-[#806b3b]">{selected.handoff_reason||"The assistant flagged this conversation for a team member."}</p><p className="mt-1 text-xs font-semibold text-[#8b774b]">Preferred handoff: {selected.handoff_channel||"Admin inbox"}</p></div></div>}
      <div className="mt-4 flex flex-wrap gap-2"><button type="button" disabled={saving||selected.status==="in_progress"} onClick={()=>void updateStatus("in_progress")} className="rounded-full border border-[#dce7d9] px-4 py-2.5 text-xs font-bold text-[#42694b] disabled:opacity-40">Mark in progress</button><button type="button" disabled={saving||selected.status==="resolved"} onClick={()=>void updateStatus("resolved")} className="inline-flex items-center gap-2 rounded-full bg-[#245b42] px-4 py-2.5 text-xs font-bold text-white disabled:opacity-40"><Check size={14}/> Resolve conversation</button>{selected.visitor_phone&&<a href={"https://wa.me/"+selected.visitor_phone.replace(/\D/g,"")+"?text="+encodeURIComponent("Hello "+(selected.visitor_name||"there")+", this is eCuisinefoods following up on your website chat.")} target="_blank" rel="noopener noreferrer" className="rounded-full border border-[#dce7d9] px-4 py-2.5 text-xs font-bold text-[#42694b]">Contact customer on WhatsApp</a>}</div>
      <div className="mt-5 max-h-[470px] space-y-3 overflow-y-auto rounded-xl bg-[#f7f8f3] p-4">{messagesLoading?<p className="text-sm text-[#718071]">Loading transcript…</p>:messages.map(item=><div key={item.id} className={item.role==="user"?"flex justify-start":"flex justify-end"}><div className={"max-w-[92%] rounded-2xl px-4 py-3 "+(item.role==="user"?"border border-[#e2e9df] bg-white text-[#344b39]":"bg-[#e4f0e1] text-[#2c4e34]")}><p className="text-[10px] font-extrabold uppercase tracking-[.12em] opacity-65">{item.role==="user"?"Customer":"eCuisine assistant"} · {dateLabel(item.created_at)}</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6">{item.content}</p></div></div>)}</div>
     </>:<div className="grid min-h-[580px] place-items-center text-center"><div className="max-w-sm"><span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-[#edf4e9] text-[#3e704b]"><Headphones size={28}/></span><h2 className="mt-5 text-xl font-bold text-[#2d4934]">Choose a conversation</h2><p className="mt-2 text-sm leading-6 text-[#829080]">Select a customer chat on the left to read the transcript, check why it was escalated and manage its status.</p></div></div>}
   </div>
  </section>}

  {tab==="knowledge"&&canEdit&&<section className="mt-5 grid gap-5 lg:grid-cols-[.8fr_1.2fr]">
   <div className="h-fit rounded-2xl border border-[#e3eae0] bg-white p-5 shadow-sm sm:p-6"><div className="flex items-center gap-2"><BookOpen size={18} className="text-[#42694b]"/><h2 className="font-bold text-[#2d4934]">{editing?"Edit knowledge entry":"Add business knowledge"}</h2></div><p className="mt-2 text-sm leading-6 text-[#7d897a]">Write facts, policies, service details and approved answers in plain language. The assistant uses these entries as reference material; updates are available without retraining a model.</p>
    <form onSubmit={saveKnowledge} className="mt-5 space-y-4"><label className="block text-sm font-bold text-[#405443]">Title<input required minLength={3} maxLength={160} value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})} placeholder="e.g. Returns and refunds" className="mt-2 w-full rounded-xl border border-[#dfe6dc] bg-[#fbfcfa] px-4 py-3 text-base font-normal"/></label>
     <label className="block text-sm font-bold text-[#405443]">Category<input value={draft.category} onChange={e=>setDraft({...draft,category:e.target.value})} placeholder="Orders, Products, Policies…" className="mt-2 w-full rounded-xl border border-[#dfe6dc] bg-[#fbfcfa] px-4 py-3 text-base font-normal"/></label>
     <label className="block text-sm font-bold text-[#405443]">Business information<textarea required minLength={10} maxLength={12000} rows={9} value={draft.content} onChange={e=>setDraft({...draft,content:e.target.value})} placeholder="Add the approved details the assistant should know…" className="mt-2 w-full rounded-xl border border-[#dfe6dc] bg-[#fbfcfa] px-4 py-3 text-base font-normal leading-7"/></label>
     <label className="block text-sm font-bold text-[#405443]">Display order<input type="number" value={draft.sort_order} onChange={e=>setDraft({...draft,sort_order:Number(e.target.value)})} className="mt-2 w-full rounded-xl border border-[#dfe6dc] bg-[#fbfcfa] px-4 py-3 text-base font-normal"/></label>
     <label className="flex items-center gap-3 text-sm font-semibold text-[#526352]"><input type="checkbox" checked={draft.is_active} onChange={e=>setDraft({...draft,is_active:e.target.checked})} className="h-4 w-4 accent-[#245b42]"/> Use this information in assistant answers</label>
     <div className="flex flex-wrap gap-2"><button disabled={saving} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#245b42] px-4 py-3 text-sm font-bold text-white disabled:opacity-50"><Save size={15}/>{saving?"Saving…":editing?"Update entry":"Add to knowledge base"}</button>{editing&&<button type="button" onClick={()=>{setEditing(null);setDraft(blankKnowledge);}} className="rounded-xl border border-[#e1e8de] px-4 py-3 text-sm font-bold text-[#657463]">Cancel</button>}</div>
    </form>
   </div>
   <div className="rounded-2xl border border-[#e3eae0] bg-white p-5 shadow-sm sm:p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-bold text-[#2d4934]">Approved business knowledge</h2><p className="mt-1 text-sm text-[#8a9688]">{knowledge.length} entries · {knowledge.filter(k=>k.is_active).length} active</p></div><button type="button" onClick={()=>{setEditing(null);setDraft(blankKnowledge);}} className="inline-flex items-center gap-2 rounded-full border border-[#dce5d8] px-4 py-2.5 text-xs font-bold text-[#42694b]"><Plus size={14}/> New entry</button></div>
    <div className="mt-5 space-y-3">{knowledge.map(item=><article key={item.id} className="rounded-xl border border-[#e7ece4] p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="text-base font-extrabold text-[#294633]">{item.title}</h3><span className="rounded-full bg-[#f0f4ec] px-2 py-1 text-[10px] font-bold text-[#697d68]">{item.category}</span><span className={"rounded-full px-2 py-1 text-[10px] font-bold "+(item.is_active?"bg-[#eaf3e8] text-[#3e704b]":"bg-[#f1f1ee] text-[#838c80]")}>{item.is_active?"Active":"Paused"}</span></div><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#738071]">{item.content}</p><p className="mt-2 text-[10px] text-[#9aa396]">Updated {dateLabel(item.updated_at)}</p></div><div className="flex shrink-0 gap-2"><button type="button" onClick={()=>editKnowledge(item)} className="rounded-lg border border-[#dce7d9] px-3 py-2 text-xs font-bold text-[#42694b]">Edit</button>{isOwner&&<button type="button" onClick={()=>void removeKnowledge(item)} aria-label={"Delete "+item.title} className="rounded-lg border border-[#f0dfdc] p-2 text-[#a05f54]"><Trash2 size={14}/></button>}</div></div></article>)}
     {!knowledge.length&&<div className="rounded-xl border border-dashed border-[#d7e1d4] p-8 text-center"><BookOpen size={26} className="mx-auto text-[#9aa998]"/><p className="mt-3 text-sm font-bold text-[#506b54]">No knowledge entries yet</p></div>}
    </div>
   </div>
  </section>}
 </div></main>;
}
