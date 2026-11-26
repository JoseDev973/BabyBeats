-- Public bucket for permanent copies of Suno audio/covers (Suno URLs expire in ~2 weeks).
-- Applied in production on 2026-11-26.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('songs', 'songs', true, 52428800, array['audio/mpeg','image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
