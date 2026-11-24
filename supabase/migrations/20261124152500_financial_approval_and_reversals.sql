-- Financial transaction approval and immutable posted-entry workflow.
ALTER TABLE public.financial_transactions
  ADD COLUMN IF NOT EXISTS reversal_of_id uuid
  REFERENCES public.financial_transactions(id) ON DELETE RESTRICT;

CREATE UNIQUE INDEX IF NOT EXISTS financial_transactions_one_reversal_per_entry
  ON public.financial_transactions(reversal_of_id)
  WHERE reversal_of_id IS NOT NULL;

DROP POLICY IF EXISTS "finance roles can update transactions" ON public.financial_transactions;
DROP POLICY IF EXISTS financial_transactions_owner_pending_update ON public.financial_transactions;
DROP POLICY IF EXISTS financial_transactions_finance_pending_update ON public.financial_transactions;

CREATE POLICY financial_transactions_owner_pending_update
  ON public.financial_transactions FOR UPDATE TO authenticated
  USING (status = 'pending' AND (SELECT private.has_admin_role(ARRAY['owner']::text[])))
  WITH CHECK (status IN ('pending','posted') AND (SELECT private.has_admin_role(ARRAY['owner']::text[])));

CREATE POLICY financial_transactions_finance_pending_update
  ON public.financial_transactions FOR UPDATE TO authenticated
  USING (status = 'pending' AND (SELECT private.has_admin_role(ARRAY['finance_officer']::text[])))
  WITH CHECK (status = 'pending' AND (SELECT private.has_admin_role(ARRAY['finance_officer']::text[])));

CREATE OR REPLACE FUNCTION public.protect_posted_financial_transaction()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $function$
BEGIN
  IF OLD.status = 'posted' THEN
    RAISE EXCEPTION 'Posted financial transactions cannot be edited. Create a linked reversal or adjustment entry.';
  END IF;
  IF OLD.status = 'void' THEN
    RAISE EXCEPTION 'Voided financial transactions cannot be edited.';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS protect_posted_financial_transaction_trigger ON public.financial_transactions;
CREATE TRIGGER protect_posted_financial_transaction_trigger
  BEFORE UPDATE ON public.financial_transactions
  FOR EACH ROW EXECUTE FUNCTION public.protect_posted_financial_transaction();

COMMENT ON COLUMN public.financial_transactions.reversal_of_id IS
  'Links a reversal entry to the original posted transaction. Original records remain unchanged.';
