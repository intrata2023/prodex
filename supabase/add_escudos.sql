-- Ejecutar en Supabase SQL Editor si ya tenés la base creada
ALTER TABLE partidos ADD COLUMN IF NOT EXISTS escudo_local TEXT;
ALTER TABLE partidos ADD COLUMN IF NOT EXISTS escudo_visitante TEXT;
