-- ============================================================================
-- FANTASY FAB HUELVA · esquema de base de datos
-- Liga Nacional N1 Masculina, Grupo A (Federación Andaluza de Baloncesto)
--
-- Cómo usar: pega este archivo entero en Supabase → SQL Editor → Run.
-- Se puede ejecutar una sola vez sobre un proyecto nuevo.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. EQUIPOS REALES DE LA COMPETICIÓN
-- ---------------------------------------------------------------------------
create table if not exists teams (
  id           bigint generated always as identity primary key,
  name         text not null unique,
  short_name   text
);

-- ---------------------------------------------------------------------------
-- 2. JUGADORES REALES
-- ---------------------------------------------------------------------------
create type player_position as enum ('base', 'escolta', 'alero', 'ala-pivot', 'pivot');

create table if not exists players (
  id              bigint generated always as identity primary key,
  team_id         bigint not null references teams(id) on delete cascade,
  full_name       text not null,
  position        player_position not null,
  initial_price   numeric(6,2) not null default 10.0,
  current_price   numeric(6,2) not null default 10.0,
  active          boolean not null default true,
  created_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 3. PARTIDOS Y JORNADAS
-- ---------------------------------------------------------------------------
create table if not exists matches (
  id              bigint generated always as identity primary key,
  jornada         int not null,
  match_date      date,
  home_team_id    bigint not null references teams(id),
  away_team_id    bigint not null references teams(id),
  home_score      int,
  away_score      int,
  -- se rellena automáticamente al guardar el resultado (ver trigger más abajo)
  winner_team_id  bigint references teams(id),
  finished        boolean not null default false
);

create or replace function set_match_winner() returns trigger as $$
begin
  if new.home_score is not null and new.away_score is not null then
    if new.home_score > new.away_score then
      new.winner_team_id := new.home_team_id;
    elsif new.away_score > new.home_score then
      new.winner_team_id := new.away_team_id;
    else
      new.winner_team_id := null; -- empate (no debería pasar en baloncesto, pero por si acaso)
    end if;
    new.finished := true;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_set_match_winner on matches;
create trigger trg_set_match_winner
  before insert or update on matches
  for each row execute function set_match_winner();

-- ---------------------------------------------------------------------------
-- 4. ESTADÍSTICAS DE CADA JUGADOR EN CADA PARTIDO
--    Entrada MÍNIMA obligatoria: minutes + pir.
--    El resto de columnas son opcionales, solo para mostrar en la ficha.
-- ---------------------------------------------------------------------------
create table if not exists player_match_stats (
  id              bigint generated always as identity primary key,
  match_id        bigint not null references matches(id) on delete cascade,
  player_id       bigint not null references players(id) on delete cascade,
  minutes         numeric(4,1) not null default 0,
  pir             numeric(5,1) not null,       -- Valoración/PIR oficial (puede ser negativa)
  points          int,                          -- opcionales, solo informativos
  rebounds        int,
  assists         int,
  steals          int,
  blocks          int,
  turnovers       int,
  -- calculado automáticamente, no lo rellena el admin a mano:
  fantasy_points  numeric(6,1),
  unique (match_id, player_id)
);

-- Bonus fijo por jugar en el equipo ganador de ese partido.
-- Cambia este valor si quieres ajustar el reglamento.
create or replace function calc_fantasy_points() returns trigger as $$
declare
  v_team_id      bigint;
  v_winner_id    bigint;
  v_win_bonus    numeric := 2.0;
begin
  select team_id into v_team_id from players where id = new.player_id;
  select winner_team_id into v_winner_id from matches where id = new.match_id;

  new.fantasy_points := new.pir + case
    when v_winner_id is not null and v_winner_id = v_team_id then v_win_bonus
    else 0
  end;

  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_calc_fantasy_points on player_match_stats;
create trigger trg_calc_fantasy_points
  before insert or update on player_match_stats
  for each row execute function calc_fantasy_points();

-- Tras guardar la valoración, el precio del jugador sube o baja.
-- Factor de mercado: 0.15M por cada punto de PIR. Precio mínimo: 1.0M.
create or replace function update_player_price() returns trigger as $$
declare
  v_factor numeric := 0.15;
begin
  update players
  set current_price = greatest(current_price + round(new.fantasy_points * v_factor, 1), 1.0)
  where id = new.player_id;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_update_player_price on player_match_stats;
create trigger trg_update_player_price
  after insert on player_match_stats
  for each row execute function update_player_price();

-- ---------------------------------------------------------------------------
-- 5. MANAGERS (perfil que extiende a cada usuario autenticado)
-- ---------------------------------------------------------------------------
create table if not exists profiles (
  id               uuid primary key references auth.users(id) on delete cascade,
  display_name     text not null,
  budget_remaining numeric(7,2) not null default 100.0,
  is_admin         boolean not null default false,
  created_at       timestamptz not null default now()
);

-- Crea automáticamente el perfil (con 100M de presupuesto) al registrarse.
create or replace function handle_new_user() returns trigger as $$
begin
  insert into public.profiles (id, display_name, budget_remaining)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)), 100.0);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_handle_new_user on auth.users;
create trigger trg_handle_new_user
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------------------------------------------------------------------------
-- 6. PLANTILLA DE CADA MANAGER (qué jugadores posee)
-- ---------------------------------------------------------------------------
create table if not exists roster (
  id               bigint generated always as identity primary key,
  manager_id       uuid not null references profiles(id) on delete cascade,
  player_id        bigint not null references players(id) on delete cascade,
  purchase_price   numeric(6,2) not null,
  acquired_at      timestamptz not null default now(),
  unique (manager_id, player_id)
);

-- Máximo 10 jugadores por plantilla, y solo si sigue disponible.
create or replace function buy_player(p_player_id bigint) returns void as $$
declare
  v_manager_id   uuid := auth.uid();
  v_price        numeric;
  v_budget       numeric;
  v_squad_size   int;
  v_already_sold boolean;
begin
  if v_manager_id is null then
    raise exception 'Debes iniciar sesión.';
  end if;

  select current_price into v_price from players where id = p_player_id and active;
  if v_price is null then
    raise exception 'Jugador no disponible.';
  end if;

  select exists(select 1 from roster where player_id = p_player_id) into v_already_sold;
  if v_already_sold then
    raise exception 'Ese jugador ya pertenece a otro manager.';
  end if;

  select count(*) into v_squad_size from roster where manager_id = v_manager_id;
  if v_squad_size >= 10 then
    raise exception 'Tu plantilla ya tiene 10 jugadores (máximo).';
  end if;

  select budget_remaining into v_budget from profiles where id = v_manager_id;
  if v_budget < v_price then
    raise exception 'Presupuesto insuficiente (necesitas %M, tienes %M).', v_price, v_budget;
  end if;

  insert into roster (manager_id, player_id, purchase_price) values (v_manager_id, p_player_id, v_price);
  update profiles set budget_remaining = budget_remaining - v_price where id = v_manager_id;
end;
$$ language plpgsql security definer;

-- Vender: se recupera el 95% del precio actual (pequeña comisión de mercado
-- para que no se pueda comprar/vender sin coste como truco).
create or replace function sell_player(p_player_id bigint) returns void as $$
declare
  v_manager_id uuid := auth.uid();
  v_price      numeric;
  v_sell_tax   numeric := 0.95;
begin
  if v_manager_id is null then
    raise exception 'Debes iniciar sesión.';
  end if;

  select current_price into v_price from players where id = p_player_id;

  delete from roster where manager_id = v_manager_id and player_id = p_player_id;
  if not found then
    raise exception 'No tienes ese jugador en tu plantilla.';
  end if;

  update profiles
  set budget_remaining = budget_remaining + round(v_price * v_sell_tax, 1)
  where id = v_manager_id;

  delete from lineups where manager_id = v_manager_id and player_id = p_player_id;
end;
$$ language plpgsql security definer;

-- ---------------------------------------------------------------------------
-- 7. ALINEACIÓN TITULAR POR JORNADA (foto fija: quién fue titular esa semana)
-- ---------------------------------------------------------------------------
create table if not exists lineups (
  id          bigint generated always as identity primary key,
  manager_id  uuid not null references profiles(id) on delete cascade,
  jornada     int not null,
  player_id   bigint not null references players(id) on delete cascade,
  unique (manager_id, jornada, player_id)
);

-- Fija (o cambia) el quinteto titular de una jornada. Reemplaza el anterior.
create or replace function set_lineup(p_jornada int, p_player_ids bigint[]) returns void as $$
declare
  v_manager_id uuid := auth.uid();
  v_owned_count int;
begin
  if v_manager_id is null then
    raise exception 'Debes iniciar sesión.';
  end if;

  if array_length(p_player_ids, 1) <> 5 then
    raise exception 'El quinteto titular debe tener exactamente 5 jugadores.';
  end if;

  select count(*) into v_owned_count
  from roster where manager_id = v_manager_id and player_id = any(p_player_ids);
  if v_owned_count <> 5 then
    raise exception 'Solo puedes alinear jugadores de tu propia plantilla.';
  end if;

  delete from lineups where manager_id = v_manager_id and jornada = p_jornada;
  insert into lineups (manager_id, jornada, player_id)
  select v_manager_id, p_jornada, unnest(p_player_ids);
end;
$$ language plpgsql security definer;

-- ---------------------------------------------------------------------------
-- 8. CLASIFICACIÓN: vista con los puntos de cada manager por jornada y totales
-- ---------------------------------------------------------------------------
create or replace view manager_jornada_points as
select
  l.manager_id,
  l.jornada,
  sum(coalesce(pms.fantasy_points, 0)) as jornada_points
from lineups l
join player_match_stats pms
  on pms.player_id = l.player_id
join matches m
  on m.id = pms.match_id and m.jornada = l.jornada
group by l.manager_id, l.jornada;

create or replace view manager_standings as
select
  p.id as manager_id,
  p.display_name,
  coalesce(sum(mjp.jornada_points), 0) as total_points
from profiles p
left join manager_jornada_points mjp on mjp.manager_id = p.id
group by p.id, p.display_name
order by total_points desc;

-- ---------------------------------------------------------------------------
-- 9. SEGURIDAD (Row Level Security)
-- ---------------------------------------------------------------------------
alter table teams enable row level security;
alter table players enable row level security;
alter table matches enable row level security;
alter table player_match_stats enable row level security;
alter table profiles enable row level security;
alter table roster enable row level security;
alter table lineups enable row level security;

-- Lectura pública (datos de la liga y clasificaciones son públicos)
create policy "public read teams" on teams for select using (true);
create policy "public read players" on players for select using (true);
create policy "public read matches" on matches for select using (true);
create policy "public read stats" on player_match_stats for select using (true);
create policy "public read profiles" on profiles for select using (true);
create policy "public read roster" on roster for select using (true);
create policy "public read lineups" on lineups for select using (true);

-- Escritura de datos de liga (equipos, jugadores, partidos, estadísticas):
-- solo administradores.
create policy "admin write teams" on teams for all
  using (exists(select 1 from profiles where id = auth.uid() and is_admin))
  with check (exists(select 1 from profiles where id = auth.uid() and is_admin));

create policy "admin write players" on players for all
  using (exists(select 1 from profiles where id = auth.uid() and is_admin))
  with check (exists(select 1 from profiles where id = auth.uid() and is_admin));

create policy "admin write matches" on matches for all
  using (exists(select 1 from profiles where id = auth.uid() and is_admin))
  with check (exists(select 1 from profiles where id = auth.uid() and is_admin));

create policy "admin write stats" on player_match_stats for all
  using (exists(select 1 from profiles where id = auth.uid() and is_admin))
  with check (exists(select 1 from profiles where id = auth.uid() and is_admin));

-- Cada manager solo edita su propio perfil (no su budget/is_admin: eso solo vía RPC/servidor)
create policy "self update profile name" on profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- roster y lineups se gestionan únicamente a través de las funciones
-- buy_player / sell_player / set_lineup (security definer), no con INSERT/DELETE directos.
-- Por eso no añadimos policies de escritura directa para managers en estas tablas.

-- ============================================================================
-- FIN DEL ESQUEMA
-- Siguiente paso: en Supabase → Authentication, crea tu primer usuario admin
-- y luego ejecuta:
--   update profiles set is_admin = true where id = '<uuid-de-ese-usuario>';
-- ============================================================================
