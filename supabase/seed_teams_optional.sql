-- Opcional: equipos reales del Grupo A (Liga Nacional N1 Masculina, temp. 2026/27)
-- que aparecen en el calendario público. Revisa y corrige nombres/añade los que
-- falten antes de usarlo — puede no estar completo ni 100% actualizado.
-- Los jugadores NO se incluyen: añádelos desde el panel /admin partido a partido.

insert into teams (name) values
  ('Maquinarias del Odiel CB Gibraleón'),
  ('CD Baloncesto Huelva La Luz'),
  ('CB Fresas - Safa Reyes Sevilla'),
  ('CB Lepe Alius El Jamón'),
  ('Barneto Modas La Palma 95'),
  ('Club Náutico Sevilla'),
  ('CB Coria'),
  ('CB Ciudad de Palos'),
  ('Real Círculo de Labradores'),
  ('Círculo Mercantil e Industrial'),
  ('CB Bonares'),
  ('Sección Deportiva Aljaraque')
on conflict (name) do nothing;
