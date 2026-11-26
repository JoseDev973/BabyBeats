-- Deploy the server-side /share/[token] reader before applying this migration.
-- Existing share tokens continue to resolve through that route.
alter policy "Users can view own generated songs" on public.generated_songs
  to authenticated
  using (user_id = (select auth.uid()));
