-- Borrar participantes que no juegan el prode
-- Ejecutar en Supabase → SQL Editor
-- https://supabase.com/dashboard/project/kfzltoopsqztkgjzrmjn/sql/new
-- CASCADE elimina también predicciones y predicción de campeón

SELECT id, nombre, activo
FROM participantes
WHERE lower(trim(nombre)) IN (
  'kkujawski', 'obotalla', 'jconsiglio', 'vlourenco', 'glsilva', 'gfeldman',
  'rcoto', 'zspera', 'jesnaola', 'lcotella', 'shromero', 'fberbery',
  'paristimuno', 'cguerra', 'blaguna', 'dbasanes'
);

DELETE FROM participantes
WHERE lower(trim(nombre)) IN (
  'kkujawski', 'obotalla', 'jconsiglio', 'vlourenco', 'glsilva', 'gfeldman',
  'rcoto', 'zspera', 'jesnaola', 'lcotella', 'shromero', 'fberbery',
  'paristimuno', 'cguerra', 'blaguna', 'dbasanes'
);

SELECT count(*) AS total_restantes FROM participantes;
