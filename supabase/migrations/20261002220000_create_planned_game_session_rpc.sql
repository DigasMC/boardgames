-- Create planned session + game link as the authenticated host (bypasses RLS safely).

create or replace function public.create_planned_game_session(
  p_title text,
  p_session_date timestamptz,
  p_location text,
  p_notes text,
  p_game_id uuid,
  p_scoring_mode text default 'individual'
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
  text
) from public;

grant execute on function public.create_planned_game_session(
  text,
  timestamptz,
  text,
  text,
  uuid,
  text
) to authenticated;
