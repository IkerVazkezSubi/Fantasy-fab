-- ============================================================================
-- PIZARRA · jugadas por equipo
-- Añade la columna "team" a la tabla de jugadas. Las jugadas que ya existen
-- pasan a "Nacional masculino" (luego se pueden cambiar de equipo desde el editor).
-- Pega esto en Supabase -> SQL Editor -> Run. Se puede ejecutar más de una vez.
-- ============================================================================
alter table plays add column if not exists team text not null default 'nacional-masculino';
create index if not exists plays_team_idx on plays (team);
