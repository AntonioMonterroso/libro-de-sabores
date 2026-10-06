-- Eventos privados: solo el creador y los invitados los ven. Sin excepción para el rol admin.

create table events (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references profiles(id) on delete cascade,
  title text not null check (char_length(title) between 2 and 120),
  description text,
  location text,
  map_url text,
  cover_url text,
  starts_at timestamptz not null,
  timezone text not null default 'UTC',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table event_invitees (
  event_id uuid not null references events(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  rsvp text not null default 'pending' check (rsvp in ('pending', 'yes', 'maybe', 'no')),
  muted boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

create table event_dishes (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  recipe_id uuid references recipes(id) on delete set null,
  custom_name text,
  assigned_to uuid references profiles(id) on delete set null,
  sort int not null default 0,
  check (recipe_id is not null or custom_name is not null)
);

create table event_reminders (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  minutes_before int not null check (minutes_before >= 0),
  fire_at timestamptz not null,
  sent_at timestamptz,
  unique (event_id, minutes_before)
);
create index event_reminders_due_idx on event_reminders (fire_at) where sent_at is null;

alter table notifications add column if not exists event_id uuid references events(id) on delete cascade;

-- ───────── Acceso (sin admin) ─────────
create function is_event_creator(eid uuid) returns boolean
language sql stable security definer set search_path = public as
$$ select is_member() and exists (select 1 from events where id = eid and creator_id = auth.uid()) $$;

create function is_event_member(eid uuid) returns boolean
language sql stable security definer set search_path = public as
$$ select is_member() and (
     exists (select 1 from events where id = eid and creator_id = auth.uid())
  or exists (select 1 from event_invitees where event_id = eid and user_id = auth.uid())) $$;

alter table events          enable row level security;
alter table event_invitees  enable row level security;
alter table event_dishes    enable row level security;
alter table event_reminders enable row level security;

create policy events_read   on events for select using (is_member() and (creator_id = auth.uid() or is_event_member(id)));
create policy events_insert on events for insert with check (is_member() and creator_id = auth.uid());
create policy events_update on events for update using (is_member() and creator_id = auth.uid()) with check (creator_id = auth.uid());
create policy events_delete on events for delete using (is_member() and creator_id = auth.uid());

create policy invitees_read   on event_invitees for select using (is_event_member(event_id));
create policy invitees_insert on event_invitees for insert with check (is_event_creator(event_id));
create policy invitees_delete on event_invitees for delete using (is_event_creator(event_id));
create policy invitees_update on event_invitees for update using (is_member() and user_id = auth.uid()) with check (user_id = auth.uid());

create policy dishes_read  on event_dishes for select using (is_event_member(event_id));
create policy dishes_write on event_dishes for all using (is_event_creator(event_id)) with check (is_event_creator(event_id));

create policy reminders_creator on event_reminders for all using (is_event_creator(event_id)) with check (is_event_creator(event_id));

-- Un invitado solo puede cambiar rsvp/muted, nunca moverse a otro evento
create function invitee_lock() returns trigger language plpgsql as
$$
begin
  if new.event_id <> old.event_id or new.user_id <> old.user_id then
    raise exception 'No se puede cambiar el evento ni la persona';
  end if;
  return new;
end;
$$;
create trigger invitee_lock_trg before update on event_invitees for each row execute function invitee_lock();

-- ───────── Avisos solo a quien corresponde ─────────
create function push_users(uids uuid[], p_title text, p_body text, p_url text, p_tag text) returns void
language plpgsql security definer set search_path = public, extensions as
$$
declare s text;
begin
  select value into s from private_config where key = 'webhook_secret';
  if s is null or coalesce(array_length(uids, 1), 0) = 0 then return; end if;
  perform net.http_post(
    url := 'https://esygnkyzalhnninvypvw.supabase.co/functions/v1/send-event-push',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secret', s),
    body := jsonb_build_object('user_ids', to_jsonb(uids), 'title', p_title, 'body', p_body, 'url', p_url, 'tag', p_tag)
  );
end;
$$;
revoke all on function push_users(uuid[], text, text, text, text) from public, anon, authenticated;

create function notify_invitee() returns trigger language plpgsql security definer set search_path = public as
$$
declare ev events;
begin
  select * into ev from events where id = new.event_id;
  if new.user_id = ev.creator_id then return new; end if;
  insert into notifications (user_id, kind, event_id, title, body)
  values (new.user_id, 'event_invite', ev.id, 'Tienes una invitación', ev.title);
  perform push_users(array[new.user_id], 'Tienes una invitación', ev.title, '#/evento/' || ev.id, 'evento-' || ev.id);
  return new;
end;
$$;
create trigger notify_invitee_trg after insert on event_invitees for each row execute function notify_invitee();

create function events_after_update() returns trigger language plpgsql security definer set search_path = public as
$$
declare uids uuid[];
begin
  new.updated_at := now();
  return new;
end;
$$;

create function events_touch() returns trigger language plpgsql as
$$ begin new.updated_at := now(); return new; end; $$;
create trigger events_touch_trg before update on events for each row execute function events_touch();
drop function events_after_update();

create function events_changed() returns trigger language plpgsql security definer set search_path = public as
$$
declare uids uuid[]; what text;
begin
  if new.starts_at is distinct from old.starts_at then
    update event_reminders
       set fire_at = new.starts_at - make_interval(mins => minutes_before),
           sent_at = case when new.starts_at - make_interval(mins => minutes_before) > now() then null else sent_at end
     where event_id = new.id;
    what := 'Cambió la fecha o la hora';
  elsif new.location is distinct from old.location then
    what := 'Cambió el lugar';
  else
    return new;
  end if;
  select array_agg(user_id) into uids from event_invitees where event_id = new.id and user_id <> new.creator_id;
  if uids is null then return new; end if;
  insert into notifications (user_id, kind, event_id, title, body)
  select u, 'event_update', new.id, what, new.title from unnest(uids) u;
  perform push_users(uids, what, new.title, '#/evento/' || new.id, 'evento-' || new.id);
  return new;
end;
$$;
create trigger events_changed_trg after update on events for each row execute function events_changed();

-- Recordatorios: cada minuto revisa los que ya tocan
create function process_event_reminders() returns int
language plpgsql security definer set search_path = public as
$$
declare r record; uids uuid[]; msg text; n int := 0;
begin
  for r in
    select er.id, er.minutes_before, er.fire_at, e.id as eid, e.title
      from event_reminders er join events e on e.id = er.event_id
     where er.sent_at is null and er.fire_at <= now()
     for update of er skip locked
  loop
    update event_reminders set sent_at = now() where id = r.id;
    if r.fire_at < now() - interval '30 minutes' then continue; end if;
    msg := case r.minutes_before
      when 0 then 'Es hora: ' || r.title
      when 10 then 'En 10 minutos: ' || r.title
      when 30 then 'En media hora: ' || r.title
      when 60 then 'En 1 hora: ' || r.title
      when 180 then 'En 3 horas: ' || r.title
      when 1440 then 'Mañana: ' || r.title
      when 4320 then 'En 3 días: ' || r.title
      when 10080 then 'En una semana: ' || r.title
      else 'Pronto: ' || r.title end;
    select array_agg(user_id) into uids from event_invitees where event_id = r.eid and not muted;
    if uids is null then continue; end if;
    insert into notifications (user_id, kind, event_id, title, body)
    select u, 'event_reminder', r.eid, 'Recordatorio', msg from unnest(uids) u;
    perform push_users(uids, 'Recordatorio', msg, '#/evento/' || r.eid, 'recordatorio-' || r.id);
    n := n + 1;
  end loop;
  return n;
end;
$$;
revoke all on function process_event_reminders() from public, anon, authenticated;

create extension if not exists pg_cron;
select cron.schedule('event-reminders', '* * * * *', 'select public.process_event_reminders()');
