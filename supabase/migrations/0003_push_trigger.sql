-- Al publicar una receta, avisa a la Edge Function send-push (Web Push a la familia).
-- El secreto compartido NO va en el repo: se guarda en private_config (sin políticas = inaccesible por la API).

create extension if not exists pg_net;

create table if not exists private_config (key text primary key, value text not null);
alter table private_config enable row level security;

create or replace function push_new_recipe() returns trigger
language plpgsql security definer set search_path = public, extensions as
$$
declare s text;
begin
  select value into s from private_config where key = 'webhook_secret';
  if s is null then return new; end if;
  perform net.http_post(
    url := 'https://esygnkyzalhnninvypvw.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secret', s),
    body := jsonb_build_object('record', to_jsonb(new))
  );
  return new;
end;
$$;

drop trigger if exists push_on_insert on recipes;
create trigger push_on_insert after insert on recipes
  for each row when (new.status = 'published') execute function push_new_recipe();

drop trigger if exists push_on_publish on recipes;
create trigger push_on_publish after update on recipes
  for each row when (old.status <> 'published' and new.status = 'published') execute function push_new_recipe();
