-- Run against a local database with the migrations applied.
begin;

insert into auth.users (id) values
  ('f9300020-0111-4000-8000-000000000001'),
  ('f9300020-0111-4000-8000-000000000002');

insert into public.generated_songs (id, user_id, child_name, theme, status, is_public, share_token)
values
  ('f9300020-0111-4000-8000-000000000011', 'f9300020-0111-4000-8000-000000000001', 'Alice', 'fun', 'completed', true, 'test-alice'),
  ('f9300020-0111-4000-8000-000000000012', 'f9300020-0111-4000-8000-000000000002', 'Bob', 'fun', 'completed', true, 'test-bob');

set local role anon;
do $$ begin
  if exists (select 1 from public.generated_songs where share_token in ('test-alice', 'test-bob')) then
    raise exception 'Anonymous readers must use the share page';
  end if;
end $$;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'f9300020-0111-4000-8000-000000000001', true);
do $$ begin
  if not exists (select 1 from public.generated_songs where share_token = 'test-alice')
     or exists (select 1 from public.generated_songs where share_token = 'test-bob') then
    raise exception 'The library must only contain the owner''s songs';
  end if;
end $$;

rollback;
