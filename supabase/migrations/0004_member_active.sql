-- Quitar acceso sin borrar recetas: un miembro puede desactivarse (reversible).
alter table profiles add column if not exists active boolean not null default true;

create or replace function is_member() returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from profiles where id = auth.uid() and active) $$;

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from profiles where id = auth.uid() and role = 'admin' and active) $$;

-- Nadie puede cambiarse su propio rol ni reactivarse
create or replace function own_flags_unchanged(r user_role, a boolean) returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from profiles where id = auth.uid() and role = r and active = a) $$;

drop policy if exists profiles_update_own on profiles;
create policy profiles_update_own on profiles for update
  using (id = auth.uid() and is_member())
  with check (id = auth.uid() and own_flags_unchanged(role, active));
