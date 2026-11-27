-- Run on a local Supabase instance with the migrations applied.
begin;
do $$
declare
  buyer uuid := gen_random_uuid();
  album uuid := gen_random_uuid();
  track uuid := gen_random_uuid();
begin
  insert into auth.users (id) values (buyer);
  insert into public.gifts (id, buyer_id, child_name, pack_type, total_songs, delivery_mode, delivery_token, status)
    values (album, buyer, 'Ana', 'learning', 5, 'link', album::text, 'generating');
  insert into public.gift_songs (id, gift_id, position, theme, music_style, suno_task_id, status)
    values (track, album, 1, 'fun', 'playful', 'current-task', 'generating');

  perform public.fail_gift_song(track, 'previous-task');
  assert (select status from public.gifts where id = album) = 'generating';
  assert (select suno_task_id from public.gift_songs where id = track) = 'current-task';
  perform public.fail_gift_song(track, 'current-task');
  assert (select status from public.gifts where id = album) = 'personalizing';
  assert (select status = 'failed' and suno_task_id is null from public.gift_songs where id = track);

  update public.gifts set status = 'generating' where id = album;
  perform public.fail_gift_song(track, 'current-task');
  assert (select status from public.gifts where id = album) = 'generating';

  assert not has_function_privilege('authenticated', 'public.fail_gift_song(uuid,text)', 'EXECUTE');
  assert not has_function_privilege('anon', 'public.fail_gift_song(uuid,text)', 'EXECUTE');
end;
$$;
rollback;
