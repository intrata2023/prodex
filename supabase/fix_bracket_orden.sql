-- Orden del cuadro eliminatorio como Promiedos / FIFA (mitad izq + der).
-- Ejecutar en Supabase SQL Editor después de tener partidos con external_id.
--
-- Garantiza: posición en el árbol (orden) y etiqueta ronda M73–M104.
-- NO garantiza equipos en cada slot (eso depende de resultados + Anexo C).

DO $$
DECLARE
  base_grupos INT;
BEGIN
  SELECT COALESCE(MAX(orden), 0) INTO base_grupos FROM partidos WHERE fase = 'grupos';

  -- 16avos: mitad izquierda (1–8) luego derecha (9–16)
  UPDATE partidos SET
    orden = base_grupos + v.bracket_pos,
    ronda = v.ronda
  FROM (VALUES
    (537415,  1, '16avos · M74 · 1E vs 3° A/B/C/D/F'),
    (537416,  2, '16avos · M77 · 1I vs 3° C/D/F/G/H'),
    (537417,  3, '16avos · M73 · 2A vs 2B'),
    (537418,  4, '16avos · M75 · 1F vs 2C'),
    (537419,  5, '16avos · M83 · 2K vs 2L'),
    (537420,  6, '16avos · M84 · 1H vs 2J'),
    (537421,  7, '16avos · M81 · 1D vs 3° B/E/F/I/J'),
    (537422,  8, '16avos · M82 · 1G vs 3° A/E/H/I/J'),
    (537423,  9, '16avos · M76 · 1C vs 2F'),
    (537424, 10, '16avos · M78 · 2E vs 2I'),
    (537425, 11, '16avos · M79 · 1A vs 3° C/E/F/H/I'),
    (537426, 12, '16avos · M80 · 1L vs 3° E/H/I/J/K'),
    (537427, 13, '16avos · M86 · 1J vs 2H'),
    (537428, 14, '16avos · M88 · 2D vs 2G'),
    (537429, 15, '16avos · M85 · 1B vs 3° E/F/G/I/J'),
    (537430, 16, '16avos · M87 · 1K vs 3° D/E/I/J/L')
  ) AS v(external_id, bracket_pos, ronda)
  WHERE partidos.external_id = v.external_id AND partidos.fase = 'r32';

  -- Octavos
  UPDATE partidos SET
    orden = base_grupos + 16 + v.bracket_pos,
    ronda = v.ronda
  FROM (VALUES
    (537375, 1, 'Octavos · M89 · Gan. M74 vs Gan. M77'),
    (537376, 2, 'Octavos · M90 · Gan. M73 vs Gan. M75'),
    (537379, 3, 'Octavos · M93 · Gan. M83 vs Gan. M84'),
    (537380, 4, 'Octavos · M94 · Gan. M81 vs Gan. M82'),
    (537377, 5, 'Octavos · M91 · Gan. M76 vs Gan. M78'),
    (537378, 6, 'Octavos · M92 · Gan. M79 vs Gan. M80'),
    (537381, 7, 'Octavos · M95 · Gan. M86 vs Gan. M88'),
    (537382, 8, 'Octavos · M96 · Gan. M85 vs Gan. M87')
  ) AS v(external_id, bracket_pos, ronda)
  WHERE partidos.external_id = v.external_id AND partidos.fase = 'r16';

  -- Cuartos
  UPDATE partidos SET
    orden = base_grupos + 24 + v.bracket_pos,
    ronda = v.ronda
  FROM (VALUES
    (537383, 1, 'Cuartos · M97 · Gan. M89 vs Gan. M90'),
    (537384, 2, 'Cuartos · M98 · Gan. M93 vs Gan. M94'),
    (537385, 3, 'Cuartos · M99 · Gan. M91 vs Gan. M92'),
    (537386, 4, 'Cuartos · M100 · Gan. M95 vs Gan. M96')
  ) AS v(external_id, bracket_pos, ronda)
  WHERE partidos.external_id = v.external_id AND partidos.fase = 'qf';

  -- Semis
  UPDATE partidos SET
    orden = base_grupos + 28 + v.bracket_pos,
    ronda = v.ronda
  FROM (VALUES
    (537387, 1, 'Semis · M101 · Gan. M97 vs Gan. M98'),
    (537388, 2, 'Semis · M102 · Gan. M99 vs Gan. M100')
  ) AS v(external_id, bracket_pos, ronda)
  WHERE partidos.external_id = v.external_id AND partidos.fase = 'sf';

  -- Final
  UPDATE partidos SET
    orden = base_grupos + 31,
    ronda = 'Final · M104 · Gan. M101 vs Gan. M102'
  WHERE external_id = 537390 AND fase = 'final';

END $$;

-- Verificación: listar cuadro como Promiedos (izq arriba → der abajo)
SELECT
  fase,
  orden,
  external_id,
  ronda,
  equipo_local,
  equipo_visitante,
  CASE
    WHEN fase = 'r32' AND orden <= (SELECT COALESCE(MAX(orden), 0) FROM partidos WHERE fase = 'grupos') + 8 THEN 'izquierda'
    WHEN fase = 'r32' THEN 'derecha'
    ELSE NULL
  END AS mitad
FROM partidos
WHERE fase <> 'grupos'
ORDER BY orden;
