-- Switch home delivery from map polygons to a flat rate per supported destination.
-- Jos keeps its existing configured fee; Abuja starts at the same ₦2,000 rate and
-- can be adjusted by an owner/store manager in Admin > Delivery Setup.

do $migration$
declare
  v_jos_id uuid;
  v_abuja_id uuid;
begin
  select id into v_jos_id
  from public.delivery_zones
  where state = 'Plateau' and city = 'Jos'
  order by sort_order, created_at, id
  limit 1;

  if v_jos_id is null then
    insert into public.delivery_zones (
      state, city, area_name, delivery_fee, minimum_order_amount,
      estimated_days, instructions, is_active, sort_order, coverage_geojson
    ) values (
      'Plateau', 'Jos', 'All areas', 2000, 0,
      '24hrs', null, true, 0, null
    )
    returning id into v_jos_id;
  else
    update public.delivery_zones
    set area_name = 'All areas',
        coverage_geojson = null,
        is_active = true,
        updated_at = now()
    where id = v_jos_id;
  end if;

  select id into v_abuja_id
  from public.delivery_zones
  where state = 'Federal Capital Territory' and city = 'Abuja'
  order by sort_order, created_at, id
  limit 1;

  if v_abuja_id is null then
    insert into public.delivery_zones (
      state, city, area_name, delivery_fee, minimum_order_amount,
      estimated_days, instructions, is_active, sort_order, coverage_geojson
    ) values (
      'Federal Capital Territory', 'Abuja', 'All areas', 2000, 0,
      '24hrs', null, true, 1, null
    )
    returning id into v_abuja_id;
  else
    update public.delivery_zones
    set area_name = 'All areas',
        coverage_geojson = null,
        is_active = true,
        updated_at = now()
    where id = v_abuja_id;
  end if;

  -- Disable every other delivery area, including any legacy polygon areas.
  update public.delivery_zones
  set is_active = (id in (v_jos_id, v_abuja_id)),
      coverage_geojson = null,
      updated_at = now()
  where id not in (v_jos_id, v_abuja_id);
end;
$migration$;

-- The transactional order RPC continues to calculate the fee on the server.
-- It now resolves the submitted zone ID to one of the two approved flat-rate
-- destinations, rather than trusting a map pin or a client-supplied fee.
do $migration$
declare
  v_definition text;
  v_old_pin_logic text := $old$
v_lat:=nullif(p_order->>'delivery_latitude','')::numeric; v_lng:=nullif(p_order->>'delivery_longitude','')::numeric; if v_lat is null or v_lng is null or v_lat not between -90 and 90 or v_lng not between -180 and 180 then raise exception 'Choose your delivery location on the map.'; end if; v_street:=
$old$;
  v_new_delivery_logic text := $new$
v_zone_id:=nullif(p_order->>'delivery_zone_id','')::uuid; v_street:=
$new$;
  v_old_zone_lookup text := $old$
select z.id,z.state,z.city,z.area_name,z.delivery_fee,z.minimum_order_amount into v_zone_id,v_state,v_city,v_area,v_fee,v_minimum from public.delivery_zones z where z.is_active=true and z.coverage_geojson is not null and private.delivery_zone_covers_point(z.coverage_geojson,v_lat,v_lng) order by z.sort_order,z.created_at,z.id limit 1; if not found then raise exception 'We do not currently deliver to the map pin you selected. Please choose another location or contact eCuisine.'; end if;
$old$;
  v_new_zone_lookup text := $new$
select z.id,z.state,z.city,z.area_name,z.delivery_fee,z.minimum_order_amount into v_zone_id,v_state,v_city,v_area,v_fee,v_minimum from public.delivery_zones z where z.id=v_zone_id and z.is_active=true and ((z.state='Plateau' and z.city='Jos') or (z.state='Federal Capital Territory' and z.city='Abuja')) limit 1; if not found then raise exception 'Home delivery is currently available only in Jos and Abuja. Please select an available delivery destination.'; end if;
$new$;
begin
  v_definition := pg_get_functiondef('public.create_order_request(jsonb)'::regprocedure);

  if position(v_old_pin_logic in v_definition) = 0
     or position(v_old_zone_lookup in v_definition) = 0 then
    raise exception 'Could not safely locate the existing map-based delivery logic. No order RPC changes were applied.';
  end if;

  v_definition := replace(v_definition, v_old_pin_logic, v_new_delivery_logic);
  v_definition := replace(v_definition, v_old_zone_lookup, v_new_zone_lookup);

  if position('delivery_zone_covers_point' in v_definition) > 0
     or position('Choose your delivery location on the map.' in v_definition) > 0
     or position('z.id=v_zone_id' in v_definition) = 0 then
    raise exception 'Flat-rate delivery RPC validation failed. No order RPC changes were applied.';
  end if;

  execute v_definition;
end;
$migration$;
