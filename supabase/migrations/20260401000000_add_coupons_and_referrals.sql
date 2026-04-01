-- ============================================
-- Coupons table
-- ============================================
CREATE TABLE IF NOT EXISTS public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  discount_percent INTEGER,
  discount_amount DECIMAL(10, 2),
  max_uses INTEGER,
  current_uses INTEGER NOT NULL DEFAULT 0,
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- At least one discount type must be set
  CONSTRAINT coupons_discount_check CHECK (
    discount_percent IS NOT NULL OR discount_amount IS NOT NULL
  ),
  -- Percent must be between 1 and 100
  CONSTRAINT coupons_percent_range CHECK (
    discount_percent IS NULL OR (discount_percent >= 1 AND discount_percent <= 100)
  ),
  -- Amount must be positive
  CONSTRAINT coupons_amount_positive CHECK (
    discount_amount IS NULL OR discount_amount > 0
  )
);

-- Ensure codes are always stored uppercase
CREATE OR REPLACE FUNCTION public.coupons_uppercase_code()
RETURNS TRIGGER AS $$
BEGIN
  NEW.code := UPPER(TRIM(NEW.code));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER coupons_uppercase_code_trigger
  BEFORE INSERT OR UPDATE ON public.coupons
  FOR EACH ROW
  EXECUTE FUNCTION public.coupons_uppercase_code();

-- Index for fast code lookups
CREATE INDEX IF NOT EXISTS idx_coupons_code ON public.coupons (code);
CREATE INDEX IF NOT EXISTS idx_coupons_active ON public.coupons (is_active) WHERE is_active = true;

-- RLS
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- Anyone can read active coupons (needed for validation)
CREATE POLICY "Anyone can read active coupons"
  ON public.coupons FOR SELECT
  USING (is_active = true);

-- Only service role can insert/update/delete (admin operations)
-- No insert/update/delete policies for authenticated users

-- ============================================
-- Referrals table
-- ============================================
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_email TEXT,
  referral_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rewarded')),
  reward_credits INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for referral code lookups and user queries
CREATE UNIQUE INDEX IF NOT EXISTS idx_referrals_code_email
  ON public.referrals (referral_code, referred_email)
  WHERE referred_email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals (referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON public.referrals (referral_code);

-- RLS
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Users can read their own referrals
CREATE POLICY "Users can read own referrals"
  ON public.referrals FOR SELECT
  USING (auth.uid() = referrer_id);

-- Users can insert their own referrals
CREATE POLICY "Users can insert own referrals"
  ON public.referrals FOR INSERT
  WITH CHECK (auth.uid() = referrer_id);
