alter table public.delivery_zones
  add column coverage_geojson jsonb;

alter table public.delivery_zones
  add constraint delivery_zones_coverage_geojson_polygon
  check (
    coverage_geojson is null
    or (
      jsonb_typeof(coverage_geojson) = 'object'
      and coverage_geojson->>'type' = 'Polygon'
    )
  );

create or replace function private.delivery_zone_covers_point(
  p_geojson jsonb,
  p_lat numeric,
  p_lng numeric
)
returns boolean
language plpgsql
immutable
set search_path = ''
as $function$
declare
  v_ring jsonb;
  v_count integer;
  v_i integer;
  v_j integer;
  v_x1 double precision;
  v_y1 double precision;
  v_x2 double precision;
  v_y2 double precision;
  v_inside boolean := false;
  v_cross double precision;
begin
  if p_geojson is null or p_lat is null or p_lng is null
     or p_lat < -90 or p_lat > 90 or p_lng < -180 or p_lng > 180
     or p_geojson->>'type' is distinct from 'Polygon' then
    return false;
  end if;
  if jsonb_typeof(p_geojson->'coordinates') is distinct from 'array' then return false; end if;
  if jsonb_array_length(p_geojson->'coordinates') < 1 then return false; end if;

  v_ring := p_geojson->'coordinates'->0;
  if jsonb_typeof(v_ring) is distinct from 'array' then return false; end if;
  v_count := jsonb_array_length(v_ring);
  if v_count < 4 then return false; end if;

  if (v_ring->0->>0)::double precision <> (v_ring->(v_count - 1)->>0)::double precision
     or (v_ring->0->>1)::double precision <> (v_ring->(v_count - 1)->>1)::double precision then
    return false;
  end if;

  for v_i in 0..(v_count - 2) loop
    v_j := v_i + 1;
    if jsonb_typeof(v_ring->v_i) is distinct from 'array'
       or jsonb_typeof(v_ring->v_j) is distinct from 'array' then
      return false;
    end if;
    if jsonb_array_length(v_ring->v_i) < 2 or jsonb_array_length(v_ring->v_j) < 2 then
      return false;
    end if;

    v_x1 := (v_ring->v_i->>0)::double precision;
    v_y1 := (v_ring->v_i->>1)::double precision;
    v_x2 := (v_ring->v_j->>0)::double precision;
    v_y2 := (v_ring->v_j->>1)::double precision;

    if v_x1 < -180 or v_x1 > 180 or v_x2 < -180 or v_x2 > 180
       or v_y1 < -90 or v_y1 > 90 or v_y2 < -90 or v_y2 > 90 then
      return false;
    end if;

    v_cross := (p_lng::double precision - v_x1) * (v_y2 - v_y1)
             - (p_lat::double precision - v_y1) * (v_x2 - v_x1);
    if abs(v_cross) < 1e-10
       and p_lng::double precision between least(v_x1, v_x2) and greatest(v_x1, v_x2)
       and p_lat::double precision between least(v_y1, v_y2) and greatest(v_y1, v_y2) then
      return true;
    end if;

    if ((v_y1 > p_lat::double precision) <> (v_y2 > p_lat::double precision))
       and p_lng::double precision < ((v_x2 - v_x1) * (p_lat::double precision - v_y1)) / nullif(v_y2 - v_y1, 0) + v_x1 then
      v_inside := not v_inside;
    end if;
  end loop;

  return v_inside;
exception when others then
  return false;
end;
$function$;

revoke all on function private.delivery_zone_covers_point(jsonb, numeric, numeric) from public, anon, authenticated;

do $migration$
declare
  v_definition text;
begin
  v_definition := pg_get_functiondef('public.create_order_request(jsonb)'::regprocedure);

  v_definition := replace(
    v_definition,
    'v_zone_id:=nullif(p_order->>''delivery_zone_id'','''')::uuid; v_lat:=nullif(p_order->>''delivery_latitude'','''')::numeric; v_lng:=nullif(p_order->>''delivery_longitude'','''')::numeric; if v_lat is null or v_lng is null or v_lat not between -90 and 90 or v_lng not between -180 and 180 then raise exception ''Choose your delivery location on the map.''; end if; v_street:=',
    'v_lat:=nullif(p_order->>''delivery_latitude'','''')::numeric; v_lng:=nullif(p_order->>''delivery_longitude'','''')::numeric; if v_lat is null or v_lng is null or v_lat not between -90 and 90 or v_lng not between -180 and 180 then raise exception ''Choose your delivery location on the map.''; end if; v_street:='
  );

  v_definition := replace(
    v_definition,
    'select state,city,area_name,delivery_fee,minimum_order_amount into v_state,v_city,v_area,v_fee,v_minimum from public.delivery_zones where id=v_zone_id and is_active=true; if not found then raise exception ''That delivery area is no longer available.''; end if;',
    'select z.id,z.state,z.city,z.area_name,z.delivery_fee,z.minimum_order_amount into v_zone_id,v_state,v_city,v_area,v_fee,v_minimum from public.delivery_zones z where z.is_active=true and z.coverage_geojson is not null and private.delivery_zone_covers_point(z.coverage_geojson,v_lat,v_lng) order by z.sort_order,z.created_at,z.id limit 1; if not found then raise exception ''We do not currently deliver to the map pin you selected. Please choose another location or contact eCuisine.''; end if;'
  );

  if position('private.delivery_zone_covers_point(z.coverage_geojson,v_lat,v_lng)' in v_definition) = 0
     or position('v_lat:=nullif(p_order->>''delivery_latitude''' in v_definition) = 0 then
    raise exception 'Could not safely update create_order_request for mapped delivery coverage.';
  end if;

  execute v_definition;
end;
$migration$;
