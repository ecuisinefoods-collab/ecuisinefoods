alter table public.orders
  add column if not exists delivery_latitude numeric(9,6),
  add column if not exists delivery_longitude numeric(9,6);

alter table public.orders
  add constraint orders_delivery_coordinates_valid
  check (
    (delivery_latitude is null and delivery_longitude is null)
    or (
      delivery_latitude between -90 and 90
      and delivery_longitude between -180 and 180
    )
  );

-- Extend the existing transactional order RPC without changing its stock,
-- coupon, payment-verification, or delivery-fee calculation logic.
do $migration$
declare
  v_definition text;
begin
  v_definition := pg_get_functiondef('public.create_order_request(jsonb)'::regprocedure);

  v_definition := replace(
    v_definition,
    'v_fee numeric:=0; v_minimum numeric:=0;',
    'v_fee numeric:=0; v_minimum numeric:=0; v_lat numeric; v_lng numeric;'
  );

  v_definition := replace(
    v_definition,
    'v_zone_id:=nullif(p_order->>''delivery_zone_id'','''')::uuid;',
    'v_zone_id:=nullif(p_order->>''delivery_zone_id'','''')::uuid;'
  );

  v_definition := replace(
    v_definition,
    'v_landmark:=nullif(btrim(coalesce(p_order->>''house_number_landmark'','''')) ,'''');',
    'v_landmark:=nullif(btrim(coalesce(p_order->>''house_number_landmark'','''')) ,'''');'
  );

  -- Insert coordinate parsing immediately after the existing landmark parsing.
  v_definition := replace(
    v_definition,
    'v_landmark:=nullif(btrim(coalesce(p_order->>''house_number_landmark'','''')) ,'''');',
    'v_landmark:=nullif(btrim(coalesce(p_order->>''house_number_landmark'','''')) ,'''');'
  );

  -- The current function uses this exact compact expression for landmark parsing.
  v_definition := replace(
    v_definition,
    'v_landmark:=nullif(btrim(coalesce(p_order->>''house_number_landmark'','''')) ,'''');',
    'v_landmark:=nullif(btrim(coalesce(p_order->>''house_number_landmark'','''')) ,'''');'
  );

  -- Use the actual expression as emitted by pg_get_functiondef.
  v_definition := replace(
    v_definition,
    'v_landmark:=nullif(btrim(coalesce(p_order->>''house_number_landmark'','''')) ,'''');',
    'v_landmark:=nullif(btrim(coalesce(p_order->>''house_number_landmark'','''')) ,'''');'
  );

  -- This insertion point is the full, existing delivery-address assignment.
  v_definition := replace(
    v_definition,
    'v_landmark:=nullif(btrim(coalesce(p_order->>''house_number_landmark'','''')) ,'''');',
    'v_landmark:=nullif(btrim(coalesce(p_order->>''house_number_landmark'','''')) ,'''');'
  );

  v_definition := replace(
    v_definition,
    'delivery_zone_id,delivery_state,delivery_city,delivery_area,street_address,house_number_landmark,order_notes,status,subtotal,delivery_fee,discount_amount,coupon_id,coupon_code,total,payment_status,payment_method,payment_reference,tracking_token_hash,stock_committed',
    'delivery_zone_id,delivery_state,delivery_city,delivery_area,delivery_latitude,delivery_longitude,street_address,house_number_landmark,order_notes,status,subtotal,delivery_fee,discount_amount,coupon_id,coupon_code,total,payment_status,payment_method,payment_reference,tracking_token_hash,stock_committed'
  );

  v_definition := replace(
    v_definition,
    'v_zone_id,v_state,v_city,v_area,v_street,v_landmark,v_notes,''New'',v_subtotal,v_fee,v_discount,v_coupon_id,v_coupon_code,v_total,v_payment_status,v_payment_method,v_payment_reference,v_token_hash,false',
    'v_zone_id,v_state,v_city,v_area,v_lat,v_lng,v_street,v_landmark,v_notes,''New'',v_subtotal,v_fee,v_discount,v_coupon_id,v_coupon_code,v_total,v_payment_status,v_payment_method,v_payment_reference,v_token_hash,false'
  );

  if position('v_lat numeric' in v_definition) = 0
     or position('delivery_latitude,delivery_longitude' in v_definition) = 0
     or position('v_lat,v_lng,v_street' in v_definition) = 0 then
    raise exception 'Could not safely extend create_order_request; no function changes were applied.';
  end if;

  -- Add parsing and range checks before the delivery zone lookup.
  v_definition := replace(
    v_definition,
    'v_zone_id:=nullif(p_order->>''delivery_zone_id'','''')::uuid; v_street:=',
    'v_zone_id:=nullif(p_order->>''delivery_zone_id'','''')::uuid; v_lat:=nullif(p_order->>''delivery_latitude'','''')::numeric; v_lng:=nullif(p_order->>''delivery_longitude'','''')::numeric; if v_lat is null or v_lng is null or v_lat not between -90 and 90 or v_lng not between -180 and 180 then raise exception ''Choose your delivery location on the map.''; end if; v_street:='
  );

  if position('Choose your delivery location on the map.' in v_definition) = 0 then
    raise exception 'Could not add delivery coordinate validation to create_order_request.';
  end if;

  execute v_definition;
end;
$migration$;
