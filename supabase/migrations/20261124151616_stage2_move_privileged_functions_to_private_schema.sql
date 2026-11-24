-- Keep privileged business operations out of the exposed public schema.
ALTER FUNCTION public.stage2_adjust_raw_material(uuid,numeric,text) SET SCHEMA private;
ALTER FUNCTION private.stage2_adjust_raw_material(uuid,numeric,text) RENAME TO stage2_adjust_raw_material_impl;
ALTER FUNCTION public.stage2_complete_manual_return(uuid) SET SCHEMA private;
ALTER FUNCTION private.stage2_complete_manual_return(uuid) RENAME TO stage2_complete_manual_return_impl;
ALTER FUNCTION public.stage2_complete_manual_sale(uuid) SET SCHEMA private;
ALTER FUNCTION private.stage2_complete_manual_sale(uuid) RENAME TO stage2_complete_manual_sale_impl;
ALTER FUNCTION public.stage2_complete_production(uuid,integer,numeric) SET SCHEMA private;
ALTER FUNCTION private.stage2_complete_production(uuid,integer,numeric) RENAME TO stage2_complete_production_impl;
ALTER FUNCTION public.stage2_receive_purchase(uuid) SET SCHEMA private;
ALTER FUNCTION private.stage2_receive_purchase(uuid) RENAME TO stage2_receive_purchase_impl;
ALTER FUNCTION public.stage2_record_manual_sale_payment(uuid,numeric,date,text,text,uuid) SET SCHEMA private;
ALTER FUNCTION private.stage2_record_manual_sale_payment(uuid,numeric,date,text,text,uuid) RENAME TO stage2_record_manual_sale_payment_impl;
ALTER FUNCTION public.stage2_record_supplier_payment(uuid,numeric,date,text,text,uuid) SET SCHEMA private;
ALTER FUNCTION private.stage2_record_supplier_payment(uuid,numeric,date,text,text,uuid) RENAME TO stage2_record_supplier_payment_impl;
GRANT USAGE ON SCHEMA private TO authenticated;
REVOKE ALL ON FUNCTION private.stage2_adjust_raw_material_impl(uuid,numeric,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION private.stage2_complete_manual_return_impl(uuid) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION private.stage2_complete_manual_sale_impl(uuid) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION private.stage2_complete_production_impl(uuid,integer,numeric) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION private.stage2_receive_purchase_impl(uuid) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION private.stage2_record_manual_sale_payment_impl(uuid,numeric,date,text,text,uuid) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION private.stage2_record_supplier_payment_impl(uuid,numeric,date,text,text,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.stage2_adjust_raw_material_impl(uuid,numeric,text) TO authenticated;
GRANT EXECUTE ON FUNCTION private.stage2_complete_manual_return_impl(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.stage2_complete_manual_sale_impl(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.stage2_complete_production_impl(uuid,integer,numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION private.stage2_receive_purchase_impl(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.stage2_record_manual_sale_payment_impl(uuid,numeric,date,text,text,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.stage2_record_supplier_payment_impl(uuid,numeric,date,text,text,uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.stage2_adjust_raw_material(p_material_id uuid,p_quantity_delta numeric,p_reason text)
RETURNS numeric LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $function$ SELECT private.stage2_adjust_raw_material_impl(p_material_id,p_quantity_delta,p_reason) $function$;
CREATE OR REPLACE FUNCTION public.stage2_complete_manual_return(p_return_id uuid)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $function$ SELECT private.stage2_complete_manual_return_impl(p_return_id) $function$;
CREATE OR REPLACE FUNCTION public.stage2_complete_manual_sale(p_sale_id uuid)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $function$ SELECT private.stage2_complete_manual_sale_impl(p_sale_id) $function$;
CREATE OR REPLACE FUNCTION public.stage2_complete_production(p_batch_id uuid,p_produced_quantity integer,p_wastage numeric DEFAULT 0)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $function$ SELECT private.stage2_complete_production_impl(p_batch_id,p_produced_quantity,p_wastage) $function$;
CREATE OR REPLACE FUNCTION public.stage2_receive_purchase(p_purchase_id uuid)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $function$ SELECT private.stage2_receive_purchase_impl(p_purchase_id) $function$;
CREATE OR REPLACE FUNCTION public.stage2_record_manual_sale_payment(p_sale_id uuid,p_amount numeric,p_payment_date date,p_payment_method text,p_reference text DEFAULT NULL,p_account_id uuid DEFAULT NULL)
RETURNS uuid LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $function$ SELECT private.stage2_record_manual_sale_payment_impl(p_sale_id,p_amount,p_payment_date,p_payment_method,p_reference,p_account_id) $function$;
CREATE OR REPLACE FUNCTION public.stage2_record_supplier_payment(p_purchase_id uuid,p_amount numeric,p_payment_date date,p_payment_method text,p_reference text DEFAULT NULL,p_account_id uuid DEFAULT NULL)
RETURNS uuid LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $function$ SELECT private.stage2_record_supplier_payment_impl(p_purchase_id,p_amount,p_payment_date,p_payment_method,p_reference,p_account_id) $function$;
REVOKE ALL ON FUNCTION public.stage2_adjust_raw_material(uuid,numeric,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.stage2_complete_manual_return(uuid) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.stage2_complete_manual_sale(uuid) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.stage2_complete_production(uuid,integer,numeric) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.stage2_receive_purchase(uuid) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.stage2_record_manual_sale_payment(uuid,numeric,date,text,text,uuid) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.stage2_record_supplier_payment(uuid,numeric,date,text,text,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.stage2_adjust_raw_material(uuid,numeric,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.stage2_complete_manual_return(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.stage2_complete_manual_sale(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.stage2_complete_production(uuid,integer,numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.stage2_receive_purchase(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.stage2_record_manual_sale_payment(uuid,numeric,date,text,text,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.stage2_record_supplier_payment(uuid,numeric,date,text,text,uuid) TO authenticated;
