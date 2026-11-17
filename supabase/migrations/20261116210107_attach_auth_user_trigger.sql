-- The signup function existed, but no migration attached it to auth.users.
-- Fresh local databases therefore created users without a profile or collection.

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
