-- ============================================================================
-- PIZARRA · tabla del calendario (entrenos, partidos y otros eventos)
-- Pega este archivo entero en Supabase -> SQL Editor -> Run.
--
-- Igual que "plays": RLS activado y SIN políticas. La clave pública no puede leer
-- ni escribir nada; solo el servidor de la web (clave service_role) accede, y solo
-- el rol "coach" puede crear, cambiar o borrar eventos.
-- ============================================================================

create table if not exists events (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  kind        text not null default 'Entreno',
  starts_at   timestamptz not null,
  location    text,
  notes       text,
  home_team   text,   -- solo partidos: equipo local
  away_team   text,   -- solo partidos: equipo visitante
  club_team   text,   -- solo partidos: equipo del club (ver lib/teams.js)
  competition text,   -- solo partidos: por ejemplo "Liga Provincial Masculina"
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists events_starts_at_idx on events (starts_at);

alter table events enable row level security;

create or replace function events_touch_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_events_updated_at on events;
create trigger trg_events_updated_at
  before update on events
  for each row execute function events_touch_updated_at();
