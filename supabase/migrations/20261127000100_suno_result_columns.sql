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
returns void language plpgsql set search_path = '' as $$
declare
  parent_id uuid;
begin
  select s.gift_id into parent_id from public.gift_songs s where s.id = p_song_id;
  if not found then return; end if;
  -- Match the parent-first lock order used by gift startup.
  perform 1 from public.gifts where id = parent_id for update;
  update public.gift_songs set status = 'failed', suno_task_id = null
    where id = p_song_id and suno_task_id = p_task_id and status = 'generating';
  if not found then return; end if;
  update public.gifts set status = 'personalizing', updated_at = now()
    where id = parent_id and status = 'generating';
end;
$$;
revoke all on function public.fail_gift_song(uuid, text) from public, anon, authenticated;
grant execute on function public.fail_gift_song(uuid, text) to service_role;

-- Repair unfinished legacy callbacks only when they still carry the failed task ID.
-- A second application must not release an album already claimed for a retry.
with cleared as (
  update public.gift_songs s set suno_task_id = null from public.gifts g
    where s.gift_id = g.id and s.status = 'failed' and s.suno_task_id is not null
      and g.status in ('generating', 'personalizing')
    returning s.gift_id
)
update public.gifts g set status = 'personalizing', updated_at = now()
  where g.status = 'generating' and g.id in (select gift_id from cleared);
