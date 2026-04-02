CREATE UNIQUE INDEX IF NOT EXISTS idx_credit_tx_mp_payment_id
  ON credit_transactions(mp_payment_id)
  WHERE mp_payment_id IS NOT NULL;
