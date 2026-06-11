-- Restaurar participante fmarambio (ex mparera / Marcos)
-- Ejecutar en Supabase SQL Editor si hace falta recrearlo manualmente
-- PIN: 1007

INSERT INTO participantes (nombre, pin_hash, activo)
VALUES ('fmarambio', hash_pin('1007'), true)
ON CONFLICT (nombre) DO UPDATE SET
  pin_hash = EXCLUDED.pin_hash,
  activo = true;

-- Verificar
SELECT id, nombre, activo FROM participantes WHERE nombre = 'fmarambio';

-- NOTA: si mparera fue borrado con DELETE, las predicciones se perdieron (ON DELETE CASCADE).
-- Para recargarlas: export del Sheet, foto del papelito, o seed SQL como seed_predicciones_vsassola.sql
