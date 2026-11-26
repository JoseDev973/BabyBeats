-- Keep the first submission and its song configuration together, including when
-- the buyer resubmits from another tab or retries after a provider error.
create or replace function public.prepare_paid_gift(
  p_gift_id uuid, p_buyer_id uuid, p_settings jsonb, p_song_count integer
) returns jsonb
language plpgsql set search_path = '' as $$
declare
  gift public.gifts%rowtype;
  has_songs boolean;
  result_status text;
begin
  select * into strict gift from public.gifts
    where id = p_gift_id and buyer_id = p_buyer_id and paid_at is not null
    for update;

  result_status := gift.status;
  if gift.status in ('draft', 'personalizing') then
    select exists(select 1 from public.gift_songs where gift_id = gift.id) into has_songs;
    if not has_songs and p_settings is not null then
      update public.gifts
        set child_name = trim(p_settings->>'childName'), language = p_settings->>'language',
            delivery_mode = p_settings->>'deliveryMode', updated_at = now()
        where id = gift.id returning * into gift;
    end if;

    if gift.child_name in ('', '—') then
      raise exception 'Missing gift settings';
    end if;
    if gift.delivery_mode = 'redeem' and not has_songs then
      update public.gifts set status = 'ready', updated_at = now() where id = gift.id;
      result_status := 'ready';
    else
      if not has_songs then
        if jsonb_array_length(p_settings->'songs') is distinct from p_song_count then
          raise exception 'Missing song configurations';
        end if;
        insert into public.gift_songs (gift_id, position, theme, music_style, language, custom_prompt)
          select gift.id, position, song->>'theme', song->>'style', gift.language, nullif(song->>'prompt','')
            from jsonb_array_elements(p_settings->'songs') with ordinality as entries(song, position);
      end if;
      update public.gifts set status = 'generating', updated_at = now() where id = gift.id;
      result_status := 'started';
    end if;
  end if;

  return jsonb_build_object('status', result_status, 'child_name', gift.child_name, 'language', gift.language,
    'delivery_mode', gift.delivery_mode, 'delivery_token', gift.delivery_token);
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
  if not found then return false; end if;
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

-- Freeze delivery details once fulfillment starts. The buyer can still read
-- and resume the gift using the existing SELECT policy.
drop policy if exists "Users can update their own gifts" on public.gifts;
create policy "Buyers can edit draft gift details" on public.gifts for update to authenticated
using (buyer_id = auth.uid() and status in ('draft', 'personalizing'))
with check (buyer_id = auth.uid() and status in ('draft', 'personalizing'));
