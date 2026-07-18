-- Agregar partido de 3er puesto (M103 / football-data 537389).
-- Idempotente: no inserta si ya existe external_id 537389 o fase '3p'.
-- Ejecutar en Supabase → SQL Editor.

BEGIN;

ALTER TABLE partidos DROP CONSTRAINT IF EXISTS partidos_fase_check;
ALTER TABLE partidos
  ADD CONSTRAINT partidos_fase_check
  CHECK (fase IN ('grupos', 'r32', 'r16', 'qf', 'sf', '3p', 'final'));

-- Dejar el 3er puesto justo antes de la final en orden
UPDATE partidos
SET orden = orden + 1
WHERE fase = 'final'
  AND NOT EXISTS (
    SELECT 1 FROM partidos WHERE fase = '3p' OR external_id = 537389
  );

INSERT INTO partidos (
  fase, grupo, ronda, equipo_local, equipo_visitante, external_id, fecha, orden
)
SELECT
  '3p',
  NULL,
  '3er puesto · M103 · Perd. M101 vs Perd. M102',
  'Francia',
  'Inglaterra',
  537389,
  '2026-07-18T21:00:00Z',
  COALESCE(
    (SELECT MIN(orden) - 1 FROM partidos WHERE fase = 'final'),
    (SELECT COALESCE(MAX(orden), 0) + 1 FROM partidos WHERE fase = 'sf')
  )
WHERE NOT EXISTS (
  SELECT 1 FROM partidos WHERE fase = '3p' OR external_id = 537389
);

COMMIT;

SELECT id, fase, ronda, equipo_local, equipo_visitante, external_id, fecha, orden
FROM partidos
WHERE fase IN ('sf', '3p', 'final')
ORDER BY orden;
