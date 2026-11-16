"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Bot, CheckCircle2, FileText, LoaderCircle, RefreshCw, Send, Trash2, UploadCloud } from "lucide-react";
import { supabase } from "@/lib/supabase";

type DocumentRow = {
  id: string;
  file_name: string;
  title: string;
  status: "uploaded" | "waiting_setup" | "processing" | "active" | "error";
  error_message: string | null;
  file_size: number;
  created_at: string;
};
const dateLabel=(value:string)=>new Date(value).toLocaleString("en-NG",{dateStyle:"medium",timeStyle:"short"});
const statusLabel=(status:DocumentRow["status"])=>({
 uploaded:"Uploaded",waiting_setup:"Waiting for API key",processing:"Indexing",active:"Indexed and ready",error:"Needs attention"
}[status]);

function mimeFor(file:File) {
  if(file.type)return file.type;
  const ext=file.name.split(".").pop()?.toLowerCase();
  return ({
    pdf:"application/pdf",doc:"application/msword",
    docx:"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    txt:"text/plain",md:"text/markdown",csv:"text/csv",json:"application/json"
  } as Record<string,string>)[ext||""]||"application/octet-stream";
}

export default function AssistantKnowledgePage(){
 const [authorized,setAuthorized]=useState(false);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [message,setMessage]=useState("");
 const [documents,setDocuments]=useState<DocumentRow[]>([]);
 const [uploading,setUploading]=useState(false);
 const [busyId,setBusyId]=useState<string|null>(null);
 const [question,setQuestion]=useState("");
 const [answer,setAnswer]=useState("");
 const [asking,setAsking]=useState(false);

 const loadDocuments=useCallback(async()=>{
  if(!supabase)return;
  const {data,error:queryError}=await supabase.from("assistant_knowledge_documents")
    .select("id,file_name,title,status,error_message,file_size,created_at")
    .order("created_at",{ascending:false});
  if(queryError)setError(queryError.message);
  else setDocuments((data||[]) as DocumentRow[]);
 },[]);

 useEffect(()=>{
  let alive=true;
  const start=async()=>{
   if(!supabase){setError("Database connection is not configured.");setLoading(false);return;}
   const {data:{user}}=await supabase.auth.getUser();
   if(!user){setError("Please sign in through the admin dashboard.");setLoading(false);return;}
   const {data:profile}=await supabase.from("admin_profiles").select("role,is_active").eq("user_id",user.id).maybeSingle();
   if(!profile?.is_active||!["owner","store_manager"].includes(profile.role)){
    setError("Only active owners and store managers can manage the AI knowledge library.");setLoading(false);return;
   }
   if(!alive)return;
   setAuthorized(true);
   await loadDocuments();
   if(alive)setLoading(false);
  };
  void start();
  return()=>{alive=false;};
 },[loadDocuments]);

 const invokeKnowledge=async(action:"process"|"delete"|"ask_knowledge",body:Record<string,unknown>)=>{
  if(!supabase)throw new Error("Database connection is not configured.");
  const {data,error:fnError}=await supabase.functions.invoke("ecuisine-knowledge",{body:{action,...body}});
  if(fnError)throw new Error(fnError.message);
  if(data?.error)throw new Error(data.error);
  return data;
 };

 const upload=async(file?:File)=>{
  if(!supabase||!file)return;
  const ext=file.name.split(".").pop()?.toLowerCase()||"";
  if(!["pdf","doc","docx","txt","md","csv","json"].includes(ext)){
   setError("Choose a PDF, DOC, DOCX, TXT, MD, CSV or JSON document.");return;
  }
  if(file.size<1||file.size>10*1024*1024){setError("Each file must be smaller than 10 MB.");return;}
  setUploading(true);setError("");setMessage("");
  try{
   const {data:{user}}=await supabase.auth.getUser();
   if(!user)throw new Error("Your admin session has expired. Please sign in again.");
   const id=crypto.randomUUID();
   const safeName=file.name.replace(/[^a-zA-Z0-9._-]/g,"_").slice(-150);
   const path=user.id+"/"+id+"/"+safeName;
   const mime=mimeFor(file);
   const {error:uploadError}=await supabase.storage.from("assistant-knowledge").upload(path,file,{contentType:mime,upsert:false});
   if(uploadError)throw uploadError;
   const {error:rowError}=await supabase.from("assistant_knowledge_documents").insert({
    id,file_name:file.name,title:file.name.replace(/\.[^.]+$/,"").slice(0,180)||"Business document",
    bucket_path:path,mime_type:mime,file_size:file.size,status:"uploaded",created_by:user.id
   });
   if(rowError){await supabase.storage.from("assistant-knowledge").remove([path]);throw rowError;}
   try{
    const result=await invokeKnowledge("process",{document_id:id});
    setMessage(result.status==="active"?"Your document is indexed and ready for the assistant.":result.status==="waiting_setup"?"Your document is safely stored. Add the OpenAI API key, then press Process to index it.":"Your document was uploaded; indexing is underway.");
   }catch(fnError){
    setMessage("Your file is safely stored. Use Process to retry indexing after checking the AI connection.");
    setError(fnError instanceof Error?fnError.message:"The indexing request could not be completed.");
   }
   await loadDocuments();
  }catch(err){setError(err instanceof Error?err.message:"The document could not be uploaded.");}
  finally{setUploading(false);}
 };

 const process=async(item:DocumentRow)=>{
  setBusyId(item.id);setError("");setMessage("");
  try{
   const result=await invokeKnowledge("process",{document_id:item.id});
   setMessage(result.status==="active"?"Document indexed successfully. The customer assistant can now search it.":"Index status: "+(result.status||"processing")+". Refresh or check again shortly.");
   await loadDocuments();
  }catch(err){setError(err instanceof Error?err.message:"Document processing failed.");}
  finally{setBusyId(null);}
 };
 const remove=async(item:DocumentRow)=>{
  if(!window.confirm("Remove "+item.file_name+" and its searchable copy from the AI knowledge library?"))return;
  setBusyId(item.id);setError("");setMessage("");
  try{
   await invokeKnowledge("delete",{document_id:item.id});
   setMessage("The document and its indexed copy have been removed.");
   await loadDocuments();
  }catch(err){setError(err instanceof Error?err.message:"Document deletion failed.");}
  finally{setBusyId(null);}
 };
 const ask=async(event:FormEvent<HTMLFormElement>)=>{
  event.preventDefault();if(!question.trim())return;
  setAsking(true);setError("");setAnswer("");
  try{
   const result=await invokeKnowledge("ask_knowledge",{question:question.trim()});
   setAnswer(result.answer||"No answer was returned.");
  }catch(err){setError(err instanceof Error?err.message:"The assistant could not answer this question.");}
  finally{setAsking(false);}
 };

 if(loading)return <main className="grid min-h-screen place-items-center bg-[#f5f7f3] text-[#42694b]"><LoaderCircle className="mr-2 animate-spin"/>Loading AI knowledge library…</main>;
 if(!authorized)return <main className="min-h-screen bg-[#f5f7f3] p-8"><div className="mx-auto max-w-lg rounded-2xl bg-white p-7"><h1 className="text-xl font-bold text-[#203b2a]">Knowledge library access</h1><p className="mt-3 text-sm text-red-700">{error}</p><Link href="/admin" className="mt-5 inline-flex text-sm font-bold text-[#315b43]">Back to admin</Link></div></main>;

 return <main className="min-h-screen bg-[#f5f7f3] px-4 py-7 text-[#26392c] sm:px-8">
  <div className="mx-auto max-w-7xl">
   <Link href="/admin/assistant" className="inline-flex items-center gap-2 text-xs font-bold text-[#65806a]"><ArrowLeft size={14}/> Assistant dashboard</Link>
   <div className="mt-5 flex flex-wrap items-end justify-between gap-4"><div><p className="text-[10px] font-extrabold uppercase tracking-[.2em] text-[#8b9986]">Continuous business learning</p><h1 className="mt-1 flex items-center gap-3 text-3xl font-semibold tracking-tight text-[#1c3c29]"><Bot size={30}/> AI knowledge library</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[#7d897a]">Upload approved business documents, let the AI index them, then test what it can retrieve. Updates become available to the customer assistant after indexing completes.</p></div><div className="rounded-2xl border border-[#e3eae0] bg-white px-4 py-3"><p className="text-xs text-[#7d897a]">Indexed documents</p><p className="mt-1 text-2xl font-black text-[#244e35]">{documents.filter(d=>d.status==="active").length}<span className="ml-1 text-sm font-semibold text-[#9aa396]">/ {documents.length}</span></p></div></div>
   {error&&<p role="alert" className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
   {message&&<p role="status" className="mt-5 rounded-xl bg-[#eaf3e8] p-3 text-sm font-semibold text-[#386344]">{message}</p>}
   <div className="mt-6 grid gap-5 xl:grid-cols-[.75fr_1.25fr]">
    <section className="h-fit rounded-2xl border border-[#e3eae0] bg-white p-5 shadow-sm sm:p-6">
     <div className="flex items-center gap-2"><UploadCloud size={20} className="text-[#42694b]"/><h2 className="font-bold text-[#2d4934]">Add business files</h2></div>
     <p className="mt-2 text-sm leading-6 text-[#7d897a]">Upload product catalogues, ingredients lists, price guides, policies, delivery information, FAQs, company profiles and staff-approved documents.</p>
     <label className="mt-5 flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#b9cbb6] bg-[#f7faf5] p-5 text-center text-[#42664a] transition hover:bg-[#eff6eb]">
      <UploadCloud size={30}/><span className="mt-3 text-sm font-extrabold">{uploading?"Uploading and indexing…":"Choose a business document"}</span><span className="mt-1 text-xs text-[#829080]">PDF, DOC, DOCX, TXT, MD, CSV or JSON · maximum 10 MB</span>
      <input type="file" accept=".pdf,.doc,.docx,.txt,.md,.csv,.json" disabled={uploading} onChange={e=>{void upload(e.target.files?.[0]);e.currentTarget.value="";}} className="sr-only"/>
     </label>
     <div className="mt-5 rounded-xl bg-[#edf4e9] p-4"><p className="text-sm font-bold text-[#294633]">How eCuisine AI improves</p><ol className="mt-2 list-decimal space-y-1 pl-5 text-xs leading-5 text-[#647565]"><li>You upload approved, accurate business information.</li><li>The document is stored privately and indexed for search.</li><li>The assistant retrieves relevant sections when a customer asks a question.</li><li>You test its answers, fix gaps in the source material and upload the improved version.</li></ol></div>
     <p className="mt-4 text-xs leading-5 text-[#8a9688]">The original file remains in your private Supabase storage and a searchable copy is processed by OpenAI. File search and storage are usage-based and may incur separate API charges. Do not upload passwords, PINs, bank credentials, customer identity documents or confidential records.</p>
    </section>
    <div className="space-y-5">
     <section className="rounded-2xl border border-[#e3eae0] bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-bold text-[#2d4934]">Your business knowledge files</h2><p className="mt-1 text-xs text-[#8a9688]">{documents.length} files · {documents.filter(d=>d.status==="active").length} searchable</p></div><button type="button" onClick={()=>void loadDocuments()} className="inline-flex items-center gap-2 rounded-full border border-[#dce5d8] px-3 py-2 text-xs font-bold text-[#42694b]"><RefreshCw size={14}/> Refresh</button></div>
      <div className="mt-4 space-y-3">{documents.map(item=><article key={item.id} className="rounded-xl border border-[#e7ece4] p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><FileText size={16} className="text-[#66816a]"/><h3 className="max-w-full break-words text-sm font-extrabold text-[#294633]">{item.title}</h3><span className={"rounded-full px-2 py-1 text-[10px] font-bold "+(item.status==="active"?"bg-[#eaf3e8] text-[#3e704b]":item.status==="error"?"bg-[#fff0ed] text-[#a34c40]":"bg-[#fff5dd] text-[#8a6616]")}>{statusLabel(item.status)}</span></div><p className="mt-2 break-words text-xs text-[#849080]">{item.file_name} · {(item.file_size/1024/1024).toFixed(2)} MB · {dateLabel(item.created_at)}</p>{item.error_message&&<p className="mt-2 text-xs text-red-700">{item.error_message}</p>}</div><div className="flex shrink-0 gap-2">{item.status!=="active"&&<button type="button" disabled={busyId===item.id} onClick={()=>void process(item)} className="rounded-lg border border-[#dce7d9] px-3 py-2 text-xs font-bold text-[#42694b] disabled:opacity-40">{item.status==="processing"?"Check status":"Process"}</button>}<button type="button" disabled={busyId===item.id} onClick={()=>void remove(item)} className="rounded-lg border border-[#f0dfdc] p-2 text-[#a05f54] disabled:opacity-40" aria-label={"Delete "+item.title}><Trash2 size={14}/></button></div></div></article>)}
       {!documents.length&&<div className="rounded-xl border border-dashed border-[#d7e1d4] p-8 text-center"><FileText size={25} className="mx-auto text-[#9aa998]"/><p className="mt-3 text-sm font-bold text-[#506b54]">Your knowledge library is empty</p><p className="mt-1 text-xs text-[#909a8d]">Upload your first approved business document to get started.</p></div>}
      </div>
     </section>
     <section className="rounded-2xl border border-[#e3eae0] bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-center gap-2"><Bot size={19} className="text-[#42694b]"/><h2 className="font-bold text-[#2d4934]">Ask your knowledge base</h2></div><p className="mt-2 text-sm leading-6 text-[#7d897a]">Test the AI with questions before relying on it for customer support. When the documents do not contain an answer, it should explain what information is missing rather than guess.</p>
      <form onSubmit={ask} className="mt-4"><label className="block text-sm font-bold text-[#405443]">Test question<textarea required minLength={3} maxLength={800} rows={3} value={question} onChange={e=>setQuestion(e.target.value)} placeholder="e.g. What ingredients are in our Multigrain cereal?" className="mt-2 w-full rounded-xl border border-[#dfe6dc] bg-[#fbfcfa] px-4 py-3 text-sm font-normal leading-6"/></label><button disabled={asking||!question.trim()} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[#245b42] px-5 py-3 text-sm font-bold text-white disabled:opacity-50"><Send size={15}/>{asking?"Searching business files…":"Ask the AI"}</button></form>
      {answer&&<div className="mt-4 rounded-xl border border-[#dce8d8] bg-[#f4f8f1] p-4"><p className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[.15em] text-[#66816a]"><CheckCircle2 size={14}/> AI response</p><p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-[#344b39]">{answer}</p></div>}
     </section>
    </div>
   </div>
  </div>
 </main>;
}
