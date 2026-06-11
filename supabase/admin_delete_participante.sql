-- RPC admin para borrar participantes (ejecutar una vez en SQL Editor)
-- Luego se puede usar desde la app o vía REST con PIN admin

CREATE OR REPLACE FUNCTION admin_delete_participante(
  p_admin_pin TEXT,
  p_participante_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM require_admin(p_admin_pin);
  DELETE FROM participantes WHERE id = p_participante_id;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_delete_participante(TEXT, UUID) TO anon, authenticated;
