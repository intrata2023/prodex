-- Prode Mundial 2026 - Schema
-- Ejecutar en Supabase SQL Editor

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Config global (una sola fila)
CREATE TABLE config (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  grupos_abiertos BOOLEAN NOT NULL DEFAULT true,
  eliminatorias_abiertos BOOLEAN NOT NULL DEFAULT false,
  admin_pin_hash TEXT NOT NULL,
  monto_por_persona INT NOT NULL DEFAULT 15000,
  campeon_real TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Participantes
CREATE TABLE participantes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario TEXT NOT NULL,
  nombre TEXT NOT NULL,
  pin_hash TEXT NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT true,
  puntos_total INT NOT NULL DEFAULT 0,
  desglose JSONB NOT NULL DEFAULT '{"grupos":0,"eliminatorias":0,"final":0}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (usuario)
);

-- Partidos
CREATE TABLE partidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fase TEXT NOT NULL CHECK (fase IN ('grupos', 'r32', 'r16', 'qf', 'sf', 'final')),
  grupo TEXT,
  ronda TEXT NOT NULL,
  equipo_local TEXT NOT NULL,
  equipo_visitante TEXT NOT NULL,
  escudo_local TEXT,
  escudo_visitante TEXT,
  external_id INT,
  fecha TIMESTAMPTZ,
  orden INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_partidos_fase ON partidos(fase);
CREATE INDEX idx_partidos_grupo ON partidos(grupo);
CREATE INDEX idx_partidos_external ON partidos(external_id);

-- Predicciones por partido
CREATE TABLE predicciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participante_id UUID NOT NULL REFERENCES participantes(id) ON DELETE CASCADE,
  partido_id UUID NOT NULL REFERENCES partidos(id) ON DELETE CASCADE,
  goles_local INT,
  goles_visitante INT,
  penales BOOLEAN NOT NULL DEFAULT false,
  ganador_penales TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (participante_id, partido_id)
);

CREATE INDEX idx_predicciones_participante ON predicciones(participante_id);

-- Campeón y finalistas predichos
CREATE TABLE prediccion_campeon (
  participante_id UUID PRIMARY KEY REFERENCES participantes(id) ON DELETE CASCADE,
  equipo TEXT,
  finalista_1 TEXT,
  finalista_2 TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Resultados reales
CREATE TABLE resultados_reales (
  partido_id UUID PRIMARY KEY REFERENCES partidos(id) ON DELETE CASCADE,
  goles_local INT,
  goles_visitante INT,
  definido_penales BOOLEAN NOT NULL DEFAULT false,
  ganador_penales TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Vista pública de participantes (sin PIN)
CREATE VIEW participantes_public AS
  SELECT id, nombre, activo, puntos_total, desglose
  FROM participantes
  WHERE activo = true;

CREATE VIEW participantes_list AS
  SELECT id, usuario, nombre, activo, puntos_total, desglose, created_at
  FROM participantes;

-- Hash PIN (SHA-256 hex)
CREATE OR REPLACE FUNCTION hash_pin(pin TEXT)
RETURNS TEXT AS $$
  SELECT encode(extensions.digest(pin, 'sha256'), 'hex');
$$ LANGUAGE SQL IMMUTABLE SET search_path = public, extensions;

-- Login participante
CREATE OR REPLACE FUNCTION login_participante(p_nombre TEXT, p_pin TEXT)
RETURNS TABLE (id UUID, nombre TEXT) AS $$
  SELECT p.id, p.nombre
  FROM participantes p
  WHERE lower(trim(p.usuario)) = lower(trim(p_nombre))
    AND p.pin_hash = hash_pin(p_pin)
    AND p.activo = true;
$$ LANGUAGE SQL SECURITY DEFINER;

-- Login admin
CREATE OR REPLACE FUNCTION login_admin(p_pin TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM config
    WHERE admin_pin_hash = hash_pin(p_pin)
  );
$$ LANGUAGE SQL SECURITY DEFINER;

-- Listar nombres para selector login
CREATE OR REPLACE FUNCTION get_participantes_login()
RETURNS TABLE (id UUID, nombre TEXT) AS $$
  SELECT p.id, p.nombre
  FROM participantes p
  WHERE p.activo = true
  ORDER BY p.nombre;
$$ LANGUAGE SQL SECURITY DEFINER;

-- Upsert predicción
CREATE OR REPLACE FUNCTION upsert_prediccion(
  p_participante_id UUID,
  p_partido_id UUID,
  p_goles_local INT,
  p_goles_visitante INT,
  p_penales BOOLEAN DEFAULT false,
  p_ganador_penales TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO predicciones (
    participante_id, partido_id, goles_local, goles_visitante, penales, ganador_penales, updated_at
  )
  VALUES (
    p_participante_id,
    p_partido_id,
    p_goles_local,
    p_goles_visitante,
    COALESCE(p_penales, false),
    p_ganador_penales,
    now()
  )
  ON CONFLICT (participante_id, partido_id)
  DO UPDATE SET
    goles_local = EXCLUDED.goles_local,
    goles_visitante = EXCLUDED.goles_visitante,
    penales = EXCLUDED.penales,
    ganador_penales = EXCLUDED.ganador_penales,
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Upsert campeón
CREATE OR REPLACE FUNCTION upsert_campeon_prediccion(
  p_participante_id UUID,
  p_equipo TEXT,
  p_finalista_1 TEXT DEFAULT NULL,
  p_finalista_2 TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO prediccion_campeon (participante_id, equipo, finalista_1, finalista_2, updated_at)
  VALUES (p_participante_id, p_equipo, p_finalista_1, p_finalista_2, now())
  ON CONFLICT (participante_id)
  DO UPDATE SET
    equipo = EXCLUDED.equipo,
    finalista_1 = EXCLUDED.finalista_1,
    finalista_2 = EXCLUDED.finalista_2,
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS
ALTER TABLE participantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE partidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE predicciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE prediccion_campeon ENABLE ROW LEVEL SECURITY;
ALTER TABLE resultados_reales ENABLE ROW LEVEL SECURITY;
ALTER TABLE config ENABLE ROW LEVEL SECURITY;

-- Lectura abierta para app interna (anon key)
CREATE POLICY "partidos_select" ON partidos FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "participantes_select" ON participantes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "predicciones_all" ON predicciones FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "prediccion_campeon_all" ON prediccion_campeon FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "resultados_select" ON resultados_reales FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "resultados_write" ON resultados_reales FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "config_select" ON config FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "config_update" ON config FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "participantes_write" ON participantes FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "partidos_write" ON partidos FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Config inicial (admin PIN: 000000 hasta que lo cambies)
INSERT INTO config (id, admin_pin_hash, grupos_abiertos, eliminatorias_abiertos)
VALUES (1, hash_pin('000000'), true, false);
