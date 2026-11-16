create table if not exists public.assistant_knowledge (
  id uuid primary key default gen_random_uuid(),
  title text not null unique,
  category text not null default 'General',
  content text not null,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assistant_knowledge_title_length check (char_length(trim(title)) between 3 and 160),
  constraint assistant_knowledge_content_length check (char_length(trim(content)) between 10 and 12000)
);

create table if not exists public.assistant_conversations (
  id uuid primary key,
  status text not null default 'open' check (status in ('open','in_progress','resolved')),
  source text not null default 'storefront_widget',
  needs_human boolean not null default false,
  handoff_reason text,
  handoff_channel text check (handoff_channel is null or handoff_channel in ('admin_inbox','whatsapp')),
  visitor_name text,
  visitor_email text,
  visitor_phone text,
  subject text,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.assistant_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.assistant_conversations(id) on delete cascade,
  role text not null check (role in ('user','assistant','system')),
  content text not null check (char_length(content) between 1 and 6000),
  created_at timestamptz not null default now()
);

create index if not exists assistant_conversations_inbox_idx
  on public.assistant_conversations (needs_human desc, status, last_message_at desc);
create index if not exists assistant_messages_conversation_time_idx
  on public.assistant_messages (conversation_id, created_at);
create index if not exists assistant_knowledge_active_sort_idx
  on public.assistant_knowledge (is_active, sort_order, category);

create table if not exists public.assistant_rate_limits (
  ip_hash text primary key,
  window_started_at timestamptz not null default now(),
  request_count integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.assistant_knowledge enable row level security;
alter table public.assistant_conversations enable row level security;
alter table public.assistant_messages enable row level security;
alter table public.assistant_rate_limits enable row level security;

drop policy if exists "Store admins manage assistant knowledge" on public.assistant_knowledge;
create policy "Store admins manage assistant knowledge"
on public.assistant_knowledge
for all to authenticated
using ((select private.has_admin_role(array['owner','store_manager']::text[])))
with check ((select private.has_admin_role(array['owner','store_manager']::text[])));

drop policy if exists "Support admins read assistant conversations" on public.assistant_conversations;
create policy "Support admins read assistant conversations"
on public.assistant_conversations
for select to authenticated
using ((select private.has_admin_role(array['owner','store_manager','order_officer']::text[])));

drop policy if exists "Support admins update assistant conversations" on public.assistant_conversations;
create policy "Support admins update assistant conversations"
on public.assistant_conversations
for update to authenticated
using ((select private.has_admin_role(array['owner','store_manager','order_officer']::text[])))
with check ((select private.has_admin_role(array['owner','store_manager','order_officer']::text[])));

drop policy if exists "Support admins read assistant messages" on public.assistant_messages;
create policy "Support admins read assistant messages"
on public.assistant_messages
for select to authenticated
using (
  exists (
    select 1
    from public.assistant_conversations c
    where c.id = conversation_id
      and (select private.has_admin_role(array['owner','store_manager','order_officer']::text[]))
  )
);

grant select, insert, update, delete on public.assistant_knowledge to authenticated;
grant select, update on public.assistant_conversations to authenticated;
grant select on public.assistant_messages to authenticated;
revoke all on public.assistant_rate_limits from anon, authenticated;

create or replace function public.consume_ecuisine_assistant_rate_limit(
  p_ip_hash text,
  p_max_requests integer default 18
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_count integer;
begin
  if p_ip_hash is null or char_length(p_ip_hash) < 32 then
    return false;
  end if;

  insert into public.assistant_rate_limits as existing
    (ip_hash, window_started_at, request_count, updated_at)
  values
    (p_ip_hash, now(), 1, now())
  on conflict (ip_hash) do update
    set window_started_at = case
          when existing.window_started_at <= now() - interval '1 hour' then now()
          else existing.window_started_at
        end,
        request_count = case
          when existing.window_started_at <= now() - interval '1 hour' then 1
          else existing.request_count + 1
        end,
        updated_at = now()
  returning request_count into v_count;

  return v_count <= greatest(1, least(coalesce(p_max_requests, 18), 60));
end;
$function$;

revoke all on function public.consume_ecuisine_assistant_rate_limit(text, integer) from public, anon, authenticated;
grant execute on function public.consume_ecuisine_assistant_rate_limit(text, integer) to service_role;

insert into public.assistant_knowledge (title, category, content, sort_order)
values
('Placing an order', 'Orders', 'Customers can visit the Shop, choose a product and pack size, add it to the cart, then complete checkout with their contact details and preferred pickup or delivery option.', 10),
('Pickup locations', 'Pickup', 'Available pickup points are selected at checkout. Active points currently listed are Terminus, Faringada and Lamingo in Jos, and Yelwa and Old G-R-A in Bauchi. Customers should wait for the team to confirm that an order is ready before visiting.', 20),
('Bank transfer payments', 'Payments', 'When bank transfer is available and selected, the order confirmation page displays the bank name, account name, account number, exact amount and a unique transfer narration/reference. Customers should use the reference exactly as shown. Never ask customers to share banking passwords, PINs or one-time passcodes.', 30),
('Sending transfer receipts', 'Payments', 'After making a transfer, customers can use the order confirmation page to open WhatsApp with their order details, then attach and send their transfer receipt screenshot to eCuisine.', 40),
('Payment verification', 'Payments', 'A transfer is not confirmed just because an order was submitted or a screenshot was sent. An eCuisine team member must check the business account and manually verify that the funds have arrived before an order is marked paid. The assistant must never confirm payment.', 50),
('Cash payment options', 'Payments', 'Cash on pickup or cash on delivery will appear at checkout only when that option is enabled for the selected fulfilment method. Customers should follow the payment options shown for their own order.', 60),
('Order tracking', 'Orders', 'Customers can use the private tracking code shown after checkout on the Track an order page to view the latest status, fulfilment details and items. The assistant must not claim to see or verify a specific order. Questions about a particular order should be sent to the eCuisine team.', 70),
('Delivery availability', 'Delivery', 'Delivery is offered only in areas configured by eCuisine. Customers should check the address options shown at checkout. If no delivery area is offered for an address, customers can choose an available pickup point. The assistant must not promise delivery to an area unless it appears in the current configured delivery zones.', 80),
('Product prices and pack sizes', 'Products', 'Available pack sizes and current prices are displayed on each product page and in the cart before the customer places an order. Use live product data for current prices and stock.', 90),
('Ingredients and nutrition', 'Products', 'Product information is displayed only when verified details have been supplied by eCuisine. Do not invent ingredients, allergens, nutrition values, health benefits or medical claims. Refer customers to the product page or a human team member when information is missing.', 100),
('Customer support', 'Support', 'Customers can contact eCuisine on WhatsApp at +234 808 094 2328 or email ecuisinefoods@gmail.com. The assistant should escalate order-specific issues, complaints, refunds, payment verification, sensitive allergy questions and anything it cannot confidently answer from the approved business information.', 110)
on conflict (title) do nothing;
