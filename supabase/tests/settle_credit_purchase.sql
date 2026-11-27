-- Run against a migrated local Supabase database. Fixtures roll back.
BEGIN;
DO $$
DECLARE
  buyer uuid := gen_random_uuid();
  receipt text := gen_random_uuid()::text;
  function_name text := 'public.settle_credit_purchase(text,text,uuid,integer,text)';
BEGIN
  ASSERT has_function_privilege('service_role', function_name, 'execute');
  ASSERT NOT has_function_privilege('anon', function_name, 'execute');
  ASSERT NOT has_function_privilege('authenticated', function_name, 'execute');

  INSERT INTO auth.users (id) VALUES (buyer);
  UPDATE public.profiles SET credits = 0 WHERE id = buyer;

  ASSERT public.settle_credit_purchase('stripe', receipt, buyer, 3, 'Starter');
  ASSERT NOT public.settle_credit_purchase('stripe', receipt, buyer, 3, 'Starter');
  ASSERT public.settle_credit_purchase('mercado_pago', receipt, buyer, 10, 'Family');
  ASSERT (SELECT credits = 13 FROM public.profiles WHERE id = buyer);
  ASSERT (SELECT count(*) = 2 FROM public.credit_transactions WHERE user_id = buyer AND type = 'purchase');

  -- If the balance write fails after the receipt insert, a retry must still apply it.
  UPDATE public.profiles SET credits = 2147483647 WHERE id = buyer;
  BEGIN
    PERFORM public.settle_credit_purchase('stripe', receipt || '-retry', buyer, 1, 'Retry');
    RAISE EXCEPTION 'Expected overflow on balance update';
  EXCEPTION WHEN numeric_value_out_of_range THEN NULL;
  END;
  ASSERT NOT EXISTS (
    SELECT 1 FROM public.credit_transactions WHERE stripe_payment_id = receipt || '-retry'
  );
  UPDATE public.profiles SET credits = 13 WHERE id = buyer;
  ASSERT public.settle_credit_purchase('stripe', receipt || '-retry', buyer, 1, 'Retry');
  ASSERT (SELECT credits = 14 FROM public.profiles WHERE id = buyer);
END;
$$;
ROLLBACK;
