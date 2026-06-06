-- Dejar solo los 30 participantes del prode oficina
-- Ejecutar en Supabase SQL Editor

DELETE FROM participantes
WHERE lower(trim(nombre)) NOT IN (
  'ypuiatti',
  'lpayva',
  'vsassola',
  'mlualdi',
  'eblanco',
  'mparera',
  'jgranado',
  'mcolombo',
  'amangano',
  'mpuchini',
  'vtorcetta',
  'jdipaolo',
  'glsilva',
  'jscoufalos',
  'gfeldman',
  'rcoto',
  'spascualetti',
  'jesnaola',
  'mvdelvalle',
  'fpedroso',
  'jnicastro',
  'hsuarez',
  'paristimuno',
  'fcotler',
  'lperez',
  'rfihman',
  'cmanzanal',
  'jahin',
  'aformosa',
  'dbasanes'
);

-- Verificación (debe devolver 30)
SELECT count(*) AS total FROM participantes;

SELECT nombre, activo FROM participantes ORDER BY nombre;
