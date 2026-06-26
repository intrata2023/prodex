-- Ejecutar en Supabase SQL Editor (proyecto existente)
-- Guarda quién gana por penales en predicciones de eliminatorias

ALTER TABLE predicciones
  ADD COLUMN IF NOT EXISTS ganador_penales TEXT;

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
