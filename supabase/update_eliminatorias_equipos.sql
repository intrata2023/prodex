-- Actualizar SOLO equipos faltantes en eliminatorias (sin borrar predicciones).
-- Ejecutar en Supabase → SQL Editor cuando mandes fotos de Promiedos.
--
-- REGLA DE ORO: nunca DELETE ni re-INSERT de partidos si ya hay predicciones.
-- Solo UPDATE por external_id (estable). Las predicciones siguen atadas al mismo UUID.
--
-- Placeholders que se consideran "vacíos" (no se pisan equipos ya confirmados):
--   2J, 2K, 1L, 3A/E/H/I/J, Ganador del partido 74, TBD, 16avos · Local N, etc.

BEGIN;

-- ─── Ejemplo: completar un lado visitante que sigue siendo slot ───
-- UPDATE partidos SET equipo_visitante = 'Nombre exacto como en PRODEX'
-- WHERE external_id = 537420   -- M84
--   AND fase = 'r32'
--   AND (
--     equipo_visitante IN ('2J', '2K', '2L', '1L', '1K', 'TBD')
--     OR equipo_visitante ~ '^3[A-L0-9/]+$'
--     OR equipo_visitante ~* '^ganador del partido'
--     OR equipo_visitante ~* '16avos.*visitante|octavos.*visitante|cuartos.*visitante|semi.*visitante|final.*visitante'
--     OR equipo_visitante ~* 'por definir'
--   );

-- ─── Plantilla: pegar acá los cruces de la foto (external_id → equipos) ───
-- Mitad izquierda
-- UPDATE partidos SET equipo_local = '...', equipo_visitante = '...'
-- WHERE external_id = 537415 AND fase = 'r32' AND ...solo si placeholder...;

-- UPDATE partidos SET ...
-- WHERE external_id = 537416;  -- M77

-- UPDATE partidos SET ...
-- WHERE external_id = 537417;  -- M73

-- (etc. M74=537415, M75=537418, M83=537419, M84=537420, M81=537421, M82=537422)
-- (M76=537423, M78=537424, M79=537425, M80=537426, M86=537427, M88=537428, M85=537429, M87=537430)

-- Octavos en adelante: solo cuando ambos 16avos ya tienen ganador conocido
-- UPDATE partidos SET equipo_local = 'Argentina', equipo_visitante = 'Francia'
-- WHERE external_id = 537375 AND fase = 'r16'
--   AND equipo_local ~* '^ganador del partido';

-- ─── Función auxiliar (opcional, más segura) ───
CREATE OR REPLACE FUNCTION es_equipo_placeholder(nombre TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT nombre IS NULL OR btrim(nombre) = '' OR lower(btrim(nombre)) IN ('tbd', 'por definir')
    OR btrim(nombre) ~ '^[12][A-L]$'
    OR btrim(nombre) ~ '^1[A-L]$'
    OR (btrim(nombre) ~ '^3' AND btrim(nombre) ~ '/')
    OR btrim(nombre) ~* '^ganador del partido'
    OR btrim(nombre) ~* '· local|· visitante|por definir';
$$;

-- Uso seguro: solo pisa el lado que sigue siendo placeholder
-- UPDATE partidos SET equipo_visitante = 'Croacia'
-- WHERE external_id = 537418 AND fase = 'r32' AND es_equipo_placeholder(equipo_visitante);

COMMIT;

-- Verificación: predicciones intactas + cruces actualizados
SELECT
  p.external_id,
  p.ronda,
  p.equipo_local,
  p.equipo_visitante,
  COUNT(pr.id) AS predicciones_usuarios
FROM partidos p
LEFT JOIN predicciones pr ON pr.partido_id = p.id
WHERE p.fase <> 'grupos'
GROUP BY p.id, p.external_id, p.ronda, p.equipo_local, p.equipo_visitante
ORDER BY p.orden;
