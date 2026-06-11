-- Crear / restaurar participante rcoto (Rodrigo)
-- Ejecutar en Supabase → SQL Editor
-- Login: rcoto | PIN: 1234

INSERT INTO participantes (nombre, pin_hash, activo)
VALUES ('rcoto', hash_pin('1234'), true)
ON CONFLICT (nombre) DO UPDATE SET
  pin_hash = EXCLUDED.pin_hash,
  activo = true;

SELECT id, nombre, activo FROM participantes WHERE nombre = 'rcoto';
