-- Apply before deploying the credit-pack webhooks.
CREATE OR REPLACE FUNCTION public.settle_credit_purchase(
  p_provider text,
  p_payment_id text,
  p_user_id uuid,
  p_credits integer,
  p_description text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF p_provider IS NULL OR p_provider NOT IN ('stripe', 'mercado_pago')
     OR nullif(btrim(p_payment_id), '') IS NULL
     OR p_user_id IS NULL OR p_credits IS NULL OR p_credits <= 0 THEN
    RAISE EXCEPTION 'Invalid credit purchase' USING ERRCODE = '22023';
  END IF;

  -- Existing receipts and concurrent deliveries share these provider-specific
  -- unique indexes (004 and 008). A failed balance update rolls back the receipt.
  INSERT INTO public.credit_transactions (
    user_id, amount, type, description, stripe_payment_id, mp_payment_id
  ) VALUES (
    p_user_id, p_credits, 'purchase', p_description,
    CASE WHEN p_provider = 'stripe' THEN p_payment_id END,
    CASE WHEN p_provider = 'mercado_pago' THEN p_payment_id END
  ) ON CONFLICT DO NOTHING;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  UPDATE public.profiles SET credits = coalesce(credits, 0) + p_credits
  WHERE id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Missing profile for credit purchase';
  END IF;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.settle_credit_purchase(text, text, uuid, integer, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.settle_credit_purchase(text, text, uuid, integer, text)
  TO service_role;
