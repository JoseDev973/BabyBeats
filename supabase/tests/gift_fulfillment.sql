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
  first_batch jsonb;
  retry_batch jsonb;
  orphan uuid;
  previous_attempt uuid;
  role_name text;
begin
  foreach role_name in array array['anon','authenticated'] loop
    assert not has_any_column_privilege(role_name,'gifts','UPDATE');
    assert not has_any_column_privilege(role_name,'gift_songs','INSERT');
    assert not has_any_column_privilege(role_name,'gift_songs','UPDATE');
    assert not has_table_privilege(role_name,'gift_songs','DELETE');
  end loop;
  insert into auth.users (id) values (buyer), (recipient);
  insert into public.gifts
    (id, buyer_id, paid_at, pack_type, total_songs, child_name, delivery_mode, delivery_token)
    values (album, buyer, now(), 'sweet_dreams', 5, '—', 'link', gen_random_uuid()),
           (voucher, buyer, now(), 'learning', 5, '—', 'link', gen_random_uuid());

  settings := jsonb_build_object('deliveryMode', 'link', 'childName', 'Olivia', 'language', 'es',
    'songs', (select jsonb_agg(jsonb_build_object('theme','lullaby','style','gentle','prompt',''))
                from generate_series(1,5)));
  update gifts set status = 'personalizing' where id = album;
  assert prepare_paid_gift(album,buyer,null,5)->>'status' = 'needs_settings';
  first_batch := prepare_paid_gift(album,buyer,settings,5);
  assert jsonb_array_length(first_batch->'starts') = 5;
  assert prepare_paid_gift(album,buyer,settings,5)->>'status' = 'generating';
  -- A failed sibling may release the parent while other workers are starting.
  update gifts set status = 'personalizing' where id = album;
  update gift_songs set status = 'completed', start_expires_at = null where gift_id = album and position = 1;
  update gift_songs set suno_task_id = 'fixture-active', status = 'generating', start_expires_at = null
    where gift_id = album and position = 2;
  update gift_songs set status = 'failed', start_attempt = null, start_expires_at = null
    where gift_id = album and position = 3;
  retry_batch := prepare_paid_gift(album,buyer,null,5);
  assert jsonb_array_length(retry_batch->'starts') = 1;
  assert retry_batch->'starts'->0->>'position' = '3';

  select id, start_attempt into orphan, previous_attempt from gift_songs where gift_id = album and position = 4;
  update gift_songs set start_expires_at = now() - interval '1 second' where id = orphan;
  retry_batch := prepare_paid_gift(album,buyer,null,5);
  assert jsonb_array_length(retry_batch->'starts') = 1;
  assert (retry_batch->'starts'->0->>'id')::uuid = orphan;
  assert (retry_batch->'starts'->0->>'start_attempt')::uuid <> previous_attempt;
  assert prepare_paid_gift(album,buyer,null,5)->>'status' = 'generating';
  assert not redeem_paid_gift(album,recipient,5);

  assert (prepare_paid_gift(voucher,buyer,
    '{"deliveryMode":"redeem","childName":"Olivia","language":"es"}',5)->>'issued_voucher')::boolean;
  assert not (prepare_paid_gift(voucher,buyer,null,5)->>'issued_voucher')::boolean;
  assert (select count(*) from gift_songs where gift_id = voucher) = 0;

  -- A historical redeem-mode album still has tracks. It is never eligible for a new credit grant.
  update gifts set delivery_mode = 'redeem', status = 'ready' where id = album;
  assert not redeem_paid_gift(album,recipient,5);
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
