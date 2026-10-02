-- Cache BoardGameGeek community file metadata (Geekdo JSON /api/files).
alter table public.games
  add column if not exists bgg_files jsonb not null default '[]'::jsonb,
  add column if not exists bgg_files_fetched_at timestamptz;
