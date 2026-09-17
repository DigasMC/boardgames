-- Applied remotely to project boardgames-vault (xsveiryoqitarwgtizim)
-- Kept locally for reference / fresh environments.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  bgg_id integer not null unique,
  name text not null,
  description text,
  image_url text,
  thumbnail_url text,
  min_players integer,
  max_players integer,
  min_playtime integer,
  max_playtime integer,
  playing_time integer,
  weight numeric(3,2),
  bgg_rating numeric(4,2),
  year_published integer,
  categories text[] not null default '{}',
  mechanics text[] not null default '{}',
  raw_xml text,
  fetched_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.games enable row level security;

create table if not exists public.collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null default 'My Collection',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

alter table public.collections enable row level security;

create table if not exists public.collection_items (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.collections (id) on delete cascade,
  game_id uuid not null references public.games (id) on delete cascade,
  notes text,
  is_wishlist boolean not null default false,
  added_at timestamptz not null default now(),
  unique (collection_id, game_id)
);

alter table public.collection_items enable row level security;

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.profiles (id) on delete cascade,
  title text not null default 'Game Night',
  session_date timestamptz not null default now(),
  location text,
  notes text,
  status text not null default 'planned' check (status in ('planned', 'in_progress', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.sessions enable row level security;

create table if not exists public.session_games (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  game_id uuid not null references public.games (id) on delete restrict,
  sort_order integer not null default 0,
  unique (session_id, game_id)
);

alter table public.session_games enable row level security;

create table if not exists public.session_players (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  display_name text not null,
  user_id uuid references public.profiles (id) on delete set null,
  color text,
  created_at timestamptz not null default now()
);

alter table public.session_players enable row level security;

create table if not exists public.session_scores (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  player_id uuid not null references public.session_players (id) on delete cascade,
  game_id uuid not null references public.games (id) on delete restrict,
  score numeric,
  is_winner boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  unique (session_id, player_id, game_id)
);

alter table public.session_scores enable row level security;

create table if not exists public.filter_presets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  players integer,
  max_playtime integer,
  min_playtime integer,
  categories text[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.filter_presets enable row level security;
