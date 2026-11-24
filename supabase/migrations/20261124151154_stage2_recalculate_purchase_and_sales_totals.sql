-- Keep purchase and offline-sale totals synchronized with their line items.
CREATE OR REPLACE FUNCTION public.stage2_recalculate_purchase_total()
RETURNS trigger LANGUAGE plpgsql SET search_path = ''
AS $function$
DECLARE v_id uuid;
BEGIN
 IF TG_OP='DELETE' THEN v_id:=OLD.purchase_id; ELSE v_id:=NEW.purchase_id; END IF;
 UPDATE public.supplier_purchases SET total_amount=COALESCE((SELECT sum(line_total) FROM public.supplier_purchase_items WHERE purchase_id=v_id),0),updated_at=now() WHERE id=v_id;
 IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END $function$;
DROP TRIGGER IF EXISTS stage2_purchase_total_trigger ON public.supplier_purchase_items;
CREATE TRIGGER stage2_purchase_total_trigger AFTER INSERT OR UPDATE OR DELETE ON public.supplier_purchase_items FOR EACH ROW EXECUTE FUNCTION public.stage2_recalculate_purchase_total();

CREATE OR REPLACE FUNCTION public.stage2_recalculate_manual_sale_total()
RETURNS trigger LANGUAGE plpgsql SET search_path = ''
AS $function$
DECLARE v_id uuid;
BEGIN
 IF TG_OP='DELETE' THEN v_id:=OLD.sale_id; ELSE v_id:=NEW.sale_id; END IF;
 UPDATE public.manual_sales SET total_amount=COALESCE((SELECT sum(line_total) FROM public.manual_sale_items WHERE sale_id=v_id),0),updated_at=now() WHERE id=v_id;
 IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END $function$;
DROP TRIGGER IF EXISTS stage2_manual_sale_total_trigger ON public.manual_sale_items;
CREATE TRIGGER stage2_manual_sale_total_trigger AFTER INSERT OR UPDATE OR DELETE ON public.manual_sale_items FOR EACH ROW EXECUTE FUNCTION public.stage2_recalculate_manual_sale_total();
