-- Repair session RLS if policies were missing or drifted on remote projects.

drop policy if exists "Users insert own sessions" on public.sessions;
create policy "Users insert own sessions"
  on public.sessions for insert
  to authenticated
  with check (auth.uid() = host_id);

drop policy if exists "Users select visible sessions" on public.sessions;
create policy "Users select visible sessions"
  on public.sessions for select
  to authenticated
  using (public.can_view_session(id));
