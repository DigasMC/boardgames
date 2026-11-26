-- Personal access tokens for Tablist MCP / non-browser API clients

create table if not exists public.api_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  token_hash text not null unique,
  name text not null default 'MCP',
  prefix text not null,
  scopes text[] not null default array[
    'collection:read',
    'collection:write',
    'sessions:read',
    'sessions:write',
    'bgg:read'
  ]::text[],
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists api_tokens_user_id_idx
  on public.api_tokens (user_id);

create index if not exists api_tokens_active_hash_idx
  on public.api_tokens (token_hash)
  where revoked_at is null;

alter table public.api_tokens enable row level security;

-- Users manage their own tokens (reads never expose token_hash via app selects).
create policy "api_tokens_select_own"
  on public.api_tokens
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "api_tokens_insert_own"
  on public.api_tokens
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "api_tokens_update_own"
  on public.api_tokens
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "api_tokens_delete_own"
  on public.api_tokens
  for delete
  to authenticated
  using (auth.uid() = user_id);

comment on table public.api_tokens is
  'Hashed personal access tokens for MCP and Bearer API auth. Raw token shown once at creation.';
