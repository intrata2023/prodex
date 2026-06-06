-- Separar usuario (login) de nombre (saludo en app)
-- Ejecutar en Supabase SQL Editor

BEGIN;

ALTER TABLE participantes ADD COLUMN IF NOT EXISTS usuario TEXT;

ALTER TABLE participantes DROP CONSTRAINT IF EXISTS participantes_nombre_key;

UPDATE participantes SET usuario = nombre WHERE usuario IS NULL;

UPDATE participantes SET nombre = v.display
FROM (VALUES
  ('ypuiatti', 'Yama'),
  ('lpayva', 'Payva'),
  ('vsassola', 'Vicky'),
  ('mlualdi', 'Tincho'),
  ('eblanco', 'Edu'),
  ('mparera', 'Marcos'),
  ('jgranado', 'Joha'),
  ('mcolombo', 'Chelo'),
  ('amangano', 'Ale'),
  ('mpuchini', 'Mauro'),
  ('vtorcetta', 'Vale'),
  ('jdipaolo', 'Juan'),
  ('glsilva', 'Gabriel'),
  ('jscoufalos', 'Juana'),
  ('gfeldman', 'Germán'),
  ('rcoto', 'Rodrigo'),
  ('spascualetti', 'Sofía'),
  ('jesnaola', 'Juan'),
  ('mvdelvalle', 'María'),
  ('fpedroso', 'Francisco'),
  ('jnicastro', 'Jaz'),
  ('hsuarez', 'Hernan'),
  ('paristimuno', 'Paula'),
  ('fcotler', 'Fede'),
  ('lperez', 'Lucas'),
  ('rfihman', 'Ramiro'),
  ('cmanzanal', 'Carmela'),
  ('jahin', 'Julio'),
  ('aformosa', 'Agustina'),
  ('dbasanes', 'Delfi')
) AS v(usuario, display)
WHERE lower(participantes.usuario) = v.usuario;

ALTER TABLE participantes ALTER COLUMN usuario SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS participantes_usuario_idx ON participantes (lower(usuario));

-- Login por usuario, devuelve nombre para saludo
CREATE OR REPLACE FUNCTION login_participante(p_nombre TEXT, p_pin TEXT)
RETURNS TABLE (id UUID, nombre TEXT)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.nombre
  FROM participantes p
  WHERE lower(trim(p.usuario)) = lower(trim(p_nombre))
    AND p.pin_hash = hash_pin(p_pin)
    AND p.activo = true;
$$;

CREATE OR REPLACE FUNCTION admin_insert_participante(
  p_admin_pin TEXT,
  p_usuario TEXT,
  p_nombre TEXT,
  p_pin TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  PERFORM require_admin(p_admin_pin);

  IF p_usuario IS NULL OR length(trim(p_usuario)) = 0 THEN
    RAISE EXCEPTION 'Usuario requerido';
  END IF;
  IF p_nombre IS NULL OR length(trim(p_nombre)) = 0 THEN
    RAISE EXCEPTION 'Nombre requerido';
  END IF;
  IF p_pin IS NULL OR length(p_pin) <> 4 THEN
    RAISE EXCEPTION 'PIN de 4 dígitos requerido';
  END IF;

  INSERT INTO participantes (usuario, nombre, pin_hash)
  VALUES (lower(trim(p_usuario)), trim(p_nombre), hash_pin(p_pin))
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE VIEW participantes_list AS
SELECT id, usuario, nombre, activo, puntos_total, desglose, created_at
FROM participantes;

CREATE OR REPLACE VIEW participantes_public AS
SELECT id, nombre, activo, puntos_total, desglose
FROM participantes
WHERE activo = true;

COMMIT;

GRANT EXECUTE ON FUNCTION admin_insert_participante(TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;

SELECT usuario, nombre FROM participantes ORDER BY nombre;
