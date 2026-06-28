-- Actualizar equipos de eliminatorias desde Promiedos (jun 2026).
-- SEGURO: solo UPDATE por external_id. NO hay DELETE ni re-INSERT.
-- Las predicciones siguen atadas al mismo UUID de partido.
--
-- Ejecutar en Supabase → SQL Editor.

BEGIN;

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
    OR btrim(nombre) ~* '^perdedor del partido'
    OR btrim(nombre) ~* '· local|· visitante|por definir'
    OR btrim(nombre) ~* '16avos.*local|16avos.*visitante'
    OR btrim(nombre) ~* 'octavos.*local|octavos.*visitante'
    OR btrim(nombre) ~* 'cuartos.*local|cuartos.*visitante'
    OR btrim(nombre) ~* 'semi.*local|semi.*visitante'
    OR btrim(nombre) ~* 'final.*local|final.*visitante';
$$;

-- Helper: actualiza un lado solo si sigue siendo placeholder
CREATE OR REPLACE FUNCTION merge_equipo_promiedos(actual TEXT, promiedos TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN es_equipo_placeholder(promiedos) THEN actual
    WHEN es_equipo_placeholder(actual) THEN promiedos
    ELSE actual
  END;
$$;

-- ═══ 16avos (datos Promiedos — orden M74, M77, M73…) ═══

UPDATE partidos SET
  ronda = '16avos · M74 · 1E vs 3° A/B/C/D/F',
  equipo_local = merge_equipo_promiedos(equipo_local, 'Alemania'),
  equipo_visitante = merge_equipo_promiedos(equipo_visitante, 'Paraguay')
WHERE external_id = 537415 AND fase = 'r32';

UPDATE partidos SET
  ronda = '16avos · M77 · 1I vs 3° C/D/F/G/H',
  equipo_local = merge_equipo_promiedos(equipo_local, 'Francia'),
  equipo_visitante = merge_equipo_promiedos(equipo_visitante, 'Suecia')
WHERE external_id = 537416 AND fase = 'r32';

UPDATE partidos SET
  ronda = '16avos · M73 · 2A vs 2B',
  equipo_local = merge_equipo_promiedos(equipo_local, 'Sudáfrica'),
  equipo_visitante = merge_equipo_promiedos(equipo_visitante, 'Canadá')
WHERE external_id = 537417 AND fase = 'r32';

UPDATE partidos SET
  ronda = '16avos · M75 · 1F vs 2C',
  equipo_local = merge_equipo_promiedos(equipo_local, 'Países Bajos'),
  equipo_visitante = merge_equipo_promiedos(equipo_visitante, 'Marruecos')
WHERE external_id = 537418 AND fase = 'r32';

UPDATE partidos SET
  ronda = '16avos · M83 · 2K vs 2L',
  equipo_local = merge_equipo_promiedos(equipo_local, '2K'),
  equipo_visitante = merge_equipo_promiedos(equipo_visitante, 'Croacia')
WHERE external_id = 537419 AND fase = 'r32';

UPDATE partidos SET
  ronda = '16avos · M84 · 1H vs 2J',
  equipo_local = merge_equipo_promiedos(equipo_local, 'España'),
  equipo_visitante = merge_equipo_promiedos(equipo_visitante, '2J')
WHERE external_id = 537420 AND fase = 'r32';

UPDATE partidos SET
  ronda = '16avos · M81 · 1D vs 3° B/E/F/I/J',
  equipo_local = merge_equipo_promiedos(equipo_local, 'Estados Unidos'),
  equipo_visitante = merge_equipo_promiedos(equipo_visitante, 'Bosnia-Herzegovina')
WHERE external_id = 537421 AND fase = 'r32';

UPDATE partidos SET
  ronda = '16avos · M82 · 1G vs 3° A/E/H/I/J',
  equipo_local = merge_equipo_promiedos(equipo_local, 'Bélgica'),
  equipo_visitante = merge_equipo_promiedos(equipo_visitante, '3A/E/H/I/J')
WHERE external_id = 537422 AND fase = 'r32';

UPDATE partidos SET
  ronda = '16avos · M76 · 1C vs 2F',
  equipo_local = merge_equipo_promiedos(equipo_local, 'Brasil'),
  equipo_visitante = merge_equipo_promiedos(equipo_visitante, 'Japón')
WHERE external_id = 537423 AND fase = 'r32';

UPDATE partidos SET
  ronda = '16avos · M78 · 2E vs 2I',
  equipo_local = merge_equipo_promiedos(equipo_local, 'Costa de Marfil'),
  equipo_visitante = merge_equipo_promiedos(equipo_visitante, 'Noruega')
WHERE external_id = 537424 AND fase = 'r32';

UPDATE partidos SET
  ronda = '16avos · M79 · 1A vs 3° C/E/F/H/I',
  equipo_local = merge_equipo_promiedos(equipo_local, 'México'),
  equipo_visitante = merge_equipo_promiedos(equipo_visitante, 'Ecuador')
WHERE external_id = 537425 AND fase = 'r32';

UPDATE partidos SET
  ronda = '16avos · M80 · 1L vs 3° E/H/I/J/K',
  equipo_local = merge_equipo_promiedos(equipo_local, 'Inglaterra'),
  equipo_visitante = merge_equipo_promiedos(equipo_visitante, 'RD Congo')
WHERE external_id = 537426 AND fase = 'r32';

UPDATE partidos SET
  ronda = '16avos · M86 · 1J vs 2H',
  equipo_local = merge_equipo_promiedos(equipo_local, 'Argentina'),
  equipo_visitante = merge_equipo_promiedos(equipo_visitante, 'Cabo Verde')
WHERE external_id = 537427 AND fase = 'r32';

UPDATE partidos SET
  ronda = '16avos · M88 · 2D vs 2G',
  equipo_local = merge_equipo_promiedos(equipo_local, 'Australia'),
  equipo_visitante = merge_equipo_promiedos(equipo_visitante, 'Egipto')
WHERE external_id = 537428 AND fase = 'r32';

UPDATE partidos SET
  ronda = '16avos · M85 · 1B vs 3° E/F/G/I/J',
  equipo_local = merge_equipo_promiedos(equipo_local, 'Suiza'),
  equipo_visitante = merge_equipo_promiedos(equipo_visitante, '3E/F/G/I/J')
WHERE external_id = 537429 AND fase = 'r32';

UPDATE partidos SET
  ronda = '16avos · M87 · 1K vs 3° D/E/I/J/L',
  equipo_local = merge_equipo_promiedos(equipo_local, 'Colombia'),
  equipo_visitante = merge_equipo_promiedos(equipo_visitante, 'Ghana')
WHERE external_id = 537430 AND fase = 'r32';

COMMIT;

-- Verificación: predicciones intactas
SELECT
  p.external_id,
  p.ronda,
  p.equipo_local,
  p.equipo_visitante,
  COUNT(pr.id) AS predicciones
FROM partidos p
LEFT JOIN predicciones pr ON pr.partido_id = p.id
WHERE p.fase = 'r32'
GROUP BY p.id, p.external_id, p.ronda, p.equipo_local, p.equipo_visitante
ORDER BY p.orden;
