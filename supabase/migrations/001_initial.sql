-- BabyBeats Initial Schema

-- Perfiles extendidos (extiende auth.users de Supabase)
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text,
  avatar_url text,
  preferred_language text default 'es',
  subscription_tier text default 'free' check (subscription_tier in ('free', 'premium')),
  stripe_customer_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Categorías de canciones
create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  description text,
  icon text,
  created_at timestamptz default now()
);

-- Canciones
create table songs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique not null,
  description text,
  category_id uuid references categories on delete set null,
  language text not null default 'es',
  audio_url text not null,
  cover_image_url text,
  duration_seconds int,
  is_premium boolean default false,
  age_range text default 'all' check (age_range in ('0-6m', '6-12m', '1-2y', '2-3y', 'all')),
  play_count int default 0,
  ai_tool_used text,
  lyrics text,
  created_at timestamptz default now()
);

-- Favoritos del usuario
create table favorites (
  user_id uuid references profiles(id) on delete cascade,
  song_id uuid references songs(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, song_id)
);

-- Playlists
create table playlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  name text not null,
  description text,
  is_public boolean default false,
  created_at timestamptz default now()
);

-- Canciones en playlists
create table playlist_songs (
  playlist_id uuid references playlists(id) on delete cascade,
  song_id uuid references songs(id) on delete cascade,
  position int not null,
  primary key (playlist_id, song_id)
);

-- Historial de reproducción
create table play_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  song_id uuid references songs(id) on delete cascade,
  played_at timestamptz default now()
);

-- Suscripciones (Stripe sync)
create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  stripe_subscription_id text unique,
  status text not null check (status in ('active', 'canceled', 'past_due', 'incomplete')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz default now()
);

-- Indexes
create index idx_songs_category on songs(category_id);
create index idx_songs_language on songs(language);
create index idx_songs_age_range on songs(age_range);
create index idx_songs_is_premium on songs(is_premium);
create index idx_favorites_user on favorites(user_id);
create index idx_play_history_user on play_history(user_id);
create index idx_subscriptions_user on subscriptions(user_id);

-- RLS Policies
alter table profiles enable row level security;
alter table songs enable row level security;
alter table categories enable row level security;
alter table favorites enable row level security;
alter table playlists enable row level security;
alter table playlist_songs enable row level security;
alter table play_history enable row level security;
alter table subscriptions enable row level security;

-- Profiles: users can read/update their own profile
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

-- Songs: everyone can read songs
create policy "Anyone can view songs" on songs for select using (true);

-- Categories: everyone can read categories
create policy "Anyone can view categories" on categories for select using (true);

-- Favorites: users manage their own favorites
create policy "Users can view own favorites" on favorites for select using (auth.uid() = user_id);
create policy "Users can add favorites" on favorites for insert with check (auth.uid() = user_id);
create policy "Users can remove favorites" on favorites for delete using (auth.uid() = user_id);

-- Playlists: users manage their own + view public playlists
create policy "Users can view own playlists" on playlists for select using (auth.uid() = user_id or is_public = true);
create policy "Users can create playlists" on playlists for insert with check (auth.uid() = user_id);
create policy "Users can update own playlists" on playlists for update using (auth.uid() = user_id);
create policy "Users can delete own playlists" on playlists for delete using (auth.uid() = user_id);

-- Playlist songs: users manage songs in their own playlists
create policy "Users can view playlist songs" on playlist_songs for select using (
  exists (select 1 from playlists where id = playlist_id and (user_id = auth.uid() or is_public = true))
);
create policy "Users can add to own playlists" on playlist_songs for insert with check (
  exists (select 1 from playlists where id = playlist_id and user_id = auth.uid())
);
create policy "Users can remove from own playlists" on playlist_songs for delete using (
  exists (select 1 from playlists where id = playlist_id and user_id = auth.uid())
);

-- Play history: users can view/add their own history
create policy "Users can view own history" on play_history for select using (auth.uid() = user_id);
create policy "Users can add to history" on play_history for insert with check (auth.uid() = user_id);

-- Subscriptions: users can view their own subscription
create policy "Users can view own subscription" on subscriptions for select using (auth.uid() = user_id);

-- Trigger to auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Seed categories
insert into categories (name, slug, description, icon) values
  ('Lullabies', 'lullabies', 'Gentle melodies to help your baby drift off to sleep', 'moon'),
  ('Educational', 'educational', 'Learn colors, numbers, animals, and more through music', 'book-open'),
  ('Fun & Play', 'fun', 'Upbeat songs for playtime and happy moments', 'music');
