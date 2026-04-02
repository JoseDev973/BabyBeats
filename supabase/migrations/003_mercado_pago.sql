-- Add Mercado Pago payment ID to credit transactions
alter table credit_transactions
  add column if not exists mp_payment_id text;
