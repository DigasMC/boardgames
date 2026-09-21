-- Per-user BoardGameGeek username for collection import.
alter table public.profiles
  add column if not exists bgg_username text;
