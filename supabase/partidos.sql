-- ============================================================================
-- PIZARRA · datos de los partidos en el calendario
-- Añade a "events" los equipos que juegan, el equipo del club y la competición.
-- Pega esto en Supabase -> SQL Editor -> Run. Se puede ejecutar más de una vez.
-- ============================================================================
alter table events add column if not exists home_team   text;
alter table events add column if not exists away_team   text;
alter table events add column if not exists club_team   text;
alter table events add column if not exists competition text;
