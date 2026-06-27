-- Insertar eliminatorias ordenadas EXACTAMENTE como Promiedos (árbol del cuadro).

-- Ejecutar en Supabase → SQL Editor.

--

-- Requisitos: tener ya los 72 partidos de grupos cargados.

-- BORRA eliminatorias existentes y sus predicciones (CASCADE).

--

-- Orden visual 16avos (arriba → abajo, mitad izquierda luego derecha):

--   M74, M77 | M73, M75 | M83, M84 | M81, M82 | M76, M78 | M79, M80 | M86, M88 | M85, M87



BEGIN;



DELETE FROM partidos

WHERE fase IN ('r32', 'r16', 'qf', 'sf', 'final');



DO $$

DECLARE

  base INT;

BEGIN

  SELECT COALESCE(MAX(orden), 0) INTO base FROM partidos WHERE fase = 'grupos';



  INSERT INTO partidos (fase, grupo, ronda, equipo_local, equipo_visitante, external_id, fecha, orden)

  VALUES

    -- ═══ 16avos — mitad IZQUIERDA (#1–#8) ═══

    ('r32', NULL, '16avos · M74 · 1E vs 3° A/B/C/D/F', 'Alemania', 'Paraguay', 537415, '2026-06-29T20:30:00Z', base + 1),

    ('r32', NULL, '16avos · M77 · 1I vs 3° C/D/F/G/H', 'Francia', 'Suecia', 537416, '2026-06-30T21:00:00Z', base + 2),

    ('r32', NULL, '16avos · M73 · 2A vs 2B', 'Sudáfrica', 'Canadá', 537417, '2026-06-28T19:00:00Z', base + 3),

    ('r32', NULL, '16avos · M75 · 1F vs 2C', 'Países Bajos', 'Marruecos', 537418, '2026-06-30T01:00:00Z', base + 4),

    ('r32', NULL, '16avos · M83 · 2K vs 2L', '2K', '2L', 537419, '2026-07-02T23:00:00Z', base + 5),

    ('r32', NULL, '16avos · M84 · 1H vs 2J', 'España', '2J', 537420, '2026-07-02T19:00:00Z', base + 6),

    ('r32', NULL, '16avos · M81 · 1D vs 3° B/E/F/I/J', 'Estados Unidos', 'Bosnia-Herzegovina', 537421, '2026-07-02T00:00:00Z', base + 7),

    ('r32', NULL, '16avos · M82 · 1G vs 3° A/E/H/I/J', 'Bélgica', '3A/E/H/I/J', 537422, '2026-07-01T20:00:00Z', base + 8),



    -- ═══ 16avos — mitad DERECHA (#9–#16) ═══

    ('r32', NULL, '16avos · M76 · 1C vs 2F', 'Brasil', 'Japón', 537423, '2026-06-29T17:00:00Z', base + 9),

    ('r32', NULL, '16avos · M78 · 2E vs 2I', 'Costa de Marfil', 'Noruega', 537424, '2026-06-30T17:00:00Z', base + 10),

    ('r32', NULL, '16avos · M79 · 1A vs 3° C/E/F/H/I', 'México', '3C/E/F/H/I', 537425, '2026-07-01T01:00:00Z', base + 11),

    ('r32', NULL, '16avos · M80 · 1L vs 3° E/H/I/J/K', '1L', '3E/H/I/J/K', 537426, '2026-07-01T16:00:00Z', base + 12),

    ('r32', NULL, '16avos · M86 · 1J vs 2H', 'Argentina', 'Cabo Verde', 537427, '2026-07-03T22:00:00Z', base + 13),

    ('r32', NULL, '16avos · M88 · 2D vs 2G', 'Australia', 'Egipto', 537428, '2026-07-03T18:00:00Z', base + 14),

    ('r32', NULL, '16avos · M85 · 1B vs 3° E/F/G/I/J', 'Suiza', '3E/F/G/I/J', 537429, '2026-07-03T03:00:00Z', base + 15),

    ('r32', NULL, '16avos · M87 · 1K vs 3° D/E/I/J/L', '1K', '3D/E/I/J/L', 537430, '2026-07-04T01:30:00Z', base + 16),



    -- ═══ Octavos (M89–M96) ═══

    ('r16', NULL, 'Octavos · M89 · Gan. M74 vs Gan. M77', 'Ganador del partido 74', 'Ganador del partido 77', 537375, '2026-07-04T21:00:00Z', base + 17),

    ('r16', NULL, 'Octavos · M90 · Gan. M73 vs Gan. M75', 'Ganador del partido 73', 'Ganador del partido 75', 537376, '2026-07-04T17:00:00Z', base + 18),

    ('r16', NULL, 'Octavos · M93 · Gan. M83 vs Gan. M84', 'Ganador del partido 83', 'Ganador del partido 84', 537379, '2026-07-06T19:00:00Z', base + 19),

    ('r16', NULL, 'Octavos · M94 · Gan. M81 vs Gan. M82', 'Ganador del partido 81', 'Ganador del partido 82', 537380, '2026-07-07T00:00:00Z', base + 20),

    ('r16', NULL, 'Octavos · M91 · Gan. M76 vs Gan. M78', 'Ganador del partido 76', 'Ganador del partido 78', 537377, '2026-07-05T20:00:00Z', base + 21),

    ('r16', NULL, 'Octavos · M92 · Gan. M79 vs Gan. M80', 'Ganador del partido 79', 'Ganador del partido 80', 537378, '2026-07-06T00:00:00Z', base + 22),

    ('r16', NULL, 'Octavos · M95 · Gan. M86 vs Gan. M88', 'Ganador del partido 86', 'Ganador del partido 88', 537381, '2026-07-07T16:00:00Z', base + 23),

    ('r16', NULL, 'Octavos · M96 · Gan. M85 vs Gan. M87', 'Ganador del partido 85', 'Ganador del partido 87', 537382, '2026-07-07T20:00:00Z', base + 24),



    -- ═══ Cuartos (M97–M100) ═══

    ('qf', NULL, 'Cuartos · M97 · Gan. M89 vs Gan. M90', 'Ganador del partido 89', 'Ganador del partido 90', 537383, '2026-07-09T20:00:00Z', base + 25),

    ('qf', NULL, 'Cuartos · M98 · Gan. M93 vs Gan. M94', 'Ganador del partido 93', 'Ganador del partido 94', 537384, '2026-07-10T19:00:00Z', base + 26),

    ('qf', NULL, 'Cuartos · M99 · Gan. M91 vs Gan. M92', 'Ganador del partido 91', 'Ganador del partido 92', 537385, '2026-07-11T21:00:00Z', base + 27),

    ('qf', NULL, 'Cuartos · M100 · Gan. M95 vs Gan. M96', 'Ganador del partido 95', 'Ganador del partido 96', 537386, '2026-07-12T01:00:00Z', base + 28),



    -- ═══ Semis (M101–M102) ═══

    ('sf', NULL, 'Semis · M101 · Gan. M97 vs Gan. M98', 'Ganador del partido 97', 'Ganador del partido 98', 537387, '2026-07-14T19:00:00Z', base + 29),

    ('sf', NULL, 'Semis · M102 · Gan. M99 vs Gan. M100', 'Ganador del partido 99', 'Ganador del partido 100', 537388, '2026-07-15T19:00:00Z', base + 30),



    -- ═══ Final (M104) ═══

    ('final', NULL, 'Final · M104 · Gan. M101 vs Gan. M102', 'Ganador del partido 101', 'Ganador del partido 102', 537390, '2026-07-19T19:00:00Z', base + 31);



END $$;



COMMIT;



-- Verificación: primeros 16avos deben coincidir con Promiedos

SELECT

  orden - (SELECT COALESCE(MAX(orden), 0) FROM partidos WHERE fase = 'grupos') AS pos,

  ronda,

  equipo_local,

  equipo_visitante

FROM partidos

WHERE fase = 'r32'

ORDER BY orden;


