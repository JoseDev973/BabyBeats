-- Automatic follow-up emails (abandoned gift checkout, signup without a song,
-- free song without a purchase). One row per email sent so nobody gets the
-- same one twice. Only the server (service role) reads or writes it.
create table if not exists public.lifecycle_emails (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('gift_abandoned', 'no_song', 'free_song_no_purchase')),
  ref text not null default '',
  sent_at timestamptz not null default now(),
  unique (user_id, kind, ref)
);
alter table public.lifecycle_emails enable row level security;
revoke all on public.lifecycle_emails from public, anon, authenticated;

-- People can unsubscribe from marketing emails. Transactional emails
-- (song ready, gift ready) are still sent.
alter table public.profiles add column if not exists marketing_opt_out boolean not null default false;
-- Profiles use column grants and the profile page selects every column.
-- Users may read their own flag; only the server changes it.
grant select (marketing_opt_out) on public.profiles to authenticated;
