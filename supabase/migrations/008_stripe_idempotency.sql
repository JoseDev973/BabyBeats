-- Stripe retries webhooks; one credit grant per checkout session.
-- Additive — safe to apply before deploy.
CREATE UNIQUE INDEX IF NOT EXISTS credit_transactions_stripe_payment_id_key
  ON credit_transactions (stripe_payment_id) WHERE stripe_payment_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS gifts_stripe_payment_id_key
  ON gifts (stripe_payment_id) WHERE stripe_payment_id IS NOT NULL;
