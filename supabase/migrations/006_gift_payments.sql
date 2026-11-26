-- #21: gifts must be paid before songs are generated.
-- Additive only — safe to apply before the code that uses it is deployed.

ALTER TABLE gifts ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
ALTER TABLE gifts ADD COLUMN IF NOT EXISTS mp_payment_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS gifts_mp_payment_id_key
  ON gifts (mp_payment_id) WHERE mp_payment_id IS NOT NULL;
