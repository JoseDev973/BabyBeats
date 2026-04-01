export type SubscriptionTier = "free" | "premium";
export type AgeRange = "0-6m" | "6-12m" | "1-2y" | "2-3y" | "all";
export type SubscriptionStatus =
  | "active"
  | "canceled"
  | "past_due"
  | "incomplete";

export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  preferred_language: string;
  subscription_tier: SubscriptionTier;
  stripe_customer_id: string | null;
  credits: number;
  total_songs_generated: number;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  created_at: string;
}

export interface Song {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  category_id: string | null;
  language: string;
  audio_url: string;
  cover_image_url: string | null;
  duration_seconds: number | null;
  is_premium: boolean;
  age_range: AgeRange;
  play_count: number;
  ai_tool_used: string | null;
  lyrics: string | null;
  created_at: string;
  category?: Category;
}

export interface Favorite {
  user_id: string;
  song_id: string;
  created_at: string;
}

export interface Playlist {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  is_public: boolean;
  created_at: string;
}

export interface PlaylistSong {
  playlist_id: string;
  song_id: string;
  position: number;
}

export interface PlayHistory {
  id: string;
  user_id: string;
  song_id: string;
  played_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  stripe_subscription_id: string | null;
  status: SubscriptionStatus;
  current_period_start: string | null;
  current_period_end: string | null;
  created_at: string;
}

export type SongTheme = "lullaby" | "educational" | "fun";
export type GenerationStatus =
  | "draft"
  | "lyrics_ready"
  | "generating"
  | "completed"
  | "failed";

export interface GeneratedSong {
  id: string;
  user_id: string;
  child_name: string;
  theme: SongTheme;
  music_style: string;
  language: string;
  age_range: AgeRange;
  custom_prompt: string | null;
  lyrics: string | null;
  audio_url: string | null;
  cover_image_url: string | null;
  duration_seconds: number | null;
  share_token: string;
  is_public: boolean;
  status: GenerationStatus;
  created_at: string;
  updated_at: string;
}

export type GiftPackType = "first_album" | "sweet_dreams" | "learning" | "custom";
export type GiftDeliveryMode = "link" | "redeem";
export type GiftStatus = "draft" | "personalizing" | "generating" | "ready" | "delivered" | "redeemed";
export type GiftSongStatus = "pending" | "generating" | "completed" | "failed";

export interface Gift {
  id: string;
  buyer_id: string | null;
  recipient_name: string | null;
  recipient_email: string | null;
  child_name: string;
  pack_type: GiftPackType;
  total_songs: number;
  language: string;
  delivery_mode: GiftDeliveryMode;
  delivery_token: string;
  status: GiftStatus;
  stripe_payment_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface GiftSong {
  id: string;
  gift_id: string;
  position: number;
  theme: SongTheme;
  music_style: string;
  language: string;
  custom_prompt: string | null;
  lyrics: string | null;
  audio_url: string | null;
  cover_image_url: string | null;
  duration_seconds: number | null;
  status: GiftSongStatus;
  suno_task_id: string | null;
  created_at: string;
}

export type CreditTransactionType = "purchase" | "usage" | "bonus";

export interface CreditTransaction {
  id: string;
  user_id: string;
  amount: number;
  type: CreditTransactionType;
  description: string | null;
  stripe_payment_id: string | null;
  created_at: string;
}
