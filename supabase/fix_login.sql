-- FIX login: hash_pin roto (digest does not exist)
-- Ejecutar en Supabase SQL Editor

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.hash_pin(pin TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = public, extensions
AS $$
  SELECT encode(extensions.digest(pin, 'sha256'), 'hex');
$$;

-- Login por usuario si existe la columna; si no, por nombre
CREATE OR REPLACE FUNCTION login_participante(p_nombre TEXT, p_pin TEXT)
RETURNS TABLE (id UUID, nombre TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'participantes'
      AND column_name = 'usuario'
  ) THEN
    RETURN QUERY
    SELECT p.id, p.nombre
    FROM participantes p
    WHERE lower(trim(p.usuario)) = lower(trim(p_nombre))
      AND p.pin_hash = hash_pin(p_pin)
      AND p.activo = true;
  ELSE
    RETURN QUERY
    SELECT p.id, p.nombre
    FROM participantes p
    WHERE lower(trim(p.nombre)) = lower(trim(p_nombre))
      AND p.pin_hash = hash_pin(p_pin)
      AND p.activo = true;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION login_admin(p_pin TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT EXISTS (
    SELECT 1 FROM config
    WHERE admin_pin_hash = hash_pin(p_pin)
  );
$$;

GRANT EXECUTE ON FUNCTION login_participante(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION login_admin(TEXT) TO anon, authenticated;

-- Probar (opcional): SELECT * FROM login_participante('fcotler', '1034');
