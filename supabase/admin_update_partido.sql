-- Actualizar partido existente (admin). Necesario tras rls_hardening.sql.
-- Ejecutar en Supabase → SQL Editor.

CREATE OR REPLACE FUNCTION admin_update_partido(
  p_admin_pin TEXT,
  p_partido_id UUID,
  p_payload JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM require_admin(p_admin_pin);

  UPDATE partidos SET
    fase = COALESCE(p_payload->>'fase', fase),
    ronda = COALESCE(p_payload->>'ronda', ronda),
    grupo = CASE
      WHEN p_payload ? 'grupo' THEN NULLIF(p_payload->>'grupo', '')
      ELSE grupo
    END,
    equipo_local = COALESCE(p_payload->>'equipo_local', equipo_local),
    equipo_visitante = COALESCE(p_payload->>'equipo_visitante', equipo_visitante),
    external_id = CASE
      WHEN p_payload ? 'external_id' THEN NULLIF(p_payload->>'external_id', '')::INT
      ELSE external_id
    END,
    fecha = CASE
      WHEN p_payload ? 'fecha' THEN NULLIF(p_payload->>'fecha', '')::TIMESTAMPTZ
      ELSE fecha
    END
  WHERE id = p_partido_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Partido no encontrado';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_update_partido(TEXT, UUID, JSONB) TO anon, authenticated;
