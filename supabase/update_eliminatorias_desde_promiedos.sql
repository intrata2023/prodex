-- 16avos completos (BBC / Promiedos, jun 2026).
-- SEGURO: solo UPDATE por external_id. NO DELETE. Predicciones intactas.
--
-- Orden en el cuadro (arriba→abajo, como Promiedos/PRODEX):
--   IZQ: M74 M77 M73 M75 M83 M84 M81 M82
--   DER: M76 M78 M79 M80 M86 M88 M85 M87
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
    OR btrim(nombre) ~* '16avos.*local|16avos.*visitante';
$$;

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

-- #1  M74 · 537415 · Alemania vs Paraguay
UPDATE partidos SET
  ronda = '16avos · M74 · 1E vs 3° A/B/C/D/F',
  equipo_local = merge_equipo_promiedos(equipo_local, 'Alemania'),
  equipo_visitante = merge_equipo_promiedos(equipo_visitante, 'Paraguay')
WHERE external_id = 537415 AND fase = 'r32';

-- #2  M77 · 537416 · Francia vs Suecia
UPDATE partidos SET
  ronda = '16avos · M77 · 1I vs 3° C/D/F/G/H',
  equipo_local = merge_equipo_promiedos(equipo_local, 'Francia'),
  equipo_visitante = merge_equipo_promiedos(equipo_visitante, 'Suecia')
WHERE external_id = 537416 AND fase = 'r32';

-- #3  M73 · 537417 · Sudáfrica vs Canadá
UPDATE partidos SET
  ronda = '16avos · M73 · 2A vs 2B',
  equipo_local = merge_equipo_promiedos(equipo_local, 'Sudáfrica'),
  equipo_visitante = merge_equipo_promiedos(equipo_visitante, 'Canadá')
WHERE external_id = 537417 AND fase = 'r32';

-- #4  M75 · 537418 · Países Bajos vs Marruecos
UPDATE partidos SET
  ronda = '16avos · M75 · 1F vs 2C',
  equipo_local = merge_equipo_promiedos(equipo_local, 'Países Bajos'),
  equipo_visitante = merge_equipo_promiedos(equipo_visitante, 'Marruecos')
WHERE external_id = 537418 AND fase = 'r32';

-- #5  M83 · 537419 · Portugal vs Croacia  (slot 2K)
UPDATE partidos SET
  ronda = '16avos · M83 · 2K vs 2L',
  equipo_local = merge_equipo_promiedos(equipo_local, 'Portugal'),
  equipo_visitante = merge_equipo_promiedos(equipo_visitante, 'Croacia')
WHERE external_id = 537419 AND fase = 'r32';

-- #6  M84 · 537420 · España vs Austria  (slot 2J)
UPDATE partidos SET
  ronda = '16avos · M84 · 1H vs 2J',
  equipo_local = merge_equipo_promiedos(equipo_local, 'España'),
  equipo_visitante = merge_equipo_promiedos(equipo_visitante, 'Austria')
WHERE external_id = 537420 AND fase = 'r32';

-- #7  M81 · 537421 · Estados Unidos vs Bosnia-Herzegovina
UPDATE partidos SET
  ronda = '16avos · M81 · 1D vs 3° B/E/F/I/J',
  equipo_local = merge_equipo_promiedos(equipo_local, 'Estados Unidos'),
  equipo_visitante = merge_equipo_promiedos(equipo_visitante, 'Bosnia-Herzegovina')
WHERE external_id = 537421 AND fase = 'r32';

-- #8  M82 · 537422 · Bélgica vs Senegal  (3° resuelto)
UPDATE partidos SET
  ronda = '16avos · M82 · 1G vs 3° A/E/H/I/J',
  equipo_local = merge_equipo_promiedos(equipo_local, 'Bélgica'),
  equipo_visitante = merge_equipo_promiedos(equipo_visitante, 'Senegal')
WHERE external_id = 537422 AND fase = 'r32';

-- #9  M76 · 537423 · Brasil vs Japón
UPDATE partidos SET
  ronda = '16avos · M76 · 1C vs 2F',
  equipo_local = merge_equipo_promiedos(equipo_local, 'Brasil'),
  equipo_visitante = merge_equipo_promiedos(equipo_visitante, 'Japón')
WHERE external_id = 537423 AND fase = 'r32';

-- #10 M78 · 537424 · Costa de Marfil vs Noruega
UPDATE partidos SET
  ronda = '16avos · M78 · 2E vs 2I',
  equipo_local = merge_equipo_promiedos(equipo_local, 'Costa de Marfil'),
  equipo_visitante = merge_equipo_promiedos(equipo_visitante, 'Noruega')
WHERE external_id = 537424 AND fase = 'r32';

-- #11 M79 · 537425 · México vs Ecuador
UPDATE partidos SET
  ronda = '16avos · M79 · 1A vs 3° C/E/F/H/I',
  equipo_local = merge_equipo_promiedos(equipo_local, 'México'),
  equipo_visitante = merge_equipo_promiedos(equipo_visitante, 'Ecuador')
WHERE external_id = 537425 AND fase = 'r32';

-- #12 M80 · 537426 · Inglaterra vs RD Congo
UPDATE partidos SET
  ronda = '16avos · M80 · 1L vs 3° E/H/I/J/K',
  equipo_local = merge_equipo_promiedos(equipo_local, 'Inglaterra'),
  equipo_visitante = merge_equipo_promiedos(equipo_visitante, 'RD Congo')
WHERE external_id = 537426 AND fase = 'r32';

-- #13 M86 · 537427 · Argentina vs Cabo Verde
UPDATE partidos SET
  ronda = '16avos · M86 · 1J vs 2H',
  equipo_local = merge_equipo_promiedos(equipo_local, 'Argentina'),
  equipo_visitante = merge_equipo_promiedos(equipo_visitante, 'Cabo Verde')
WHERE external_id = 537427 AND fase = 'r32';

-- #14 M88 · 537428 · Australia vs Egipto
UPDATE partidos SET
  ronda = '16avos · M88 · 2D vs 2G',
  equipo_local = merge_equipo_promiedos(equipo_local, 'Australia'),
  equipo_visitante = merge_equipo_promiedos(equipo_visitante, 'Egipto')
WHERE external_id = 537428 AND fase = 'r32';

-- #15 M85 · 537429 · Suiza vs Argelia  (B1 vs J3)
UPDATE partidos SET
  ronda = '16avos · M85 · 1B vs 3° E/F/G/I/J',
  equipo_local = merge_equipo_promiedos(equipo_local, 'Suiza'),
  equipo_visitante = merge_equipo_promiedos(equipo_visitante, 'Argelia')
WHERE external_id = 537429 AND fase = 'r32';

-- #16 M87 · 537430 · Colombia vs Ghana
UPDATE partidos SET
  ronda = '16avos · M87 · 1K vs 3° D/E/I/J/L',
  equipo_local = merge_equipo_promiedos(equipo_local, 'Colombia'),
  equipo_visitante = merge_equipo_promiedos(equipo_visitante, 'Ghana')
WHERE external_id = 537430 AND fase = 'r32';

COMMIT;

-- Verificación (predicciones no se tocan)
SELECT p.orden, p.external_id, p.ronda, p.equipo_local, p.equipo_visitante,
       COUNT(pr.id) AS predicciones
FROM partidos p
LEFT JOIN predicciones pr ON pr.partido_id = p.id
WHERE p.fase = 'r32'
GROUP BY p.id
ORDER BY p.orden;
