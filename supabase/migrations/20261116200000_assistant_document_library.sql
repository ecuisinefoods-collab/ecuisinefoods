create table if not exists public.assistant_knowledge_documents (
  id uuid primary key default gen_random_uuid(),
  file_name text not null,
  title text not null,
  bucket_path text not null unique,
  mime_type text not null,
  file_size bigint not null check (file_size > 0 and file_size <= 10485760),
  status text not null default 'uploaded'
    check (status in ('uploaded','waiting_setup','processing','active','error')),
  error_message text,
  provider_file_id text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assistant_knowledge_document_title_length check (char_length(trim(title)) between 1 and 180)
);
create index if not exists assistant_knowledge_documents_status_idx
  on public.assistant_knowledge_documents (status, updated_at desc);
create table if not exists public.assistant_knowledge_config (
  singleton boolean primary key default true check (singleton = true),
  vector_store_id text,
  updated_at timestamptz not null default now()
);
alter table public.assistant_knowledge_documents enable row level security;
alter table public.assistant_knowledge_config enable row level security;
drop policy if exists "Store admins manage assistant knowledge documents" on public.assistant_knowledge_documents;
create policy "Store admins manage assistant knowledge documents"
on public.assistant_knowledge_documents
for all to authenticated
using ((select private.has_admin_role(array['owner','store_manager']::text[])))
with check ((select private.has_admin_role(array['owner','store_manager']::text[])));
grant select, insert, update, delete on public.assistant_knowledge_documents to authenticated;
revoke all on public.assistant_knowledge_config from public, anon, authenticated;
grant all on public.assistant_knowledge_config to service_role;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('assistant-knowledge','assistant-knowledge',false,10485760,array[
'application/pdf',
'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
'application/msword',
'text/plain',
'text/markdown',
'text/csv',
'application/csv',
'application/json'
]::text[])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
drop policy if exists "Store admins access assistant knowledge files" on storage.objects;
create policy "Store admins access assistant knowledge files"
on storage.objects for all to authenticated
using (bucket_id='assistant-knowledge' and (select private.has_admin_role(array['owner','store_manager']::text[])))
with check (bucket_id='assistant-knowledge' and (select private.has_admin_role(array['owner','store_manager']::text[])));
