-- Run against a local database with the BabyBeats migrations applied.
begin;
do $$
declare
  buyer uuid := gen_random_uuid();
  recipient uuid := gen_random_uuid();
  album uuid := gen_random_uuid();
  voucher uuid := gen_random_uuid();
  settings jsonb;
  before_balance integer;
begin
  insert into auth.users (id) values (buyer), (recipient);
  insert into public.gifts
    (id, buyer_id, paid_at, pack_type, total_songs, child_name, delivery_mode, delivery_token)
    values (album, buyer, now(), 'sweet_dreams', 5, '—', 'link', gen_random_uuid()),
           (voucher, buyer, now(), 'learning', 5, '—', 'link', gen_random_uuid());

  settings := jsonb_build_object('deliveryMode', 'link', 'childName', 'Olivia', 'language', 'es',
    'songs', (select jsonb_agg(jsonb_build_object('theme','lullaby','style','gentle','prompt',''))
                from generate_series(1,5)));
  assert prepare_paid_gift(album,buyer,settings,5)->>'status' = 'started';
  assert prepare_paid_gift(album,buyer,settings,5)->>'status' = 'generating';
  assert (select count(*) from gift_songs where gift_id = album and status = 'pending') = 5;
  update public.gifts set status = 'personalizing' where id = album;
  update public.gift_songs set status = 'completed' where gift_id = album and position = 1;
  assert prepare_paid_gift(album,buyer,null,5)->>'status' = 'started';
  assert (select count(*) from gift_songs where gift_id = album and status = 'pending') = 4;
  assert not redeem_paid_gift(album,recipient,5);

  assert prepare_paid_gift(voucher,buyer,
    '{"deliveryMode":"redeem","childName":"Olivia","language":"es"}',5)->>'status' = 'ready';
  assert (select count(*) from gift_songs where gift_id = voucher) = 0;
  select credits into strict before_balance from public.profiles where id = recipient;
  begin
    perform redeem_paid_gift(voucher,gen_random_uuid(),5);
    raise exception 'Expected missing profile error';
  exception when raise_exception then
    if sqlerrm <> 'Missing recipient profile' then raise; end if;
  end;
  assert (select status from gifts where id = voucher) = 'ready';
  assert redeem_paid_gift(voucher,recipient,5);
  assert redeem_paid_gift(voucher,recipient,5);
  assert not redeem_paid_gift(voucher,buyer,5);
  assert (select credits from profiles where id = recipient) = before_balance + 5;
  assert (select count(*) from credit_transactions where user_id = recipient and type = 'bonus') = 1;
end;
$$;
rollback;
