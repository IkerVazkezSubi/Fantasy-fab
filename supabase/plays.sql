-- ============================================================================
-- PIZARRA · tabla de jugadas
-- Pega este archivo entero en Supabase -> SQL Editor -> Run.
--
-- Seguridad: RLS activado y SIN políticas. La clave pública (anon) no puede
-- leer ni escribir nada. Solo el servidor de la web, con la clave service_role,
-- accede a las jugadas (y solo el rol "coach" puede escribir, lo controla la
-- propia web).
--
-- Formato de "steps" (un elemento por paso; el primero es la posición inicial):
--   {
--     "text": "Explicación corta del paso",
--     "players":   { "1": {"x":50,"y":74}, ... "5": {"x":34,"y":58} },
--     "defenders": [ {"id":"d1","x":48,"y":70} ],
--     "ball": "1",
--     "actions": [
--       {"type":"move",    "player":"3"},          -- línea continua con flecha
--       {"type":"dribble", "player":"1"},          -- zigzag con flecha
--       {"type":"screen",  "player":"5"},          -- línea terminada en T
--       {"type":"pass",    "from":"1", "to":"2"}   -- línea discontinua
--     ]
--   }
-- Las coordenadas van de 0 a 100 sobre la media pista: x de izquierda a derecha,
-- y de 0 (línea de fondo, bajo el aro) a 100 (línea de medio campo).
-- Los movimientos se dibujan desde la posición del paso anterior a la del paso.
-- ============================================================================

create table if not exists plays (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  team        text not null default 'nacional-masculino', -- ver lib/teams.js
  category    text not null,
  description text,
  sort_order  int  not null default 0,
  steps       jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists plays_category_idx on plays (category);

alter table plays enable row level security;

create or replace function plays_touch_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_plays_updated_at on plays;
create trigger trg_plays_updated_at
  before update on plays
  for each row execute function plays_touch_updated_at();

-- Jugada de ejemplo (se puede borrar después)
insert into plays (name, team, category, description, sort_order, steps)
select
  'Bloqueo directo (ejemplo)',
  'nacional-masculino',
  'Ataque',
  'Jugada de ejemplo para probar el visor.',
  0,
  '[
    {"text":"Posición inicial: el 1 lleva el balón y el 5 espera para bloquear.","players":{"1":{"x":50,"y":78},"2":{"x":10,"y":52},"3":{"x":90,"y":52},"4":{"x":72,"y":28},"5":{"x":30,"y":56}},"defenders":[],"ball":"1","actions":[]},
    {"text":"El 5 sale a hacer el bloqueo para el 1.","players":{"1":{"x":50,"y":78},"2":{"x":10,"y":52},"3":{"x":90,"y":52},"4":{"x":72,"y":28},"5":{"x":41,"y":67}},"defenders":[],"ball":"1","actions":[{"type":"screen","player":"5"}]},
    {"text":"El 1 bota usando el bloqueo y entra hacia la derecha.","players":{"1":{"x":64,"y":56},"2":{"x":10,"y":52},"3":{"x":90,"y":52},"4":{"x":72,"y":28},"5":{"x":41,"y":67}},"defenders":[],"ball":"1","actions":[{"type":"dribble","player":"1"}]},
    {"text":"El 5 abre hacia el aro después de bloquear.","players":{"1":{"x":64,"y":56},"2":{"x":10,"y":52},"3":{"x":90,"y":52},"4":{"x":72,"y":28},"5":{"x":50,"y":26}},"defenders":[],"ball":"1","actions":[{"type":"move","player":"5"}]},
    {"text":"El 1 pasa al 5, que ataca el aro.","players":{"1":{"x":64,"y":56},"2":{"x":10,"y":52},"3":{"x":90,"y":52},"4":{"x":72,"y":28},"5":{"x":50,"y":26}},"defenders":[],"ball":"5","actions":[{"type":"pass","from":"1","to":"5"}]}
  ]'::jsonb
where not exists (select 1 from plays where name = 'Bloqueo directo (ejemplo)');
