-- Friends, public profiles, team scoring, participant session visibility

-- ---------------------------------------------------------------------------
-- Profiles: username + privacy
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists username text,
  add column if not exists is_public boolean not null default false;

alter table public.profiles
  drop constraint if exists profiles_username_format;

alter table public.profiles
  add constraint profiles_username_format
  check (
    username is null
    or username ~ '^[a-z0-9_]{3,20}$'
  );

create unique index if not exists profiles_username_lower_uidx
  on public.profiles (lower(username))
  where username is not null;

-- Backfill usernames from display_name / auth email local-part
do $$
declare
  r record;
  base text;
  candidate text;
  n int;
begin
  for r in
    select p.id, p.display_name, u.email
    from public.profiles p
    join auth.users u on u.id = p.id
    where p.username is null
  loop
    base := lower(regexp_replace(
      coalesce(
        nullif(regexp_replace(coalesce(r.display_name, ''), '[^a-zA-Z0-9_]', '', 'g'), ''),
        nullif(split_part(coalesce(r.email, ''), '@', 1), ''),
        'user'
      ),
      '[^a-z0-9_]',
      '',
      'g'
    ));
    if length(base) < 3 then
      base := rpad(base, 3, '0');
    end if;
    base := left(base, 16);
    candidate := base;
    n := 0;
    while exists (
      select 1 from public.profiles where lower(username) = candidate
    ) loop
      n := n + 1;
      candidate := left(base, 16) || n::text;
    end loop;
    update public.profiles set username = candidate where id = r.id;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Friendships
-- ---------------------------------------------------------------------------
create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles (id) on delete cascade,
  addressee_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (requester_id <> addressee_id),
  unique (requester_id, addressee_id)
);

create index if not exists friendships_requester_idx on public.friendships (requester_id);
create index if not exists friendships_addressee_idx on public.friendships (addressee_id);
create index if not exists friendships_status_idx on public.friendships (status);

alter table public.friendships enable row level security;

create or replace function public.are_friends(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.friendships f
    where f.status = 'accepted'
      and (
        (f.requester_id = a and f.addressee_id = b)
        or (f.requester_id = b and f.addressee_id = a)
      )
  );
$$;

revoke all on function public.are_friends(uuid, uuid) from public;
grant execute on function public.are_friends(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Sessions: scoring mode + teams
-- ---------------------------------------------------------------------------
alter table public.sessions
  add column if not exists scoring_mode text not null default 'individual';

alter table public.sessions
  drop constraint if exists sessions_scoring_mode_check;

alter table public.sessions
  add constraint sessions_scoring_mode_check
  check (scoring_mode in ('individual', 'team'));

create table if not exists public.session_teams (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists session_teams_session_idx on public.session_teams (session_id);

alter table public.session_teams enable row level security;

alter table public.session_players
  add column if not exists team_id uuid references public.session_teams (id) on delete set null;

-- session_scores: support team OR player scores
alter table public.session_scores
  alter column player_id drop not null;

alter table public.session_scores
  add column if not exists team_id uuid references public.session_teams (id) on delete cascade;

alter table public.session_scores
  drop constraint if exists session_scores_player_or_team_check;

alter table public.session_scores
  add constraint session_scores_player_or_team_check
  check (
    (player_id is not null and team_id is null)
    or (player_id is null and team_id is not null)
  );

alter table public.session_scores
  drop constraint if exists session_scores_session_id_player_id_game_id_key;

drop index if exists session_scores_session_id_player_id_game_id_key;

create unique index if not exists session_scores_player_unique
  on public.session_scores (session_id, player_id, game_id)
  where player_id is not null;

create unique index if not exists session_scores_team_unique
  on public.session_scores (session_id, team_id, game_id)
  where team_id is not null;

-- ---------------------------------------------------------------------------
-- Session access helpers (avoid RLS recursion)
-- ---------------------------------------------------------------------------
create or replace function public.is_session_host(sid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.sessions s
    where s.id = sid and s.host_id = auth.uid()
  );
$$;

create or replace function public.can_view_session(sid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.sessions s
    where s.id = sid
      and (
        s.host_id = auth.uid()
        or exists (
          select 1 from public.session_players sp
          where sp.session_id = s.id and sp.user_id = auth.uid()
        )
      )
  );
$$;

revoke all on function public.is_session_host(uuid) from public;
revoke all on function public.can_view_session(uuid) from public;
grant execute on function public.is_session_host(uuid) to authenticated;
grant execute on function public.can_view_session(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Search users (never returns emails)
-- ---------------------------------------------------------------------------
create or replace function public.search_users(q text)
returns table (
  id uuid,
  username text,
  display_name text,
  avatar_url text,
  friendship_status text,
  friendship_id uuid,
  is_requester boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  term text := trim(q);
  pattern text;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if term is null or length(term) < 2 then
    return;
  end if;
  pattern := '%' || lower(term) || '%';

  return query
  select
    p.id,
    p.username,
    p.display_name,
    p.avatar_url,
    f.status,
    f.id,
    (f.requester_id = auth.uid()) as is_requester
  from public.profiles p
  left join auth.users u on u.id = p.id
  left join lateral (
    select fr.id, fr.status, fr.requester_id
    from public.friendships fr
    where (
      (fr.requester_id = auth.uid() and fr.addressee_id = p.id)
      or (fr.addressee_id = auth.uid() and fr.requester_id = p.id)
    )
    and fr.status in ('pending', 'accepted')
    order by case when fr.status = 'accepted' then 0 else 1 end
    limit 1
  ) f on true
  where p.id <> auth.uid()
    and p.username is not null
    and (
      lower(p.username) like pattern
      or lower(coalesce(p.display_name, '')) like pattern
      or lower(coalesce(u.email, '')) like pattern
    )
  order by
    case when lower(p.username) = lower(term) then 0 else 1 end,
    p.username
  limit 20;
end;
$$;

revoke all on function public.search_users(text) from public;
grant execute on function public.search_users(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Public play stats
-- ---------------------------------------------------------------------------
create or replace function public.profile_play_stats(target uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  allowed boolean;
  result jsonb;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select (target = auth.uid() or coalesce(p.is_public, false))
  into allowed
  from public.profiles p
  where p.id = target;

  if not found or not allowed then
    return null;
  end if;

  select jsonb_build_object(
    'gamesPlayed', coalesce((
      select count(distinct sg.game_id)::int
      from public.session_players sp
      join public.session_games sg on sg.session_id = sp.session_id
      where sp.user_id = target
    ), 0),
    'sessionsPlayed', coalesce((
      select count(distinct sp.session_id)::int
      from public.session_players sp
      where sp.user_id = target
    ), 0),
    'wins', coalesce((
      select count(*)::int
      from public.session_players sp
      join public.session_scores sc
        on sc.player_id = sp.id and sc.is_winner = true
      where sp.user_id = target
    ), 0) + coalesce((
      select count(*)::int
      from public.session_players sp
      join public.session_scores sc
        on sc.team_id = sp.team_id and sc.is_winner = true
      where sp.user_id = target and sp.team_id is not null
    ), 0),
    'recent', coalesce((
      select jsonb_agg(row_to_json(r))
      from (
        select
          s.id as session_id,
          s.title,
          s.session_date,
          s.status,
          g.id as game_id,
          g.name as game_name,
          g.thumbnail_url,
          exists (
            select 1
            from public.session_scores sc
            where sc.is_winner
              and (
                sc.player_id = sp.id
                or (sp.team_id is not null and sc.team_id = sp.team_id)
              )
          ) as won
        from public.session_players sp
        join public.sessions s on s.id = sp.session_id
        left join public.session_games sg on sg.session_id = s.id
        left join public.games g on g.id = sg.game_id
        where sp.user_id = target
        order by s.session_date desc
        limit 10
      ) r
    ), '[]'::jsonb)
  )
  into result;

  return result;
end;
$$;

revoke all on function public.profile_play_stats(uuid) from public;
grant execute on function public.profile_play_stats(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS: profiles
-- ---------------------------------------------------------------------------
drop policy if exists "Profiles are viewable by owner" on public.profiles;
drop policy if exists "Profiles are insertable by owner" on public.profiles;
drop policy if exists "Profiles are updatable by owner" on public.profiles;
drop policy if exists "Authenticated users can view profiles" on public.profiles;
drop policy if exists "Profiles insertable by owner" on public.profiles;
drop policy if exists "Profiles updatable by owner" on public.profiles;

create policy "Authenticated users can view profiles"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Profiles insertable by owner"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

create policy "Profiles updatable by owner"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- RLS: collections (public read when profile is public)
-- ---------------------------------------------------------------------------
drop policy if exists "Users manage own collections" on public.collections;
drop policy if exists "Users select own or public collections" on public.collections;
drop policy if exists "Users insert own collections" on public.collections;
drop policy if exists "Users update own collections" on public.collections;
drop policy if exists "Users delete own collections" on public.collections;

create policy "Users select own or public collections"
  on public.collections for select
  to authenticated
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.profiles p
      where p.id = collections.user_id and p.is_public = true
    )
  );

create policy "Users insert own collections"
  on public.collections for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users update own collections"
  on public.collections for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users delete own collections"
  on public.collections for delete
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users manage own collection items" on public.collection_items;
drop policy if exists "Users select own or public collection items" on public.collection_items;
drop policy if exists "Users insert own collection items" on public.collection_items;
drop policy if exists "Users update own collection items" on public.collection_items;
drop policy if exists "Users delete own collection items" on public.collection_items;

create policy "Users select own or public collection items"
  on public.collection_items for select
  to authenticated
  using (
    exists (
      select 1 from public.collections c
      join public.profiles p on p.id = c.user_id
      where c.id = collection_items.collection_id
        and (c.user_id = auth.uid() or p.is_public = true)
    )
  );

create policy "Users insert own collection items"
  on public.collection_items for insert
  to authenticated
  with check (
    exists (
      select 1 from public.collections c
      where c.id = collection_items.collection_id and c.user_id = auth.uid()
    )
  );

create policy "Users update own collection items"
  on public.collection_items for update
  to authenticated
  using (
    exists (
      select 1 from public.collections c
      where c.id = collection_items.collection_id and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.collections c
      where c.id = collection_items.collection_id and c.user_id = auth.uid()
    )
  );

create policy "Users delete own collection items"
  on public.collection_items for delete
  to authenticated
  using (
    exists (
      select 1 from public.collections c
      where c.id = collection_items.collection_id and c.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- RLS: friendships
-- ---------------------------------------------------------------------------
drop policy if exists "Users read own friendships" on public.friendships;
drop policy if exists "Users request friendships" on public.friendships;
drop policy if exists "Users update friendships" on public.friendships;
drop policy if exists "Users delete friendships" on public.friendships;

create policy "Users read own friendships"
  on public.friendships for select
  to authenticated
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

create policy "Users request friendships"
  on public.friendships for insert
  to authenticated
  with check (auth.uid() = requester_id and status = 'pending');

create policy "Users update friendships"
  on public.friendships for update
  to authenticated
  using (auth.uid() = addressee_id or auth.uid() = requester_id)
  with check (auth.uid() = addressee_id or auth.uid() = requester_id);

create policy "Users delete friendships"
  on public.friendships for delete
  to authenticated
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

-- ---------------------------------------------------------------------------
-- RLS: sessions (host write, host or participant read)
-- ---------------------------------------------------------------------------
drop policy if exists "Users manage own sessions" on public.sessions;
drop policy if exists "Users select visible sessions" on public.sessions;
drop policy if exists "Users insert own sessions" on public.sessions;
drop policy if exists "Users update own sessions" on public.sessions;
drop policy if exists "Users delete own sessions" on public.sessions;

create policy "Users select visible sessions"
  on public.sessions for select
  to authenticated
  using (public.can_view_session(id));

create policy "Users insert own sessions"
  on public.sessions for insert
  to authenticated
  with check (auth.uid() = host_id);

create policy "Users update own sessions"
  on public.sessions for update
  to authenticated
  using (auth.uid() = host_id)
  with check (auth.uid() = host_id);

create policy "Users delete own sessions"
  on public.sessions for delete
  to authenticated
  using (auth.uid() = host_id);

-- session_games
drop policy if exists "Users manage own session games" on public.session_games;
drop policy if exists "Users select session games" on public.session_games;
drop policy if exists "Users insert session games" on public.session_games;
drop policy if exists "Users update session games" on public.session_games;
drop policy if exists "Users delete session games" on public.session_games;

create policy "Users select session games"
  on public.session_games for select
  to authenticated
  using (public.can_view_session(session_id));

create policy "Users insert session games"
  on public.session_games for insert
  to authenticated
  with check (public.is_session_host(session_id));

create policy "Users update session games"
  on public.session_games for update
  to authenticated
  using (public.is_session_host(session_id))
  with check (public.is_session_host(session_id));

create policy "Users delete session games"
  on public.session_games for delete
  to authenticated
  using (public.is_session_host(session_id));

-- session_players
drop policy if exists "Users manage own session players" on public.session_players;
drop policy if exists "Users select session players" on public.session_players;
drop policy if exists "Users insert session players" on public.session_players;
drop policy if exists "Users update session players" on public.session_players;
drop policy if exists "Users delete session players" on public.session_players;

create policy "Users select session players"
  on public.session_players for select
  to authenticated
  using (public.can_view_session(session_id));

create policy "Users insert session players"
  on public.session_players for insert
  to authenticated
  with check (public.is_session_host(session_id));

create policy "Users update session players"
  on public.session_players for update
  to authenticated
  using (public.is_session_host(session_id))
  with check (public.is_session_host(session_id));

create policy "Users delete session players"
  on public.session_players for delete
  to authenticated
  using (public.is_session_host(session_id));

-- session_teams
drop policy if exists "Users select session teams" on public.session_teams;
drop policy if exists "Users insert session teams" on public.session_teams;
drop policy if exists "Users update session teams" on public.session_teams;
drop policy if exists "Users delete session teams" on public.session_teams;

create policy "Users select session teams"
  on public.session_teams for select
  to authenticated
  using (public.can_view_session(session_id));

create policy "Users insert session teams"
  on public.session_teams for insert
  to authenticated
  with check (public.is_session_host(session_id));

create policy "Users update session teams"
  on public.session_teams for update
  to authenticated
  using (public.is_session_host(session_id))
  with check (public.is_session_host(session_id));

create policy "Users delete session teams"
  on public.session_teams for delete
  to authenticated
  using (public.is_session_host(session_id));

-- session_scores
drop policy if exists "Users manage own session scores" on public.session_scores;
drop policy if exists "Users select session scores" on public.session_scores;
drop policy if exists "Users insert session scores" on public.session_scores;
drop policy if exists "Users update session scores" on public.session_scores;
drop policy if exists "Users delete session scores" on public.session_scores;

create policy "Users select session scores"
  on public.session_scores for select
  to authenticated
  using (public.can_view_session(session_id));

create policy "Users insert session scores"
  on public.session_scores for insert
  to authenticated
  with check (public.is_session_host(session_id));

create policy "Users update session scores"
  on public.session_scores for update
  to authenticated
  using (public.is_session_host(session_id))
  with check (public.is_session_host(session_id));

create policy "Users delete session scores"
  on public.session_scores for delete
  to authenticated
  using (public.is_session_host(session_id));
