-- Generated songs (personalized per user)
create table generated_songs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  child_name text not null,
  theme text not null check (theme in ('lullaby', 'educational', 'fun')),
  music_style text not null default 'gentle',
  language text not null default 'es',
  age_range text default 'all' check (age_range in ('0-6m', '6-12m', '1-2y', '2-3y', 'all')),
  custom_prompt text,
  lyrics text,
  audio_url text,
  cover_image_url text,
  duration_seconds int,
  share_token text unique default encode(gen_random_bytes(12), 'hex'),
  is_public boolean default false,
  status text not null default 'draft' check (status in ('draft', 'lyrics_ready', 'generating', 'completed', 'failed')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Credits system
alter table profiles add column if not exists credits int default 1;
alter table profiles add column if not exists total_songs_generated int default 0;

-- Credit transactions log
create table credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  amount int not null,
  type text not null check (type in ('purchase', 'usage', 'bonus')),
  description text,
  stripe_payment_id text,
  created_at timestamptz default now()
);

-- Indexes
create index idx_generated_songs_user on generated_songs(user_id);
create index idx_generated_songs_share_token on generated_songs(share_token);
create index idx_generated_songs_status on generated_songs(status);
create index idx_credit_transactions_user on credit_transactions(user_id);

-- RLS
alter table generated_songs enable row level security;
alter table credit_transactions enable row level security;

-- Generated songs: users see their own + public shared songs
create policy "Users can view own generated songs" on generated_songs
  for select using (auth.uid() = user_id or is_public = true);
create policy "Users can create generated songs" on generated_songs
  for insert with check (auth.uid() = user_id);
create policy "Users can update own generated songs" on generated_songs
  for update using (auth.uid() = user_id);
create policy "Users can delete own generated songs" on generated_songs
  for delete using (auth.uid() = user_id);

-- Credit transactions: users see their own
create policy "Users can view own transactions" on credit_transactions
  for select using (auth.uid() = user_id);
create policy "Users can insert own transactions" on credit_transactions
  for insert with check (auth.uid() = user_id);
