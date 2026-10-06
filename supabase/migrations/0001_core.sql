-- Libro de Sabores — esquema base (perfiles, invitaciones, recetas, categorías, social)
-- Eventos privados van en 0002_events.sql

create extension if not exists pgcrypto;

-- ───────── Tipos ─────────
create type user_role as enum ('admin', 'member');
create type recipe_status as enum ('draft', 'published');
create type ingredient_kind as enum ('ingredient', 'seasoning', 'aromatic', 'liquid', 'fat', 'garnish');
create type scale_mode as enum ('linear', 'sublinear', 'fixed', 'to_taste');
create type tip_type as enum ('consejo', 'truco', 'sustitucion', 'advertencia');

-- ───────── Perfiles e invitaciones ─────────
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 60),
  avatar_url text,
  bio text check (char_length(bio) <= 280),
  branch text check (char_length(branch) <= 40),
  role user_role not null default 'member',
  created_at timestamptz not null default now()
);

create table invites (
  code text primary key check (char_length(code) >= 6),
  created_by uuid references profiles(id) on delete set null,
  role user_role not null default 'member',
  max_uses int not null default 1 check (max_uses > 0),
  uses int not null default 0,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

-- Funciones de ayuda para RLS (SECURITY DEFINER evita recursión de políticas)
create function is_member() returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from profiles where id = auth.uid()) $$;

create function is_admin() returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from profiles where id = auth.uid() and role = 'admin') $$;

-- Única vía para crear un perfil: canjear una invitación válida
create function redeem_invite(p_code text, p_display_name text, p_avatar_url text default null)
returns profiles
language plpgsql security definer set search_path = public as
$$
declare
  inv invites;
  prof profiles;
begin
  if auth.uid() is null then raise exception 'No autenticado'; end if;
  if exists (select 1 from profiles where id = auth.uid()) then
    raise exception 'Ya tienes perfil';
  end if;

  select * into inv from invites where code = p_code for update;
  if not found
     or inv.uses >= inv.max_uses
     or (inv.expires_at is not null and inv.expires_at < now()) then
    raise exception 'Código de invitación inválido o vencido';
  end if;

  update invites set uses = uses + 1 where code = p_code;

  insert into profiles (id, display_name, avatar_url, role)
  values (auth.uid(), trim(p_display_name), p_avatar_url, inv.role)
  returning * into prof;

  return prof;
end;
$$;

-- ───────── Categorías (varias dimensiones combinables) ─────────
create table categories (
  id uuid primary key default gen_random_uuid(),
  group_slug text not null,
  slug text not null unique,
  name text not null,
  icon text not null default 'utensils',
  color text not null default '#EFD5D0',
  animation_key text not null default 'soft',
  sort int not null default 0,
  is_system boolean not null default false,
  created_at timestamptz not null default now()
);

-- ───────── Recetas ─────────
create table recipes (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references profiles(id) on delete cascade,
  title text not null check (char_length(title) between 2 and 120),
  subtitle text,
  story text,
  lineage text,
  cover_url text,
  video_url text,
  servings_base numeric not null default 4 check (servings_base > 0),
  servings_label text not null default 'personas',
  portion_note text,
  prep_min int check (prep_min >= 0),
  cook_min int check (cook_min >= 0),
  rest_min int check (rest_min >= 0),
  difficulty smallint not null default 1 check (difficulty between 1 and 3),
  equipment text[] not null default '{}',
  allergens text[] not null default '{}',
  diet_tags text[] not null default '{}',
  storage_note text,
  reheat_note text,
  cost_estimate numeric,
  status recipe_status not null default 'draft',
  search tsvector,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);
create index recipes_author_idx on recipes(author_id);
create index recipes_published_idx on recipes(published_at desc) where status = 'published';
create index recipes_search_idx on recipes using gin(search);

create table recipe_categories (
  recipe_id uuid not null references recipes(id) on delete cascade,
  category_id uuid not null references categories(id) on delete cascade,
  primary key (recipe_id, category_id)
);

create table recipe_tags (
  recipe_id uuid not null references recipes(id) on delete cascade,
  tag text not null,
  primary key (recipe_id, tag)
);

create table recipe_components (
  recipe_id uuid not null references recipes(id) on delete cascade,
  component_recipe_id uuid not null references recipes(id) on delete restrict,
  factor numeric not null default 1 check (factor > 0),
  primary key (recipe_id, component_recipe_id),
  check (recipe_id <> component_recipe_id)
);

create table ingredient_groups (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references recipes(id) on delete cascade,
  name text not null default '',
  sort int not null default 0
);

create table ingredients (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references ingredient_groups(id) on delete cascade,
  recipe_id uuid not null references recipes(id) on delete cascade,
  kind ingredient_kind not null default 'ingredient',
  name text not null,
  quantity numeric,
  unit text,
  grams numeric,
  prep text,
  note text,
  substitute text,
  optional boolean not null default false,
  scale_mode scale_mode not null default 'linear',
  sort int not null default 0
);
create index ingredients_recipe_idx on ingredients(recipe_id);

create table steps (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references recipes(id) on delete cascade,
  position int not null,
  title text,
  body text not null,
  timer_seconds int check (timer_seconds > 0),
  timer_label text,
  temperature_c int,
  doneness_cue text,
  photo_url text,
  video_url text,
  tip text
);
create index steps_recipe_idx on steps(recipe_id, position);

create table tips (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references recipes(id) on delete cascade,
  type tip_type not null default 'consejo',
  body text not null,
  sort int not null default 0
);

-- ───────── Social ─────────
create table favorites (
  user_id uuid not null references profiles(id) on delete cascade,
  recipe_id uuid not null references recipes(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, recipe_id)
);

create table cook_logs (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references recipes(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  photo_url text,
  note text,
  created_at timestamptz not null default now()
);

create table comments (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references recipes(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);

-- ───────── Notificaciones ─────────
create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  kind text not null,
  recipe_id uuid references recipes(id) on delete cascade,
  title text,
  body text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on notifications(user_id, created_at desc);

create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

-- ───────── Triggers ─────────
create function recipes_touch() returns trigger language plpgsql as
$$
begin
  new.updated_at = now();
  if new.status = 'published' and (tg_op = 'INSERT' or old.status <> 'published') then
    new.published_at = now();
  end if;
  new.search =
    setweight(to_tsvector('spanish', coalesce(new.title, '')), 'A') ||
    setweight(to_tsvector('spanish', coalesce(new.subtitle, '')), 'B') ||
    setweight(to_tsvector('spanish', coalesce(new.story, '') || ' ' || coalesce(new.lineage, '')), 'C');
  return new;
end;
$$;
create trigger recipes_touch_trg before insert or update on recipes
  for each row execute function recipes_touch();

-- Al publicar: fila de notificación para todos menos el autor
create function notify_new_recipe() returns trigger language plpgsql security definer set search_path = public as
$$
begin
  if new.status = 'published' and (tg_op = 'INSERT' or old.status <> 'published') then
    insert into notifications (user_id, kind, recipe_id, title, body)
    select p.id, 'new_recipe', new.id, 'Nueva receta', new.title
    from profiles p
    where p.id <> new.author_id;
  end if;
  return new;
end;
$$;
create trigger notify_new_recipe_trg after insert or update on recipes
  for each row execute function notify_new_recipe();

-- ───────── RLS ─────────
alter table profiles           enable row level security;
alter table invites            enable row level security;
alter table categories         enable row level security;
alter table recipes            enable row level security;
alter table recipe_categories  enable row level security;
alter table recipe_tags        enable row level security;
alter table recipe_components  enable row level security;
alter table ingredient_groups  enable row level security;
alter table ingredients        enable row level security;
alter table steps              enable row level security;
alter table tips               enable row level security;
alter table favorites          enable row level security;
alter table cook_logs          enable row level security;
alter table comments           enable row level security;
alter table notifications      enable row level security;
alter table push_subscriptions enable row level security;

-- Perfiles: los miembros se ven entre sí; cada quien edita el suyo; admin puede todo
create policy profiles_read on profiles for select using (is_member());
create policy profiles_update_own on profiles for update using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from profiles where id = auth.uid()));
create policy profiles_admin_all on profiles for all using (is_admin()) with check (is_admin());

-- Invitaciones: solo admin
create policy invites_admin on invites for all using (is_admin()) with check (is_admin());

-- Categorías: miembros leen; admin gestiona
create policy categories_read on categories for select using (is_member());
create policy categories_admin on categories for all using (is_admin()) with check (is_admin());

-- Recetas: publicadas para miembros; borradores solo autor; admin lee todo (sin rastro)
create policy recipes_read on recipes for select using (
  is_member() and (status = 'published' or author_id = auth.uid() or is_admin())
);
create policy recipes_insert on recipes for insert with check (is_member() and author_id = auth.uid());
create policy recipes_update on recipes for update
  using (author_id = auth.uid() or is_admin())
  with check (author_id = auth.uid() or is_admin());
create policy recipes_delete on recipes for delete using (author_id = auth.uid() or is_admin());

-- Hijos de receta: heredan visibilidad/escritura de la receta padre
create function can_read_recipe(rid uuid) returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from recipes r where r.id = rid
     and is_member() and (r.status = 'published' or r.author_id = auth.uid() or is_admin())) $$;

create function can_write_recipe(rid uuid) returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from recipes r where r.id = rid and (r.author_id = auth.uid() or is_admin())) $$;

do $$
declare t text;
begin
  foreach t in array array['recipe_categories','recipe_tags','recipe_components','ingredient_groups','ingredients','steps','tips']
  loop
    execute format('create policy %I_read on %I for select using (can_read_recipe(recipe_id))', t, t);
    execute format('create policy %I_write on %I for all using (can_write_recipe(recipe_id)) with check (can_write_recipe(recipe_id))', t, t);
  end loop;
end $$;

-- Favoritos: privados de cada quien
create policy favorites_own on favorites for all using (user_id = auth.uid()) with check (user_id = auth.uid() and can_read_recipe(recipe_id));

-- "Yo la hice" y comentarios: los lee quien lee la receta; escribe cada quien lo suyo
create policy cook_logs_read on cook_logs for select using (can_read_recipe(recipe_id));
create policy cook_logs_write on cook_logs for insert with check (user_id = auth.uid() and can_read_recipe(recipe_id));
create policy cook_logs_delete on cook_logs for delete using (user_id = auth.uid() or is_admin());

create policy comments_read on comments for select using (can_read_recipe(recipe_id));
create policy comments_write on comments for insert with check (user_id = auth.uid() and can_read_recipe(recipe_id));
create policy comments_delete on comments for delete using (user_id = auth.uid() or is_admin());

-- Notificaciones y suscripciones push: solo del dueño
create policy notifications_own_read on notifications for select using (user_id = auth.uid());
create policy notifications_own_update on notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy push_own on push_subscriptions for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ───────── Storage ─────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', false, 1048576, array['image/webp','image/jpeg','image/png']),
  ('recipe-photos', 'recipe-photos', false, 2097152, array['image/webp','image/jpeg','image/png'])
on conflict (id) do nothing;

create policy storage_read_members on storage.objects for select
  using (bucket_id in ('avatars','recipe-photos') and is_member());

create policy storage_write_own on storage.objects for insert
  with check (
    bucket_id in ('avatars','recipe-photos')
    and is_member()
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy storage_update_own on storage.objects for update
  using (bucket_id in ('avatars','recipe-photos') and (storage.foldername(name))[1] = auth.uid()::text);

create policy storage_delete_own on storage.objects for delete
  using (bucket_id in ('avatars','recipe-photos') and ((storage.foldername(name))[1] = auth.uid()::text or is_admin()));
