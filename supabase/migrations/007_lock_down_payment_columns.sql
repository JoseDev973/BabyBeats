-- Close holes that let a logged-in user bypass payment from the browser
-- (anon key + RLS "update own row" policies with no column restrictions).
--
-- DEPLOY ORDER: apply only AFTER the code that writes these columns through
-- the service-role client (getSupabaseAdmin) is live in production.
-- The service role bypasses both RLS and these grants.

-- ── profiles ────────────────────────────────────────────────────────────
-- Before: users could set their own credits / total_songs_generated.
REVOKE INSERT, UPDATE ON profiles FROM anon, authenticated;
GRANT UPDATE (display_name, avatar_url, preferred_language, updated_at)
  ON profiles TO authenticated;

-- ── credit_transactions ─────────────────────────────────────────────────
-- Ledger is written only by the server.
DROP POLICY IF EXISTS "Users can insert own transactions" ON credit_transactions;
REVOKE INSERT, UPDATE, DELETE ON credit_transactions FROM anon, authenticated;

-- ── gifts ───────────────────────────────────────────────────────────────
-- Before: anyone could SELECT every gift (child names, emails, delivery
-- tokens), and buyers could set status / total_songs / payment ids.
-- Gifts are now created by /api/checkout-mp/gift and status/payment are
-- written only by the server. Public pages read by token server-side.
DROP POLICY IF EXISTS "Public can view gifts by token" ON gifts;
DROP POLICY IF EXISTS "Anyone can view ready/delivered gifts by token" ON gifts;
DROP POLICY IF EXISTS "Users can create gifts" ON gifts;
DROP POLICY IF EXISTS "Users can insert their own gifts" ON gifts;
DROP POLICY IF EXISTS "Users can view their own gifts" ON gifts;

CREATE POLICY "Buyers can view their gifts"
  ON gifts FOR SELECT TO authenticated
  USING (buyer_id = auth.uid());

REVOKE INSERT, UPDATE, DELETE ON gifts FROM anon, authenticated;
GRANT UPDATE (child_name, language, delivery_mode, recipient_name, recipient_email, updated_at)
  ON gifts TO authenticated;

-- ── gift_songs ──────────────────────────────────────────────────────────
-- Buyers configure songs only while the gift is still being personalized,
-- and only the config columns (not lyrics / audio / status / suno_task_id).
DROP POLICY IF EXISTS "Public can view gift songs" ON gift_songs;
DROP POLICY IF EXISTS "Anyone can view songs of ready gifts" ON gift_songs;
DROP POLICY IF EXISTS "Users can manage gift songs" ON gift_songs;
DROP POLICY IF EXISTS "Users can view songs of their gifts" ON gift_songs;
DROP POLICY IF EXISTS "Users can insert songs for their gifts" ON gift_songs;
DROP POLICY IF EXISTS "Users can update songs of their gifts" ON gift_songs;

CREATE POLICY "Buyers can view their gift songs"
  ON gift_songs FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM gifts
    WHERE gifts.id = gift_songs.gift_id AND gifts.buyer_id = auth.uid()
  ));

CREATE POLICY "Buyers can configure songs while personalizing"
  ON gift_songs FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM gifts
    WHERE gifts.id = gift_songs.gift_id AND gifts.buyer_id = auth.uid()
      AND gifts.status IN ('draft', 'personalizing')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM gifts
    WHERE gifts.id = gift_songs.gift_id AND gifts.buyer_id = auth.uid()
      AND gifts.status IN ('draft', 'personalizing')
  ));

REVOKE INSERT, UPDATE ON gift_songs FROM anon, authenticated;
REVOKE DELETE ON gift_songs FROM anon;
GRANT INSERT (gift_id, position, theme, music_style, language, custom_prompt)
  ON gift_songs TO authenticated;
GRANT UPDATE (theme, music_style, language, custom_prompt)
  ON gift_songs TO authenticated;
