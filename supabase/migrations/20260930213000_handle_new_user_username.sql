-- Assign username on signup (friends / public profiles)

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base text;
  candidate text;
  n int := 0;
begin
  base := lower(regexp_replace(
    coalesce(
      nullif(regexp_replace(
        coalesce(
          nullif(new.raw_user_meta_data->>'display_name', ''),
          nullif(new.raw_user_meta_data->>'full_name', ''),
          nullif(new.raw_user_meta_data->>'name', ''),
          split_part(new.email, '@', 1)
        ),
        '[^a-zA-Z0-9_]',
        '',
        'g'
      ), ''),
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
  while exists (
    select 1 from public.profiles where lower(username) = candidate
  ) loop
    n := n + 1;
    candidate := left(base, 16) || n::text;
  end loop;

  insert into public.profiles (id, display_name, avatar_url, username, is_public)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data->>'display_name', ''),
      nullif(new.raw_user_meta_data->>'full_name', ''),
      nullif(new.raw_user_meta_data->>'name', ''),
      split_part(new.email, '@', 1)
    ),
    coalesce(
      nullif(new.raw_user_meta_data->>'avatar_url', ''),
      nullif(new.raw_user_meta_data->>'picture', '')
    ),
    candidate,
    false
  );
  insert into public.collections (user_id, name)
  values (new.id, 'My Collection');
  return new;
end;
$$;
