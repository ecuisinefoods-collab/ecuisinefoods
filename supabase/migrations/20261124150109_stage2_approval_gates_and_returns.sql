-- Founder approval gates, production costing and return/refund processing.
ALTER TABLE public.production_batches ADD COLUMN IF NOT EXISTS production_staff text;
ALTER TABLE public.production_batches ADD COLUMN IF NOT EXISTS overhead_cost numeric(14,2) NOT NULL DEFAULT 0 CHECK(overhead_cost>=0);
CREATE OR REPLACE FUNCTION public.stage2_complete_manual_return(p_return_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE v_return public.manual_sale_returns%ROWTYPE; v_item record; v_sale public.manual_sales%ROWTYPE; v_tx uuid; v_uid uuid:=auth.uid(); v_already integer;
BEGIN
 IF v_uid IS NULL OR NOT private.has_admin_role(ARRAY['owner']::text[]) THEN RAISE EXCEPTION 'Only the Founder can approve and process returns.'; END IF;
 SELECT * INTO v_return FROM public.manual_sale_returns WHERE id=p_return_id FOR UPDATE;
 IF NOT FOUND OR v_return.status<>'approved' THEN RAISE EXCEPTION 'Return must be approved before processing.'; END IF;
 SELECT * INTO v_sale FROM public.manual_sales WHERE id=v_return.sale_id FOR UPDATE;
 FOR v_item IN SELECT ri.*,si.variant_id,si.quantity AS sold_quantity FROM public.manual_sale_return_items ri JOIN public.manual_sale_items si ON si.id=ri.sale_item_id WHERE ri.return_id=p_return_id LOOP
  SELECT COALESCE(sum(pri.quantity),0) INTO v_already FROM public.manual_sale_return_items pri JOIN public.manual_sale_returns pr ON pr.id=pri.return_id
   WHERE pri.sale_item_id=v_item.sale_item_id AND pr.status='completed';
  IF v_already+v_item.quantity>v_item.sold_quantity THEN RAISE EXCEPTION 'Total returned quantity cannot exceed the quantity originally sold.'; END IF;
  UPDATE public.product_variants SET stock_quantity=stock_quantity+v_item.quantity WHERE id=v_item.variant_id;
  INSERT INTO public.inventory_movements(variant_id,movement_type,quantity_change,reason,created_by)
   VALUES(v_item.variant_id,'return',v_item.quantity,'Return for manual sale #'||v_sale.sale_number,v_uid);
 END LOOP;
 IF v_return.refund_amount>0 THEN
  IF v_return.refund_amount>COALESCE((SELECT sum(msp.amount) FROM public.manual_sale_payments msp JOIN public.financial_transactions ft ON ft.id=msp.financial_transaction_id WHERE msp.sale_id=v_sale.id AND ft.status='posted'),0)
   -COALESCE((SELECT sum(mr.refund_amount) FROM public.manual_sale_returns mr WHERE mr.sale_id=v_sale.id AND mr.status='completed'),0)
  THEN RAISE EXCEPTION 'Refund amount exceeds posted customer payments still available to refund.'; END IF;
  INSERT INTO public.financial_transactions(transaction_type,category,description,amount,transaction_date,reference,recorded_by,status,notes)
  VALUES('expense','Sales refund','Refund for manual sale #'||v_sale.sale_number||' — '||v_return.reason,v_return.refund_amount,v_return.return_date,'Manual return '||p_return_id,v_uid,'pending','Founder approval required before refund is posted')
  RETURNING id INTO v_tx;
 END IF;
 UPDATE public.manual_sale_returns SET status='completed',financial_transaction_id=v_tx WHERE id=p_return_id;
 UPDATE public.manual_sales SET status='partially_returned' WHERE id=v_return.sale_id AND status='completed';
 INSERT INTO public.admin_audit_logs(actor_user_id,action,resource_type,resource_id,details)
 VALUES(v_uid,'complete_manual_return','manual_sale_return',p_return_id::text,jsonb_build_object('sale_id',v_return.sale_id,'refund_amount',v_return.refund_amount,'financial_transaction_id',v_tx));
 RETURN jsonb_build_object('success',true,'refund_financial_transaction_id',v_tx);
END $function$;
REVOKE ALL ON FUNCTION public.stage2_complete_manual_return(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.stage2_complete_manual_return(uuid) TO authenticated;
