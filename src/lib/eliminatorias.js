import { sortPartidosCuadro } from './fifaBracket2026.js'

export const MS_UNA_HORA = 60 * 60 * 1000
export const R32_PARTIDOS = 16
export const R32_POR_MITAD = 8

const FASES_ELIM = new Set(['r32', 'r16', 'qf', 'sf', 'final'])

export function isPlaceholderEquipo(name) {
  if (!name || !String(name).trim()) return true
  const raw = String(name).trim()
  const n = raw.toLowerCase()
  if (n === 'tbd' || n === 'por definir') return true
  if (/^ganador del partido \d+$/i.test(raw)) return true
  if (/^gan\.?\s*m\d+/i.test(raw)) return true
  if (/^ganador\s+m\d+/i.test(raw)) return true
  if (/^3°/i.test(raw)) return true
  if (/^[12][a-l]$/i.test(raw)) return true
  if (/^1[a-l]$/i.test(raw)) return true
  if (/^3[a-l0-9/]+$/i.test(raw) && raw.includes('/')) return true
  return (
    n.includes('por definir') ||
    n.includes('· local') ||
    n.includes('· visitante') ||
    /·\s*(local|visitante)\s*\d/i.test(raw) ||
    /16avos.*local|16avos.*visitante/.test(n) ||
    /octavos.*local|octavos.*visitante/.test(n) ||
    /cuartos.*local|cuartos.*visitante/.test(n) ||
    /semi.*local|semi.*visitante/.test(n) ||
    /final.*local|final.*visitante/.test(n) ||
    /^(local|visitante)\s+\d+$/i.test(raw)
  )
}

/** Ambos equipos del cruce están confirmados (no placeholders). */
export function cruceEliminatoriaCompleto(partido) {
  if (!partido || partido.fase === 'grupos') return true
  return (
    !isPlaceholderEquipo(partido.equipo_local) &&
    !isPlaceholderEquipo(partido.equipo_visitante)
  )
}

export function partidosR32(partidos) {
  return sortPartidosCuadro(
    (partidos || []).filter((p) => p.fase === 'r32'),
    'r32'
  ).slice(0, R32_PARTIDOS)
}

/** Los 16 cruces de 16avos tienen equipos reales en ambos lados. */
export function cuadroR32Completo(partidos) {
  const r32 = partidosR32(partidos)
  if (r32.length < R32_PARTIDOS) return false
  return r32.every(
    (p) => !isPlaceholderEquipo(p.equipo_local) && !isPlaceholderEquipo(p.equipo_visitante)
  )
}

/** Equipos de una mitad del cuadro (primeros u últimos 8 cruces de 16avos). */
export function equiposMitadCuadro(partidos, mitad) {
  const r32 = partidosR32(partidos)
  const slice =
    mitad === 'izq' ? r32.slice(0, R32_POR_MITAD) : r32.slice(R32_POR_MITAD, R32_PARTIDOS)
  const equipos = new Set()
  for (const p of slice) {
    if (!isPlaceholderEquipo(p.equipo_local)) equipos.add(p.equipo_local)
    if (!isPlaceholderEquipo(p.equipo_visitante)) equipos.add(p.equipo_visitante)
  }
  return [...equipos].sort((a, b) => a.localeCompare(b, 'es'))
}

export function inicioPartidoMs(partido) {
  if (!partido?.fecha) return null
  const t = new Date(partido.fecha).getTime()
  return Number.isNaN(t) ? null : t
}

/** Carga cerrada 1 hora antes del inicio del partido. */
export function partidoEdicionCerrada(partido, ahora = Date.now()) {
  const inicio = inicioPartidoMs(partido)
  if (inicio == null) return false
  return ahora >= inicio - MS_UNA_HORA
}

/** ISO del cierre de carga (1 h antes del partido). */
export function cierreCargaPartidoIso(partido) {
  const inicio = inicioPartidoMs(partido)
  if (inicio == null) return null
  return new Date(inicio - MS_UNA_HORA).toISOString()
}

/**
 * Mostrar predicciones de todos para un partido.
 * Grupos: siempre. Eliminatorias: solo cuando la carga de ese cruce está cerrada.
 */
export function mostrarPrediccionesContrincantes(
  partido,
  { eliminatoriasAbiertos = true, ahora = Date.now() } = {}
) {
  if (!partido) return false
  if (partido.fase === 'grupos') return true
  if (!cruceEliminatoriaCompleto(partido)) return false

  return !eliminatoriasAbiertos || partidoEdicionCerrada(partido, ahora)
}

/** Mostrar enlace «Ver todos» (la pantalla puede seguir bloqueada hasta 1 h antes). */
export function linkVerTodosContrincantes(partido) {
  if (!partido) return false
  return cruceEliminatoriaCompleto(partido)
}

/** Texto cuando la predicción de un rival aún no se puede ver; null si es visible. */
export function mensajePrediccionContrincante(
  partido,
  { eliminatoriasAbiertos = true, ahora = Date.now() } = {}
) {
  if (!partido || partido.fase === 'grupos') return null
  if (mostrarPrediccionesContrincantes(partido, { eliminatoriasAbiertos, ahora })) {
    return null
  }
  if (!cruceEliminatoriaCompleto(partido)) {
    return 'Se revela cuando estén los dos equipos del cruce'
  }
  const cierre = formatCierreRelativo(cierreCargaPartidoIso(partido))
  if (cierre) {
    return `Se revela ${cierre} ART (1 h antes del partido, cuando cierra la carga)`
  }
  return 'Se revela 1 h antes del partido, cuando cierra la carga'
}

export function primerInicioEliminatorias(partidos) {
  let min = null
  for (const p of partidos || []) {
    if (!FASES_ELIM.has(p.fase)) continue
    const t = inicioPartidoMs(p)
    if (t == null) continue
    if (min == null || t < min) min = t
  }
  return min
}

/** Finalistas y campeón: cerrado 1 h antes del primer partido de eliminatorias. */
export function campeonEdicionCerrada(partidos, ahora = Date.now()) {
  const inicio = primerInicioEliminatorias(partidos)
  if (inicio == null) return false
  return ahora >= inicio - MS_UNA_HORA
}

export function formatCierreRelativo(fechaIso) {
  if (!fechaIso) return null
  const d = new Date(fechaIso)
  if (Number.isNaN(d.getTime())) return null
  return new Intl.DateTimeFormat('es-AR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'America/Argentina/Buenos_Aires',
  }).format(d)
}

/** Equipos para armar cruces a mano (todos los de grupos + ya asignados en eliminatorias). */
export function equiposDisponiblesAdmin(partidos) {
  const equipos = new Set()
  for (const p of partidos || []) {
    if (p.fase === 'grupos') {
      if (p.equipo_local) equipos.add(p.equipo_local)
      if (p.equipo_visitante) equipos.add(p.equipo_visitante)
      continue
    }
    if (!isPlaceholderEquipo(p.equipo_local)) equipos.add(p.equipo_local)
    if (!isPlaceholderEquipo(p.equipo_visitante)) equipos.add(p.equipo_visitante)
  }
  return [...equipos].sort((a, b) => a.localeCompare(b, 'es'))
}

/** Equipos ya asignados en otros partidos de la misma fase. */
export function equiposOcupadosEnFase(partidos, fase, excluirPartidoId = null) {
  const ocupados = new Set()
  for (const p of partidos || []) {
    if (p.fase !== fase) continue
    if (excluirPartidoId && p.id === excluirPartidoId) continue
    if (!isPlaceholderEquipo(p.equipo_local)) ocupados.add(p.equipo_local)
    if (!isPlaceholderEquipo(p.equipo_visitante)) ocupados.add(p.equipo_visitante)
  }
  return ocupados
}

/** Opciones de un desplegable admin: libres en la fase + el equipo actual de ese lado. */
export function equiposOpcionesCruceAdmin(partidos, partido, lado, equiposBase = []) {
  if (!partido) return []

  const actual = lado === 'local' ? partido.equipo_local : partido.equipo_visitante
  const rival = lado === 'local' ? partido.equipo_visitante : partido.equipo_local
  const ocupados = equiposOcupadosEnFase(partidos, partido.fase, partido.id)
  if (!isPlaceholderEquipo(rival)) ocupados.add(rival)

  const pool = new Set(equiposBase)
  if (!isPlaceholderEquipo(actual)) pool.add(actual)

  return [...pool]
    .filter((e) => {
      if (!isPlaceholderEquipo(actual) && e === actual) return true
      return !ocupados.has(e)
    })
    .sort((a, b) => a.localeCompare(b, 'es'))
}

export const FASES_ELIM_ADMIN = [
  { value: 'r32', label: '16avos de final' },
  { value: 'r16', label: 'Octavos de final' },
  { value: 'qf', label: 'Cuartos de final' },
  { value: 'sf', label: 'Semifinales' },
  { value: 'final', label: 'Final' },
]
