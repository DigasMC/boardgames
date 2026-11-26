-- Allow service-role callers (PAT / MCP) to create sessions for a verified host.

-- Drop prior 6-arg overload so only the host-aware signature remains.
drop function if exists public.create_planned_game_session(
  text,
  timestamptz,
  text,
  text,
  uuid,
  text
);

create or replace function public.create_planned_game_session(
  p_title text,
  p_session_date timestamptz,
  p_location text,
  p_notes text,
  p_game_id uuid,
  p_scoring_mode text default 'individual',
  p_host_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  sid uuid;
  mode text := case when p_scoring_mode = 'team' then 'team' else 'individual' end;
begin
  -- Browser / user JWT: always auth.uid().
  -- Service role (PAT path): may pass p_host_id after the API verified the token.
  if uid is null and auth.role() = 'service_role' and p_host_id is not null then
    uid := p_host_id;
  end if;

  if uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  if not exists (select 1 from public.profiles where id = uid) then
    raise exception 'profile not found for authenticated user' using errcode = '23503';
  end if;

  insert into public.sessions (
    host_id,
    title,
    session_date,
    location,
    notes,
    status,
    scoring_mode
  )
  values (
    uid,
    coalesce(nullif(trim(p_title), ''), 'Game Night'),
    coalesce(p_session_date, now()),
    p_location,
    p_notes,
    'planned',
    mode
  )
  returning id into sid;

  insert into public.session_games (session_id, game_id, sort_order)
  values (sid, p_game_id, 0);

  return sid;
end;
$$;

revoke all on function public.create_planned_game_session(
  text,
  timestamptz,
  text,
  text,
  uuid,
  text,
  uuid
) from public;

grant execute on function public.create_planned_game_session(
  text,
  timestamptz,
  text,
  text,
  uuid,
  text,
  uuid
) to authenticated;

grant execute on function public.create_planned_game_session(
  text,
  timestamptz,
  text,
  text,
  uuid,
  text,
  uuid
) to service_role;
