-- The server now owns gift configuration. Remove both table and column grants
-- (migration 007 granted individual configuration columns to authenticated).
revoke insert, update, delete on public.gifts, public.gift_songs from public, anon, authenticated;
revoke update (child_name, language, delivery_mode, recipient_name, recipient_email, updated_at)
  on public.gifts from public, anon, authenticated;
revoke insert (gift_id, position, theme, music_style, language, custom_prompt),
       update (theme, music_style, language, custom_prompt)
  on public.gift_songs from public, anon, authenticated;
drop policy if exists "Users can update their own gifts" on public.gifts;
drop policy if exists "Buyers can edit draft gift details" on public.gifts;
drop policy if exists "Buyers can configure songs while personalizing" on public.gift_songs;

-- Older releases could generate albums even when the buyer selected a code.
-- Keep their track list and existing delivery token as a listening link.
update public.gifts g set delivery_mode = 'link'
  where delivery_mode = 'redeem' and status <> 'redeemed'
    and exists (select from public.gift_songs where gift_id = g.id);
-- Before there are tracks a legacy interrupted draft still needs its settings.
update public.gifts g set status = 'draft'
  where status in ('personalizing','generating')
    and not exists (select from public.gift_songs where gift_id = g.id);

alter table public.gift_songs
  add column if not exists start_attempt uuid,
  add column if not exists start_expires_at timestamptz;

-- Claim just the tracks this request may launch. The lease exceeds the
-- generation route's 300-second deadline. An interruption can then be retried
-- without taking over a sibling that still has an active start or Suno task.
create or replace function public.prepare_paid_gift(
  p_gift_id uuid, p_buyer_id uuid, p_settings jsonb, p_song_count integer
) returns jsonb
language plpgsql set search_path = '' as $$
declare
  gift public.gifts%rowtype;
  song_count integer;
  starts jsonb := '[]';
  result_status text;
begin
  select * into strict gift from public.gifts
    where id = p_gift_id and buyer_id = p_buyer_id and paid_at is not null
    for update;
  result_status := gift.status;

  if gift.status in ('draft', 'personalizing', 'generating') then
    select count(*) into song_count from public.gift_songs where gift_id = gift.id;
    if song_count = 0 and p_settings is null then
      result_status := 'needs_settings';
    else
      if song_count = 0 then
        update public.gifts set child_name = trim(p_settings->>'childName'),
          language = p_settings->>'language', delivery_mode = p_settings->>'deliveryMode', updated_at = now()
          where id = gift.id returning * into gift;
      end if;
      if gift.child_name in ('', '—') then raise exception 'Missing child name'; end if;

      if gift.delivery_mode = 'redeem' then
        if song_count <> 0 then raise exception 'A gift with tracks cannot issue credits'; end if;
        update public.gifts set status = 'ready', updated_at = now() where id = gift.id;
        result_status := 'ready';
      else
        if song_count = 0 then
          if jsonb_array_length(p_settings->'songs') is distinct from p_song_count then
            raise exception 'Missing song configurations';
          end if;
          insert into public.gift_songs (gift_id, position, theme, music_style, language, custom_prompt)
            select gift.id, position, song->>'theme', song->>'style', gift.language, nullif(song->>'prompt','')
              from jsonb_array_elements(p_settings->'songs') with ordinality as entries(song, position);
        elsif song_count <> p_song_count then
          raise exception 'Track count does not match paid pack';
        end if;

        with claimed as (
          update public.gift_songs set start_attempt = gen_random_uuid(),
            start_expires_at = now() + interval '6 minutes', suno_task_id = null, status = 'pending'
            where gift_id = gift.id and status <> 'completed'
              and (suno_task_id is null or status = 'failed')
              and (start_expires_at is null or start_expires_at <= now())
            returning id, start_attempt, position, theme, music_style, language, custom_prompt, lyrics
        )
        select coalesce(jsonb_agg(to_jsonb(c) order by c.position), '[]'::jsonb) into starts from claimed c;
        update public.gifts set status = 'generating', updated_at = now() where id = gift.id;
        result_status := case when jsonb_array_length(starts) > 0 then 'started' else 'generating' end;
      end if;
    end if;
  end if;

  return jsonb_build_object('status', result_status, 'child_name', gift.child_name, 'language', gift.language,
    'delivery_mode', gift.delivery_mode, 'delivery_token', gift.delivery_token, 'starts', starts);
end;
$$;

alter table public.gifts add column if not exists redeemed_by uuid references auth.users(id) on delete set null;

-- The claim, balance increment and ledger entry commit or roll back together.
create or replace function public.redeem_paid_gift(p_gift_id uuid, p_user_id uuid, p_credits integer)
returns boolean language plpgsql set search_path = '' as $$
declare
  gift public.gifts%rowtype;
begin
  select * into gift from public.gifts where id = p_gift_id and delivery_mode = 'redeem'
    and paid_at is not null for update;
  if not found or exists (select from public.gift_songs where gift_id = p_gift_id) then
    return false;
  end if;
  if gift.status = 'redeemed' then return gift.redeemed_by is not distinct from p_user_id; end if;
  if gift.status not in ('ready', 'delivered') or gift.created_at < now() - interval '90 days'
    then return false; end if;

  update public.profiles set credits = coalesce(credits, 0) + p_credits where id = p_user_id;
  if not found then raise exception 'Missing recipient profile'; end if;
  insert into public.credit_transactions (user_id, amount, type, description)
    values (p_user_id, p_credits, 'bonus', format('Gift redeemed: %s for %s', gift.pack_type, gift.child_name));
  update public.gifts set status = 'redeemed', redeemed_by = p_user_id, updated_at = now() where id = gift.id;
  return true;
end;
$$;

revoke all on function public.prepare_paid_gift(uuid, uuid, jsonb, integer) from public, anon, authenticated;
grant execute on function public.prepare_paid_gift(uuid, uuid, jsonb, integer) to service_role;
revoke all on function public.redeem_paid_gift(uuid, uuid, integer) from public, anon, authenticated;
grant execute on function public.redeem_paid_gift(uuid, uuid, integer) to service_role;

