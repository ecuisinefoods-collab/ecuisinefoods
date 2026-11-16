alter table public.orders add column if not exists customer_user_id uuid references auth.users(id) on delete set null;
create index if not exists orders_customer_user_id_created_at_idx on public.orders(customer_user_id, created_at desc);

create table if not exists public.customer_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.customer_profiles enable row level security;
grant select, insert, update on public.customer_profiles to authenticated;

drop policy if exists "Customers read own profile" on public.customer_profiles;
create policy "Customers read own profile" on public.customer_profiles for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "Customers create own profile" on public.customer_profiles;
create policy "Customers create own profile" on public.customer_profiles for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists "Customers update own profile" on public.customer_profiles;
create policy "Customers update own profile" on public.customer_profiles for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists "Customers read own orders" on public.orders;
create policy "Customers read own orders" on public.orders for select to authenticated using (customer_user_id = (select auth.uid()));
drop policy if exists "Customers read own order items" on public.order_items;
create policy "Customers read own order items" on public.order_items for select to authenticated using (exists (select 1 from public.orders o where o.id = order_items.order_id and o.customer_user_id = (select auth.uid())));

create or replace function public.claim_my_guest_orders()
returns integer language plpgsql security definer set search_path = ''
as $function$
declare v_user_id uuid := auth.uid(); v_email text; v_confirmed_at timestamptz; v_claimed integer := 0;
begin
  if v_user_id is null then raise exception 'Sign in before linking previous orders.'; end if;
  select u.email, u.email_confirmed_at into v_email, v_confirmed_at from auth.users u where u.id = v_user_id;
  if v_email is null or v_confirmed_at is null then raise exception 'Confirm your email address before linking previous orders.'; end if;
  update public.orders set customer_user_id = v_user_id, updated_at = now() where customer_user_id is null and email is not null and lower(btrim(email)) = lower(btrim(v_email));
  get diagnostics v_claimed = row_count;
  return v_claimed;
end;
$function$;
revoke all on function public.claim_my_guest_orders() from public;
revoke execute on function public.claim_my_guest_orders() from anon;
grant execute on function public.claim_my_guest_orders() to authenticated;

CREATE OR REPLACE FUNCTION public.create_order_request(p_order jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 v_name text; v_phone text; v_email text; v_method text; v_notes text; v_pickup_id uuid; v_pickup_city text; v_pickup_name text; v_zone_id uuid; v_state text; v_city text; v_area text; v_street text; v_landmark text;
 v_fee numeric:=0; v_minimum numeric:=0; v_subtotal numeric:=0; v_total numeric:=0; v_discount numeric:=0;
 v_coupon_id uuid; v_coupon_code text; v_coupon_type text; v_coupon_value numeric; v_coupon_min numeric; v_coupon_cap numeric; v_coupon_limit integer; v_coupon_count integer; v_coupon_start timestamptz; v_coupon_end timestamptz; v_coupon_active boolean;
 v_payment_method text; v_payment_status text; v_payment_reference text; v_payment_setting text;
 v_order_id uuid; v_order_number bigint; v_tracking_code text; v_token_hash text; v_item jsonb; v_variant_id uuid; v_quantity integer; v_price numeric; v_product_id uuid; v_product_name text; v_pack_size text; v_seen uuid[]:=array[]::uuid[]; v_saved_items jsonb:='[]'::jsonb;
begin
 if p_order is null or jsonb_typeof(p_order)<>'object' then raise exception 'Invalid order request.'; end if;
 v_name:=btrim(coalesce(p_order->>'customer_name','')); v_phone:=btrim(coalesce(p_order->>'phone','')); v_email:=nullif(btrim(coalesce(p_order->>'email','')),''); v_method:=coalesce(p_order->>'fulfillment_method',''); v_notes:=nullif(btrim(coalesce(p_order->>'order_notes','')),'');
 v_payment_method:=case when p_order ? 'payment_method' then nullif(p_order->>'payment_method','') else 'whatsapp' end;
 if length(v_name)<2 or length(v_name)>120 then raise exception 'Enter a valid customer name.'; end if;
 if v_phone !~ '^[0-9+() -]{7,24}$' then raise exception 'Enter a valid phone number.'; end if;
 if v_email is not null and (length(v_email)>254 or v_email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$') then raise exception 'Enter a valid email address.'; end if;
 if v_method not in ('pickup','delivery') then raise exception 'Choose pickup or home delivery.'; end if;
 if v_payment_method is null or v_payment_method not in ('bank_transfer','cash','cash_on_delivery','whatsapp') then raise exception 'Choose a valid payment method.'; end if;
 if v_payment_method='cash' and v_method<>'pickup' then raise exception 'Cash payment is available for pickup orders only.'; end if;
 if v_payment_method='cash_on_delivery' and v_method<>'delivery' then raise exception 'Cash on delivery is available for delivery orders only.'; end if;
 v_payment_status:=case when v_payment_method='bank_transfer' then 'pending' else 'unpaid' end;
 if v_payment_method='bank_transfer' then
  select setting_value into v_payment_setting from public.site_settings where setting_key='payment_bank_transfer_enabled';
  if coalesce(v_payment_setting,'false')<>'true' then raise exception 'Bank transfer is not enabled for this store.'; end if;
  select setting_value into v_payment_setting from public.site_settings where setting_key='payment_bank_name';
  if coalesce(v_payment_setting,'')='' then raise exception 'Bank transfer is not configured for this store.'; end if;
  select setting_value into v_payment_setting from public.site_settings where setting_key='payment_account_name';
  if coalesce(v_payment_setting,'')='' then raise exception 'Bank transfer is not configured for this store.'; end if;
  select setting_value into v_payment_setting from public.site_settings where setting_key='payment_account_number';
  if v_payment_setting is null or length(v_payment_setting)<>10 or v_payment_setting ~ '[^0-9]' then raise exception 'Bank transfer is not configured for this store.'; end if;
  v_payment_reference:='ECU-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,12));
 end if;
 if v_payment_method='cash' then
  select setting_value into v_payment_setting from public.site_settings where setting_key='payment_cash_pickup_enabled';
  if coalesce(v_payment_setting,'true')<>'true' then raise exception 'Cash on pickup is currently unavailable. Choose another payment method.'; end if;
 end if;
 if v_payment_method='cash_on_delivery' then
  select setting_value into v_payment_setting from public.site_settings where setting_key='payment_cash_delivery_enabled';
  if coalesce(v_payment_setting,'true')<>'true' then raise exception 'Cash on delivery is currently unavailable. Choose another payment method.'; end if;
 end if;
 if coalesce(jsonb_typeof(p_order->'items'),'')<>'array' or jsonb_array_length(p_order->'items')<1 or jsonb_array_length(p_order->'items')>40 then raise exception 'Your cart is empty or contains too many line items.'; end if;
 for v_item in select value from jsonb_array_elements(p_order->'items') loop
  v_variant_id:=nullif(v_item->>'variant_id','')::uuid; v_quantity:=nullif(v_item->>'quantity','')::integer;
  if v_variant_id is null or v_quantity is null or v_quantity<1 or v_quantity>100 then raise exception 'One or more cart items are invalid.'; end if;
  if v_variant_id=any(v_seen) then raise exception 'Your cart contains a duplicate pack size. Please refresh your cart and try again.'; end if; v_seen:=array_append(v_seen,v_variant_id);
  select case when v.sale_price is not null and (v.sale_starts_at is null or v.sale_starts_at<=now()) and (v.sale_ends_at is null or v.sale_ends_at>now()) then v.sale_price else v.price end,v.product_id,p.name,v.pack_size into v_price,v_product_id,v_product_name,v_pack_size from public.product_variants v join public.products p on p.id=v.product_id where v.id=v_variant_id and p.is_active=true and v.stock_quantity>=v_quantity for update of v;
  if not found then raise exception 'A selected product is no longer available in the requested quantity. Please review your cart.'; end if;
  v_subtotal:=v_subtotal+v_price*v_quantity; v_saved_items:=v_saved_items||jsonb_build_array(jsonb_build_object('variant_id',v_variant_id,'product_id',v_product_id,'product_name',v_product_name,'pack_size',v_pack_size,'unit_price',v_price,'quantity',v_quantity,'line_total',v_price*v_quantity));
 end loop;
 if v_method='pickup' then
  v_pickup_id:=nullif(p_order->>'pickup_location_id','')::uuid; select city,location_name into v_pickup_city,v_pickup_name from public.pickup_locations where id=v_pickup_id and is_active=true; if not found then raise exception 'That pickup location is no longer available. Please choose another location.'; end if;
 else
  v_zone_id:=nullif(p_order->>'delivery_zone_id','')::uuid; v_street:=btrim(coalesce(p_order->>'street_address','')); v_landmark:=nullif(btrim(coalesce(p_order->>'house_number_landmark','')),''); if length(v_street)<4 or length(v_street)>240 then raise exception 'Enter a complete street address.'; end if;
  select state,city,area_name,delivery_fee,minimum_order_amount into v_state,v_city,v_area,v_fee,v_minimum from public.delivery_zones where id=v_zone_id and is_active=true; if not found then raise exception 'That delivery area is no longer available.'; end if; if v_subtotal<v_minimum then raise exception 'This delivery area requires a minimum order of ₦% .',v_minimum; end if;
 end if;
 v_coupon_code:=nullif(upper(btrim(coalesce(p_order->>'coupon_code',''))),'');
 if v_coupon_code is not null then
  select id,discount_type,discount_value,min_order_amount,max_discount_amount,usage_limit,usage_count,starts_at,ends_at,is_active into v_coupon_id,v_coupon_type,v_coupon_value,v_coupon_min,v_coupon_cap,v_coupon_limit,v_coupon_count,v_coupon_start,v_coupon_end,v_coupon_active from public.coupons where code=v_coupon_code for update;
  if not found or not v_coupon_active then raise exception 'This coupon is invalid or inactive.'; end if;
  if v_coupon_start is not null and v_coupon_start>now() then raise exception 'This coupon is not active yet.'; end if;
  if v_coupon_end is not null and v_coupon_end<=now() then raise exception 'This coupon has expired.'; end if;
  if v_coupon_limit is not null and v_coupon_count>=v_coupon_limit then raise exception 'This coupon has reached its usage limit.'; end if;
  if v_subtotal<v_coupon_min then raise exception 'This coupon requires a minimum order of ₦% .',v_coupon_min; end if;
  if v_coupon_type='percentage' then v_discount:=v_subtotal*v_coupon_value/100; else v_discount:=least(v_coupon_value,v_subtotal); end if;
  if v_coupon_cap is not null then v_discount:=least(v_discount,v_coupon_cap); end if; v_discount:=least(greatest(v_discount,0),v_subtotal);
  update public.coupons set usage_count=usage_count+1,updated_at=now() where id=v_coupon_id;
 end if;
 v_total:=greatest(0,v_subtotal+v_fee-v_discount); v_tracking_code:=lower(replace(gen_random_uuid()::text||gen_random_uuid()::text,'-','')); v_token_hash:=md5(v_tracking_code);
 insert into public.orders(customer_user_id,customer_name,phone,email,fulfillment_method,pickup_location_id,pickup_city,pickup_location_name,delivery_zone_id,delivery_state,delivery_city,delivery_area,street_address,house_number_landmark,order_notes,status,subtotal,delivery_fee,discount_amount,coupon_id,coupon_code,total,payment_status,payment_method,payment_reference,tracking_token_hash,stock_committed)
 values(auth.uid(),v_name,v_phone,v_email,v_method,v_pickup_id,v_pickup_city,v_pickup_name,v_zone_id,v_state,v_city,v_area,v_street,v_landmark,v_notes,'New',v_subtotal,v_fee,v_discount,v_coupon_id,v_coupon_code,v_total,v_payment_status,v_payment_method,v_payment_reference,v_token_hash,false) returning id,order_number into v_order_id,v_order_number;
 for v_item in select value from jsonb_array_elements(v_saved_items) loop
  insert into public.order_items(order_id,product_id,variant_id,product_name,pack_size,quantity,unit_price,line_total) values(v_order_id,(v_item->>'product_id')::uuid,(v_item->>'variant_id')::uuid,v_item->>'product_name',v_item->>'pack_size',(v_item->>'quantity')::integer,(v_item->>'unit_price')::numeric,(v_item->>'line_total')::numeric);
 end loop;
 return jsonb_build_object('order_number',v_order_number,'tracking_code',v_tracking_code,'subtotal',v_subtotal,'delivery_fee',v_fee,'discount_amount',v_discount,'coupon_code',v_coupon_code,'total',v_total,'payment_method',v_payment_method,'payment_status',v_payment_status,'payment_reference',v_payment_reference);
end;$function$