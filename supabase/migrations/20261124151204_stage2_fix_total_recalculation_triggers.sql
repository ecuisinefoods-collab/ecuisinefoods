-- Correct trigger return handling for INSERT/UPDATE/DELETE on purchase and sale lines.
CREATE OR REPLACE FUNCTION public.stage2_recalculate_purchase_total()
RETURNS trigger LANGUAGE plpgsql SET search_path = ''
AS $function$
DECLARE v_id uuid;
BEGIN
 IF TG_OP='DELETE' THEN v_id:=OLD.purchase_id; ELSE v_id:=NEW.purchase_id; END IF;
 UPDATE public.supplier_purchases SET total_amount=COALESCE((SELECT sum(line_total) FROM public.supplier_purchase_items WHERE purchase_id=v_id),0),updated_at=now() WHERE id=v_id;
 IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END $function$;

CREATE OR REPLACE FUNCTION public.stage2_recalculate_manual_sale_total()
RETURNS trigger LANGUAGE plpgsql SET search_path = ''
AS $function$
DECLARE v_id uuid;
BEGIN
 IF TG_OP='DELETE' THEN v_id:=OLD.sale_id; ELSE v_id:=NEW.sale_id; END IF;
 UPDATE public.manual_sales SET total_amount=COALESCE((SELECT sum(line_total) FROM public.manual_sale_items WHERE sale_id=v_id),0),updated_at=now() WHERE id=v_id;
 IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END $function$;
