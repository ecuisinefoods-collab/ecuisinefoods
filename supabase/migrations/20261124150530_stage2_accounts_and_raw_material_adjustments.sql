-- Account-linked raw-material stock corrections.
CREATE OR REPLACE FUNCTION public.stage2_adjust_raw_material(p_material_id uuid,p_quantity_delta numeric,p_reason text)
RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE v_new numeric(14,3); v_uid uuid:=auth.uid();
BEGIN
 IF v_uid IS NULL OR NOT private.has_admin_role(ARRAY['owner']::text[]) THEN RAISE EXCEPTION 'Only the Founder can adjust raw-material stock.'; END IF;
 IF p_quantity_delta=0 OR NULLIF(btrim(COALESCE(p_reason,'')),'') IS NULL THEN RAISE EXCEPTION 'Enter a non-zero quantity and a reason.'; END IF;
 UPDATE public.raw_materials SET quantity_on_hand=quantity_on_hand+p_quantity_delta,updated_at=now()
 WHERE id=p_material_id AND quantity_on_hand+p_quantity_delta>=0 RETURNING quantity_on_hand INTO v_new;
 IF NOT FOUND THEN RAISE EXCEPTION 'Material not found or adjustment would make stock negative.'; END IF;
 INSERT INTO public.raw_material_movements(material_id,movement_type,quantity_change,reason,created_by)
 VALUES(p_material_id,'adjustment',p_quantity_delta,p_reason,v_uid);
 INSERT INTO public.admin_audit_logs(actor_user_id,action,resource_type,resource_id,details)
 VALUES(v_uid,'adjust_raw_material_stock','raw_material',p_material_id::text,jsonb_build_object('quantity_delta',p_quantity_delta,'reason',p_reason));
 RETURN v_new;
END $function$;
REVOKE ALL ON FUNCTION public.stage2_adjust_raw_material(uuid,numeric,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.stage2_adjust_raw_material(uuid,numeric,text) TO authenticated;
