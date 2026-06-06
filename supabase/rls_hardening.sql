-- PRODEX — Endurecimiento RLS
-- Ejecutar completo en Supabase SQL Editor (una sola vez).
--
-- Qué hace:
--   • Oculta pin_hash y admin_pin_hash
--   • Solo lectura directa en tablas públicas
--   • Escrituras solo vía funciones SECURITY DEFINER
--   • Valida etapas abiertas al cargar predicciones
--
-- IMPORTANTE: después de correr esto hay que actualizar el front admin
-- (usa RPCs con PIN). Si no, el panel admin deja de escribir.
-- Los participantes (predicciones vía upsert_prediccion) siguen OK.

BEGIN;

-- ── 1. Vistas sin datos sensibles ─────────────────────────────────────────

CREATE OR REPLACE VIEW config_public AS
SELECT
  id,
  grupos_abiertos,
  eliminatorias_abiertos,
  monto_por_persona,
  campeon_real,
  updated_at
FROM config;

CREATE OR REPLACE VIEW participantes_list AS
SELECT id, usuario, nombre, activo, puntos_total, desglose, created_at
FROM participantes;

-- participantes_public ya existe (solo activos); la recreamos por si acaso
CREATE OR REPLACE VIEW participantes_public AS
SELECT id, nombre, activo, puntos_total, desglose
FROM participantes
WHERE activo = true;

GRANT SELECT ON config_public TO anon, authenticated;
GRANT SELECT ON participantes_list TO anon, authenticated;
GRANT SELECT ON participantes_public TO anon, authenticated;

-- ── 2. Helper admin ───────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION require_admin(p_pin TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_pin IS NULL OR length(trim(p_pin)) = 0 THEN
    RAISE EXCEPTION 'PIN admin inválido';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM config WHERE id = 1 AND admin_pin_hash = hash_pin(p_pin)
  ) THEN
    RAISE EXCEPTION 'PIN admin inválido';
  END IF;
END;
$$;

-- ── 3. Predicciones (participantes) con validación ────────────────────────

CREATE OR REPLACE FUNCTION upsert_prediccion(
  p_participante_id UUID,
  p_partido_id UUID,
  p_goles_local INT,
  p_goles_visitante INT,
  p_penales BOOLEAN DEFAULT false
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fase TEXT;
  v_grupos_abiertos BOOLEAN;
  v_elim_abiertos BOOLEAN;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM participantes
    WHERE id = p_participante_id AND activo = true
  ) THEN
    RAISE EXCEPTION 'Participante inactivo o inexistente';
  END IF;

  SELECT p.fase INTO v_fase
  FROM partidos p
  WHERE p.id = p_partido_id;

  IF v_fase IS NULL THEN
    RAISE EXCEPTION 'Partido inexistente';
  END IF;

  SELECT grupos_abiertos, eliminatorias_abiertos
  INTO v_grupos_abiertos, v_elim_abiertos
  FROM config WHERE id = 1;

  IF v_fase = 'grupos' AND NOT COALESCE(v_grupos_abiertos, false) THEN
    RAISE EXCEPTION 'Carga de grupos cerrada';
  END IF;

  IF v_fase <> 'grupos' AND NOT COALESCE(v_elim_abiertos, false) THEN
    RAISE EXCEPTION 'Carga de eliminatorias cerrada';
  END IF;

  IF p_goles_local IS NOT NULL AND (p_goles_local < 0 OR p_goles_local > 20) THEN
    RAISE EXCEPTION 'Goles local inválidos';
  END IF;

  IF p_goles_visitante IS NOT NULL AND (p_goles_visitante < 0 OR p_goles_visitante > 20) THEN
    RAISE EXCEPTION 'Goles visitante inválidos';
  END IF;

  INSERT INTO predicciones (
    participante_id, partido_id, goles_local, goles_visitante, penales, updated_at
  )
  VALUES (
    p_participante_id,
    p_partido_id,
    p_goles_local,
    p_goles_visitante,
    COALESCE(p_penales, false),
    now()
  )
  ON CONFLICT (participante_id, partido_id)
  DO UPDATE SET
    goles_local = EXCLUDED.goles_local,
    goles_visitante = EXCLUDED.goles_visitante,
    penales = EXCLUDED.penales,
    updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION upsert_campeon_prediccion(
  p_participante_id UUID,
  p_equipo TEXT,
  p_finalista_1 TEXT DEFAULT NULL,
  p_finalista_2 TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_elim_abiertos BOOLEAN;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM participantes
    WHERE id = p_participante_id AND activo = true
  ) THEN
    RAISE EXCEPTION 'Participante inactivo o inexistente';
  END IF;

  SELECT eliminatorias_abiertos INTO v_elim_abiertos FROM config WHERE id = 1;

  IF NOT COALESCE(v_elim_abiertos, false) THEN
    RAISE EXCEPTION 'Carga de eliminatorias cerrada';
  END IF;

  INSERT INTO prediccion_campeon (
    participante_id, equipo, finalista_1, finalista_2, updated_at
  )
  VALUES (
    p_participante_id, p_equipo, p_finalista_1, p_finalista_2, now()
  )
  ON CONFLICT (participante_id)
  DO UPDATE SET
    equipo = EXCLUDED.equipo,
    finalista_1 = EXCLUDED.finalista_1,
    finalista_2 = EXCLUDED.finalista_2,
    updated_at = now();
END;
$$;

-- ── 4. RPCs admin (requieren PIN de 6 dígitos) ────────────────────────────

CREATE OR REPLACE FUNCTION admin_update_config(
  p_admin_pin TEXT,
  p_grupos_abiertos BOOLEAN DEFAULT NULL,
  p_eliminatorias_abiertos BOOLEAN DEFAULT NULL,
  p_monto_por_persona INT DEFAULT NULL,
  p_campeon_real TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM require_admin(p_admin_pin);

  UPDATE config SET
    grupos_abiertos = COALESCE(p_grupos_abiertos, grupos_abiertos),
    eliminatorias_abiertos = COALESCE(p_eliminatorias_abiertos, eliminatorias_abiertos),
    monto_por_persona = COALESCE(p_monto_por_persona, monto_por_persona),
    campeon_real = COALESCE(p_campeon_real, campeon_real),
    updated_at = now()
  WHERE id = 1;
END;
$$;

CREATE OR REPLACE FUNCTION admin_upsert_resultado(
  p_admin_pin TEXT,
  p_partido_id UUID,
  p_goles_local INT,
  p_goles_visitante INT,
  p_definido_penales BOOLEAN DEFAULT false,
  p_ganador_penales TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM require_admin(p_admin_pin);

  IF NOT EXISTS (SELECT 1 FROM partidos WHERE id = p_partido_id) THEN
    RAISE EXCEPTION 'Partido inexistente';
  END IF;

  INSERT INTO resultados_reales (
    partido_id, goles_local, goles_visitante, definido_penales, ganador_penales, updated_at
  )
  VALUES (
    p_partido_id, p_goles_local, p_goles_visitante,
    COALESCE(p_definido_penales, false), p_ganador_penales, now()
  )
  ON CONFLICT (partido_id)
  DO UPDATE SET
    goles_local = EXCLUDED.goles_local,
    goles_visitante = EXCLUDED.goles_visitante,
    definido_penales = EXCLUDED.definido_penales,
    ganador_penales = EXCLUDED.ganador_penales,
    updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION admin_update_puntos(
  p_admin_pin TEXT,
  p_participante_id UUID,
  p_puntos_total INT,
  p_desglose JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM require_admin(p_admin_pin);

  UPDATE participantes SET
    puntos_total = p_puntos_total,
    desglose = p_desglose
  WHERE id = p_participante_id;
END;
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

CREATE OR REPLACE FUNCTION admin_set_participante_activo(
  p_admin_pin TEXT,
  p_participante_id UUID,
  p_activo BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM require_admin(p_admin_pin);
  UPDATE participantes SET activo = p_activo WHERE id = p_participante_id;
END;
$$;

CREATE OR REPLACE FUNCTION admin_set_participante_pin(
  p_admin_pin TEXT,
  p_participante_id UUID,
  p_pin TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM require_admin(p_admin_pin);
  IF length(p_pin) <> 4 THEN
    RAISE EXCEPTION 'PIN de 4 dígitos requerido';
  END IF;
  UPDATE participantes SET pin_hash = hash_pin(p_pin) WHERE id = p_participante_id;
END;
$$;

CREATE OR REPLACE FUNCTION admin_delete_partido(
  p_admin_pin TEXT,
  p_partido_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM require_admin(p_admin_pin);
  DELETE FROM partidos WHERE id = p_partido_id;
END;
$$;

CREATE OR REPLACE FUNCTION admin_insert_partido(
  p_admin_pin TEXT,
  p_payload JSONB
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

  INSERT INTO partidos (
    fase, grupo, ronda, equipo_local, equipo_visitante,
    escudo_local, escudo_visitante, external_id, fecha, orden
  )
  VALUES (
    p_payload->>'fase',
    NULLIF(p_payload->>'grupo', ''),
    p_payload->>'ronda',
    p_payload->>'equipo_local',
    p_payload->>'equipo_visitante',
    NULLIF(p_payload->>'escudo_local', ''),
    NULLIF(p_payload->>'escudo_visitante', ''),
    NULLIF(p_payload->>'external_id', '')::INT,
    NULLIF(p_payload->>'fecha', '')::TIMESTAMPTZ,
    COALESCE((p_payload->>'orden')::INT, 0)
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION admin_replace_partidos(
  p_admin_pin TEXT,
  p_partidos JSONB
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row JSONB;
  v_count INT := 0;
BEGIN
  PERFORM require_admin(p_admin_pin);

  DELETE FROM partidos;

  FOR v_row IN SELECT * FROM jsonb_array_elements(p_partidos)
  LOOP
    INSERT INTO partidos (
      fase, grupo, ronda, equipo_local, equipo_visitante,
      escudo_local, escudo_visitante, external_id, fecha, orden
    )
    VALUES (
      v_row->>'fase',
      NULLIF(v_row->>'grupo', ''),
      v_row->>'ronda',
      v_row->>'equipo_local',
      v_row->>'equipo_visitante',
      NULLIF(v_row->>'escudo_local', ''),
      NULLIF(v_row->>'escudo_visitante', ''),
      NULLIF(v_row->>'external_id', '')::INT,
      NULLIF(v_row->>'fecha', '')::TIMESTAMPTZ,
      COALESCE((v_row->>'orden')::INT, 0)
    );
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- Login helpers (sin cambios de permisos)
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

CREATE OR REPLACE FUNCTION login_admin(p_pin TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM config
    WHERE admin_pin_hash = hash_pin(p_pin)
  );
$$;

CREATE OR REPLACE FUNCTION get_participantes_login()
RETURNS TABLE (id UUID, nombre TEXT)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.nombre
  FROM participantes p
  WHERE p.activo = true
  ORDER BY p.nombre;
$$;

GRANT EXECUTE ON FUNCTION require_admin(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION upsert_prediccion(UUID, UUID, INT, INT, BOOLEAN) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION upsert_campeon_prediccion(UUID, TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_update_config(TEXT, BOOLEAN, BOOLEAN, INT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_upsert_resultado(TEXT, UUID, INT, INT, BOOLEAN, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_update_puntos(TEXT, UUID, INT, JSONB) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_insert_participante(TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_set_participante_activo(TEXT, UUID, BOOLEAN) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_set_participante_pin(TEXT, UUID, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_delete_partido(TEXT, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_insert_partido(TEXT, JSONB) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_replace_partidos(TEXT, JSONB) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION login_participante(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION login_admin(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_participantes_login() TO anon, authenticated;

-- ── 5. Quitar políticas permisivas viejas ─────────────────────────────────

DROP POLICY IF EXISTS "partidos_select" ON partidos;
DROP POLICY IF EXISTS "partidos_write" ON partidos;
DROP POLICY IF EXISTS "participantes_select" ON participantes;
DROP POLICY IF EXISTS "participantes_write" ON participantes;
DROP POLICY IF EXISTS "predicciones_all" ON predicciones;
DROP POLICY IF EXISTS "prediccion_campeon_all" ON prediccion_campeon;
DROP POLICY IF EXISTS "resultados_select" ON resultados_reales;
DROP POLICY IF EXISTS "resultados_write" ON resultados_reales;
DROP POLICY IF EXISTS "config_select" ON config;
DROP POLICY IF EXISTS "config_update" ON config;

-- ── 6. Políticas nuevas (solo lectura pública) ────────────────────────────

CREATE POLICY "partidos_read" ON partidos
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "predicciones_read" ON predicciones
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "prediccion_campeon_read" ON prediccion_campeon
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "resultados_read" ON resultados_reales
  FOR SELECT TO anon, authenticated
  USING (true);

-- participantes y config: sin SELECT directo (usar vistas / RPCs)
-- service_role (Dashboard SQL) sigue pudiendo todo

COMMIT;

-- ── Verificación rápida ───────────────────────────────────────────────────
-- SELECT * FROM config_public;
-- SELECT * FROM participantes_public LIMIT 3;
-- Intentar (debe fallar): UPDATE participantes SET puntos_total = 9999 WHERE true;
