-- ============================================================
-- Serenagri AI - Lock role updates for authenticated users
-- Migration 004: Prevent clients from changing their own role
-- ============================================================

create or replace function public.prevent_profile_role_change()
returns trigger
language plpgsql
as $$
declare
  jwt_role text := current_setting('request.jwt.claim.role', true);
begin
  if new.role is distinct from old.role
     and coalesce(jwt_role, '') not in ('', 'service_role', 'supabase_admin') then
    raise exception 'Profile role cannot be changed by authenticated users';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_role_immutable on public.profiles;

create trigger profiles_role_immutable
  before update on public.profiles
  for each row execute procedure public.prevent_profile_role_change();
