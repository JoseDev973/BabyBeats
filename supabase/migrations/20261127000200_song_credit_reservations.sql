-- Apply before deploying the audio-start route. Existing in-flight songs have
-- a null reservation so their balances and transaction history are untouched.
alter table public.generated_songs
  add column if not exists suno_task_id text,
  add column if not exists audio_reservation_id uuid;

-- While a credit is held, only a trusted server writer can change or delete
-- the song. Ordinary draft inserts and edits retain their existing RLS rules.
drop policy if exists "Clients cannot insert credit reservations" on public.generated_songs;
create policy "Clients cannot insert credit reservations" on public.generated_songs
  as restrictive for insert to authenticated, anon with check (audio_reservation_id is null);
drop policy if exists "Clients cannot change reserved songs" on public.generated_songs;
create policy "Clients cannot change reserved songs" on public.generated_songs
  as restrictive for update to authenticated, anon
  using (audio_reservation_id is null) with check (audio_reservation_id is null);
drop policy if exists "Clients cannot delete reserved songs" on public.generated_songs;
create policy "Clients cannot delete reserved songs" on public.generated_songs
  as restrictive for delete to authenticated, anon using (audio_reservation_id is null);

create or replace function public.reserve_song_audio(p_user_id uuid, p_song_id uuid, p_lyrics text)
returns jsonb
language plpgsql set search_path = '' as $$
declare
  song public.generated_songs%rowtype;
  account public.profiles%rowtype;
  attempt uuid := gen_random_uuid();
  charge integer;
begin
  select * into song from public.generated_songs
    where id = p_song_id and user_id = p_user_id for update;
  if not found then
    return jsonb_build_object('outcome', 'not_found');
  end if;
  if song.status in ('generating', 'completed') then
    if p_lyrics is not null and p_lyrics is distinct from song.lyrics then
      return jsonb_build_object('outcome', 'lyrics_already_submitted');
    end if;
    return jsonb_build_object('outcome', song.status, 'task_id', song.suno_task_id);
  end if;
  song.lyrics := coalesce(p_lyrics, song.lyrics);
  if song.status not in ('lyrics_ready', 'failed') or song.lyrics is null
      or song.lyrics !~ '[^[:space:]]' or length(song.lyrics) > 5000 then
    return jsonb_build_object('outcome', 'invalid_draft');
  end if;

  select * into strict account from public.profiles where id = p_user_id for update;
  charge := case when coalesce(account.total_songs_generated, 0) = 0 then 0 else 1 end;
  if coalesce(account.credits, 0) < charge then
    return jsonb_build_object('outcome', 'no_credits');
  end if;

  update public.profiles set credits = coalesce(credits, 0) - charge,
    total_songs_generated = coalesce(total_songs_generated, 0) + 1 where id = p_user_id;
  if charge > 0 then
    insert into public.credit_transactions (user_id, amount, type, description)
      values (p_user_id, -charge, 'usage', 'Reserved audio credit for song ' || p_song_id);
  end if;

  update public.generated_songs set status = 'generating', lyrics = song.lyrics,
    updated_at = now(), suno_task_id = null, audio_reservation_id = attempt
    where id = p_song_id;
  return jsonb_build_object('outcome', 'reserved', 'attempt', attempt, 'id', p_song_id,
    'lyrics', song.lyrics, 'theme', song.theme, 'music_style', song.music_style,
    'language', song.language, 'child_name', song.child_name);
end;
$$;
revoke all on function public.reserve_song_audio(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.reserve_song_audio(uuid, uuid, text) to service_role;

-- The signed callback may beat the HTTP response, and the response to this
-- write may itself be lost. Repeating the association never replaces a task.
create or replace function public.attach_song_audio_task(p_song_id uuid, p_attempt uuid, p_task_id text)
returns text language plpgsql set search_path = '' as $$
declare
  current_status text;
begin
  update public.generated_songs set suno_task_id = p_task_id, updated_at = now()
    where id = p_song_id and audio_reservation_id = p_attempt
      and status = 'generating' and suno_task_id is null;
  if found then
    return 'generating';
  end if;
  select status into current_status from public.generated_songs
    where id = p_song_id and suno_task_id = p_task_id;
  return coalesce(current_status, 'stale');
end;
$$;
revoke all on function public.attach_song_audio_task(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.attach_song_audio_task(uuid, uuid, text) to service_role;

create or replace function public.settle_song_audio() returns trigger
language plpgsql set search_path = '' as $$
declare
  remaining_songs integer;
begin
  if new.status = 'failed' then
    -- The first song is free. With overlapping attempts, the identity of
    -- the first surviving song can change. A balance unit is restored
    -- while other songs remain; returning to zero restores the free slot.
    update public.profiles set
      total_songs_generated = total_songs_generated - 1,
      credits = credits + case when total_songs_generated > 1 then 1 else 0 end
      where id = old.user_id returning total_songs_generated into strict remaining_songs;
    if remaining_songs > 0 then
      insert into public.credit_transactions (user_id, amount, type, description)
        values (old.user_id, 1, 'bonus', 'Returned audio credit for song ' || old.id);
    end if;
  end if;
  new.audio_reservation_id := null;
  return new;
end;
$$;
drop trigger if exists settle_reserved_song_audio on public.generated_songs;
create trigger settle_reserved_song_audio before update of status on public.generated_songs
  for each row when (old.audio_reservation_id is not null and old.status = 'generating'
    and new.status in ('completed', 'failed')) execute function public.settle_song_audio();
