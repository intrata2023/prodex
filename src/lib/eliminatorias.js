export const MS_UNA_HORA = 60 * 60 * 1000
export const R32_PARTIDOS = 16
export const R32_POR_MITAD = 8

const FASES_ELIM = new Set(['r32', 'r16', 'qf', 'sf', 'final'])

export function isPlaceholderEquipo(name) {
  if (!name || !String(name).trim()) return true
  const raw = String(name).trim()
  const n = raw.toLowerCase()
  if (n === 'tbd' || n === 'por definir') return true
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

export function partidosR32(partidos) {
  return [...(partidos || [])]
    .filter((p) => p.fase === 'r32')
    .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
    .slice(0, R32_PARTIDOS)
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

export const FASES_ELIM_ADMIN = [
  { value: 'r32', label: '16avos de final' },
  { value: 'r16', label: 'Octavos de final' },
  { value: 'qf', label: 'Cuartos de final' },
  { value: 'sf', label: 'Semifinales' },
  { value: 'final', label: 'Final' },
]
