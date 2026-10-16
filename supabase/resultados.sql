-- ============================================================================
-- PIZARRA · resultado de los partidos
-- Pega esto en Supabase -> SQL Editor -> Run. Se puede ejecutar más de una vez.
-- ============================================================================
alter table events add column if not exists home_score int;
alter table events add column if not exists away_score int;
