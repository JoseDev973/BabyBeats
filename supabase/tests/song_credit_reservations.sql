-- Run in a local migrated Supabase database. All fixtures roll back.
begin;
do $$
declare
  owner_id uuid := gen_random_uuid();
  first_song uuid;
  second_song uuid;
  legacy_song uuid;
  result jsonb;
begin
  insert into auth.users (id) values (owner_id);
  insert into generated_songs (user_id, child_name, theme, status, lyrics)
    values (owner_id, 'Alex', 'lullaby', 'lyrics_ready', 'Original') returning id into first_song;
  insert into generated_songs (user_id, child_name, theme, status, lyrics)
    values (owner_id, 'Sam', 'fun', 'lyrics_ready', 'Original') returning id into second_song;
  insert into generated_songs (user_id, child_name, theme, status, lyrics)
    values (owner_id, 'Lee', 'fun', 'generating', 'Original') returning id into legacy_song;

  result := reserve_song_audio(gen_random_uuid(), first_song, 'Edited');
  assert result->>'outcome' = 'not_found';
  result := reserve_song_audio(owner_id, first_song, ' ');
  assert result->>'outcome' = 'invalid_draft';
  result := reserve_song_audio(owner_id, first_song, 'Edited');
  assert result->>'outcome' = 'reserved' and result->>'lyrics' = 'Edited';
  result := reserve_song_audio(owner_id, first_song, 'Duplicate');
  assert result->>'outcome' = 'generating';
  assert (select lyrics = 'Edited' from generated_songs where id = first_song);
  assert (select credits = 1 and total_songs_generated = 1 from profiles where id = owner_id);
  result := reserve_song_audio(owner_id, second_song, null);
  assert result->>'outcome' = 'reserved' and result->>'lyrics' = 'Original';
  assert (select credits = 0 from profiles where id = owner_id);

  -- Failure of the free song while a paid one is active restores one balance
  -- unit. When both fail, the original free entitlement becomes available again.
  update generated_songs set status = 'failed' where id = first_song;
  update generated_songs set status = 'failed' where id = first_song;
  assert (select credits = 1 and total_songs_generated = 1 from profiles where id = owner_id);
  update generated_songs set status = 'failed' where id = second_song;
  assert (select credits = 1 and total_songs_generated = 0 from profiles where id = owner_id);
  assert (select sum(amount) = 0 from credit_transactions where user_id = owner_id);

  -- Old jobs cannot have their charges inferred. Do not refund them.
  update generated_songs set status = 'failed' where id = legacy_song;
  assert (select credits = 1 and total_songs_generated = 0 from profiles where id = owner_id);

  perform reserve_song_audio(owner_id, first_song, null);
  update generated_songs set status = 'completed' where id = first_song;
  result := reserve_song_audio(owner_id, first_song, null);
  assert result->>'outcome' = 'completed';
  perform reserve_song_audio(owner_id, second_song, null);
  update generated_songs set status = 'completed' where id = second_song;
  result := reserve_song_audio(owner_id, legacy_song, null);
  assert result->>'outcome' = 'no_credits';
  assert (select credits = 0 and total_songs_generated = 2 from profiles where id = owner_id);
  assert (select sum(amount) = -1 from credit_transactions where user_id = owner_id);
end;
$$;
rollback;
