-- Create gifts table
CREATE TABLE IF NOT EXISTS gifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID REFERENCES auth.users(id),
  recipient_name TEXT,
  recipient_email TEXT,
  child_name TEXT NOT NULL,
  pack_type TEXT NOT NULL CHECK (pack_type IN ('first_album', 'sweet_dreams', 'learning', 'custom')),
  total_songs INTEGER NOT NULL,
  language TEXT NOT NULL DEFAULT 'es',
  delivery_mode TEXT NOT NULL CHECK (delivery_mode IN ('link', 'redeem')),
  delivery_token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'personalizing', 'generating', 'ready', 'delivered', 'redeemed')),
  stripe_payment_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create gift_songs table
CREATE TABLE IF NOT EXISTS gift_songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gift_id UUID NOT NULL REFERENCES gifts(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  theme TEXT NOT NULL CHECK (theme IN ('lullaby', 'educational', 'fun')),
  music_style TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'es',
  custom_prompt TEXT,
  lyrics TEXT,
  audio_url TEXT,
  cover_image_url TEXT,
  duration_seconds INTEGER,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'completed', 'failed')),
  suno_task_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_gifts_buyer_id ON gifts(buyer_id);
CREATE INDEX IF NOT EXISTS idx_gifts_delivery_token ON gifts(delivery_token);
CREATE INDEX IF NOT EXISTS idx_gift_songs_gift_id ON gift_songs(gift_id);
CREATE INDEX IF NOT EXISTS idx_gift_songs_suno_task_id ON gift_songs(suno_task_id);

-- Enable RLS
ALTER TABLE gifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE gift_songs ENABLE ROW LEVEL SECURITY;

-- RLS policies for gifts
CREATE POLICY "Users can view their own gifts"
  ON gifts FOR SELECT
  USING (buyer_id = auth.uid());

CREATE POLICY "Users can insert their own gifts"
  ON gifts FOR INSERT
  WITH CHECK (buyer_id = auth.uid());

CREATE POLICY "Users can update their own gifts"
  ON gifts FOR UPDATE
  USING (buyer_id = auth.uid());

-- Public access for delivery pages (read-only via delivery_token)
CREATE POLICY "Anyone can view ready/delivered gifts by token"
  ON gifts FOR SELECT
  USING (status IN ('ready', 'delivered', 'redeemed'));

-- RLS policies for gift_songs
CREATE POLICY "Users can view songs of their gifts"
  ON gift_songs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM gifts WHERE gifts.id = gift_songs.gift_id AND gifts.buyer_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert songs for their gifts"
  ON gift_songs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM gifts WHERE gifts.id = gift_songs.gift_id AND gifts.buyer_id = auth.uid()
    )
  );

CREATE POLICY "Users can update songs of their gifts"
  ON gift_songs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM gifts WHERE gifts.id = gift_songs.gift_id AND gifts.buyer_id = auth.uid()
    )
  );

-- Public access for gift_songs on delivered gifts
CREATE POLICY "Anyone can view songs of ready gifts"
  ON gift_songs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM gifts WHERE gifts.id = gift_songs.gift_id AND gifts.status IN ('ready', 'delivered', 'redeemed')
    )
  );
