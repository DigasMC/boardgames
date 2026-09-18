-- Enforce one game per session on session_games.

-- Keep the lowest sort_order (then id) row per session; drop extras.
delete from public.session_games sg
using public.session_games keeper
where sg.session_id = keeper.session_id
  and sg.id <> keeper.id
  and (
    sg.sort_order > keeper.sort_order
    or (sg.sort_order = keeper.sort_order and sg.id > keeper.id)
  );

-- Drop scores that no longer match the kept session game.
delete from public.session_scores ss
where not exists (
  select 1
  from public.session_games sg
  where sg.session_id = ss.session_id
    and sg.game_id = ss.game_id
);

-- One session_games row per session.
create unique index if not exists session_games_session_id_unique
  on public.session_games (session_id);
