-- Dejar solo los 30 participantes del prode oficina
-- Ejecutar en Supabase SQL Editor

DELETE FROM participantes
WHERE lower(trim(nombre)) NOT IN (
  'ypuiatti',
  'lpayva',
  'vsassola',
  'mlualdi',
  'eblanco',
  'fmarambio',
  'jgranado',
  'mcolombo',
  'amangano',
  'mpuchini',
  'vtorcetta',
  'jdipaolo',
  'jscoufalos',
  'spascualetti',
  'mvdelvalle',
  'fpedroso',
  'jnicastro',
  'hsuarez',
  'fcotler',
  'lperez',
  'rfihman',
  'cmanzanal',
  'jahin',
  'aformosa'
);

-- Verificación (debe devolver 30)
SELECT count(*) AS total FROM participantes;

SELECT nombre, activo FROM participantes ORDER BY nombre;
