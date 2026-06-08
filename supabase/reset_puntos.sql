-- Resetear puntos de todos los participantes a 0
-- Ejecutar en Supabase SQL Editor

UPDATE participantes
SET
  puntos_total = 0,
  desglose = '{"grupos":0,"eliminatorias":0,"final":0}'::jsonb;

SELECT nombre, puntos_total, desglose FROM participantes ORDER BY nombre;
