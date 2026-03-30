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
