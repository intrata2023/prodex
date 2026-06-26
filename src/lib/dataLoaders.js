import { fetchAllRows } from './fetchAll.js'

/** Partidos completos, ordenados por fecha y orden. */
export function fetchAllPartidos(supabase) {
  return fetchAllRows(supabase, 'partidos', '*', (q) =>
    q.order('fecha', { ascending: true, nullsFirst: false }).order('orden')
  )
}

/** Todos los resultados reales. */
export function fetchAllResultados(supabase) {
  return fetchAllRows(supabase, 'resultados_reales', '*')
}

/** Participantes activos para la tabla pública. */
export function fetchAllParticipantesPublic(supabase) {
  return fetchAllRows(
    supabase,
    'participantes_public',
    'id, nombre, puntos_total, desglose',
    (q) => q.order('puntos_total', { ascending: false })
  )
}

/** Todas las predicciones (varios participantes). */
export function fetchAllPredicciones(supabase) {
  return fetchAllRows(supabase, 'predicciones', '*')
}

/** Predicciones de un participante. */
export function fetchPrediccionesParticipante(supabase, participanteId) {
  return fetchAllRows(supabase, 'predicciones', '*', (q) =>
    q.eq('participante_id', participanteId)
  )
}

export function mapResultadosPorPartido(rows) {
  return Object.fromEntries((rows || []).map((r) => [r.partido_id, r]))
}
