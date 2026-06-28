-- Restaura octavos (r16) a placeholders. Ejecutar en Supabase → SQL Editor.

BEGIN;

UPDATE partidos SET equipo_local = 'Gan. M74', equipo_visitante = 'Gan. M77'
WHERE fase = 'r16' AND external_id = 537375;

UPDATE partidos SET equipo_local = 'Gan. M73', equipo_visitante = 'Gan. M75'
WHERE fase = 'r16' AND external_id = 537376;

UPDATE partidos SET equipo_local = 'Gan. M83', equipo_visitante = 'Gan. M84'
WHERE fase = 'r16' AND external_id = 537379;

UPDATE partidos SET equipo_local = 'Gan. M81', equipo_visitante = 'Gan. M82'
WHERE fase = 'r16' AND external_id = 537380;

UPDATE partidos SET equipo_local = 'Gan. M76', equipo_visitante = 'Gan. M78'
WHERE fase = 'r16' AND external_id = 537377;

UPDATE partidos SET equipo_local = 'Gan. M79', equipo_visitante = 'Gan. M80'
WHERE fase = 'r16' AND external_id = 537378;

UPDATE partidos SET equipo_local = 'Gan. M86', equipo_visitante = 'Gan. M88'
WHERE fase = 'r16' AND external_id = 537381;

UPDATE partidos SET equipo_local = 'Gan. M85', equipo_visitante = 'Gan. M87'
WHERE fase = 'r16' AND external_id = 537382;

COMMIT;

SELECT ronda, equipo_local, equipo_visitante FROM partidos WHERE fase = 'r16' ORDER BY orden;
