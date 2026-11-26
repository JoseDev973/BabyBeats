-- Existing installations may already have these provider fields.
alter table public.generated_songs
  add column if not exists suno_task_id text,
  add column if not exists audio_url_b text,
  add column if not exists duration_seconds_b integer;

create index if not exists idx_generated_songs_suno_task_id
  on public.generated_songs (suno_task_id) where suno_task_id is not null;

-- Release a failed gift track and its parent together. A delayed callback from
-- an older attempt must not release a gift that is already being retried.
create or replace function public.fail_gift_song(p_song_id uuid, p_task_id text)
returns void language plpgsql set search_path = public as $$
declare
  parent_id uuid;
begin
  update gift_songs set status = 'failed', suno_task_id = null
    where id = p_song_id and suno_task_id = p_task_id and status = 'generating'
    returning gift_id into parent_id;
  update gifts set status = 'personalizing', updated_at = now()
    where id = parent_id and status = 'generating';
end;
$$;
revoke all on function public.fail_gift_song(uuid, text) from public, anon, authenticated;
grant execute on function public.fail_gift_song(uuid, text) to service_role;

-- Older callbacks could mark the track as failed and leave the buyer waiting.
update gift_songs s set suno_task_id = null from gifts g
  where s.gift_id = g.id and s.status = 'failed' and g.status in ('generating', 'personalizing');
update gifts g set status = 'personalizing', updated_at = now()
  where g.status = 'generating' and exists (
    select 1 from gift_songs s where s.gift_id = g.id and s.status = 'failed'
  );
