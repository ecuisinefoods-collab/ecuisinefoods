-- Supplier and manual-sale payment requests create pending Finance entries.
CREATE OR REPLACE FUNCTION public.stage2_record_supplier_payment(p_purchase_id uuid,p_amount numeric,p_payment_date date,p_payment_method text,p_reference text DEFAULT NULL,p_account_id uuid DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE v_purchase public.supplier_purchases%ROWTYPE; v_paid numeric(14,2); v_tx uuid; v_uid uuid:=auth.uid();
BEGIN
 IF v_uid IS NULL OR NOT private.has_admin_role(ARRAY['owner']::text[]) THEN RAISE EXCEPTION 'Only the Founder can record supplier payments.'; END IF;
 IF p_amount<=0 OR p_payment_method NOT IN ('cash','bank_transfer','pos','wallet','other') THEN RAISE EXCEPTION 'Enter a valid payment amount and method.'; END IF;
 IF p_account_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.finance_accounts WHERE id=p_account_id AND is_active) THEN RAISE EXCEPTION 'Choose an active finance account.'; END IF;
 SELECT * INTO v_purchase FROM public.supplier_purchases WHERE id=p_purchase_id FOR UPDATE;
 IF NOT FOUND OR v_purchase.status NOT IN ('received','approved') THEN RAISE EXCEPTION 'Only an approved or received purchase can be paid.'; END IF;
 SELECT COALESCE(sum(sp.amount),0) INTO v_paid FROM public.supplier_payments sp JOIN public.financial_transactions ft ON ft.id=sp.financial_transaction_id
 WHERE sp.purchase_id=p_purchase_id AND ft.status IN ('pending','posted');
 IF v_paid+p_amount>v_purchase.total_amount THEN RAISE EXCEPTION 'Payment exceeds the remaining supplier balance.'; END IF;
 INSERT INTO public.financial_transactions(transaction_type,category,description,amount,transaction_date,reference,recorded_by,status,notes,account_id)
 VALUES('expense','Supplier payment','Supplier payment for purchase #'||v_purchase.purchase_number,p_amount,p_payment_date,p_reference,v_uid,'pending','Pending Founder financial approval.',p_account_id) RETURNING id INTO v_tx;
 INSERT INTO public.supplier_payments(purchase_id,amount,payment_date,payment_method,reference,financial_transaction_id,created_by)
 VALUES(p_purchase_id,p_amount,p_payment_date,p_payment_method,p_reference,v_tx,v_uid);
 INSERT INTO public.admin_audit_logs(actor_user_id,action,resource_type,resource_id,details)
 VALUES(v_uid,'record_supplier_payment','supplier_purchase',p_purchase_id::text,jsonb_build_object('amount',p_amount,'financial_transaction_id',v_tx,'account_id',p_account_id));
 RETURN v_tx;
END $function$;
CREATE OR REPLACE FUNCTION public.stage2_record_manual_sale_payment(p_sale_id uuid,p_amount numeric,p_payment_date date,p_payment_method text,p_reference text DEFAULT NULL,p_account_id uuid DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE v_sale public.manual_sales%ROWTYPE; v_paid numeric(14,2); v_tx uuid; v_uid uuid:=auth.uid();
BEGIN
 IF v_uid IS NULL OR NOT private.has_admin_role(ARRAY['owner']::text[]) THEN RAISE EXCEPTION 'Only the Founder can record manual sale payments.'; END IF;
 IF p_amount<=0 OR p_payment_method NOT IN ('cash','bank_transfer','pos','wallet','other') THEN RAISE EXCEPTION 'Enter a valid payment amount and method.'; END IF;
 IF p_account_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.finance_accounts WHERE id=p_account_id AND is_active) THEN RAISE EXCEPTION 'Choose an active finance account.'; END IF;
 SELECT * INTO v_sale FROM public.manual_sales WHERE id=p_sale_id FOR UPDATE;
 IF NOT FOUND OR v_sale.status NOT IN ('approved','completed','partially_returned') THEN RAISE EXCEPTION 'Sale must be approved before payment is recorded.'; END IF;
 SELECT COALESCE(sum(msp.amount),0) INTO v_paid FROM public.manual_sale_payments msp JOIN public.financial_transactions ft ON ft.id=msp.financial_transaction_id
 WHERE msp.sale_id=p_sale_id AND ft.status IN ('pending','posted');
 IF v_paid+p_amount>v_sale.total_amount THEN RAISE EXCEPTION 'Payment exceeds the outstanding customer balance.'; END IF;
 INSERT INTO public.financial_transactions(transaction_type,category,description,amount,transaction_date,reference,recorded_by,status,notes,account_id)
 VALUES('income','Manual sales','Payment received for manual sale #'||v_sale.sale_number,p_amount,p_payment_date,p_reference,v_uid,'pending','Pending Founder financial approval.',p_account_id) RETURNING id INTO v_tx;
 INSERT INTO public.manual_sale_payments(sale_id,amount,payment_date,payment_method,reference,financial_transaction_id,created_by)
 VALUES(p_sale_id,p_amount,p_payment_date,p_payment_method,p_reference,v_tx,v_uid);
 INSERT INTO public.admin_audit_logs(actor_user_id,action,resource_type,resource_id,details)
 VALUES(v_uid,'record_manual_sale_payment','manual_sale',p_sale_id::text,jsonb_build_object('amount',p_amount,'financial_transaction_id',v_tx,'account_id',p_account_id));
 RETURN v_tx;
END $function$;
REVOKE ALL ON FUNCTION public.stage2_record_supplier_payment(uuid,numeric,date,text,text,uuid) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.stage2_record_manual_sale_payment(uuid,numeric,date,text,text,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.stage2_record_supplier_payment(uuid,numeric,date,text,text,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.stage2_record_manual_sale_payment(uuid,numeric,date,text,text,uuid) TO authenticated;
