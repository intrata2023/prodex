import { FIFA_SLOT_LABELS, fifaMatchNo } from './fifaBracket2026.js'
import { cruceEliminatoriaCompleto } from './eliminatorias.js'
import { ganadorRealPartido } from './scoring.js'

const FASE_ORDEN = { grupos: 0, r32: 1, r16: 2, qf: 3, sf: 4, final: 5 }

export const ELIM_FIFA_NUMBERS = Object.keys(FIFA_SLOT_LABELS)
  .map(Number)
  .sort((a, b) => a - b)

export function buildWinnerDestinations() {
  const map = new Map()
  for (const [destStr, slot] of Object.entries(FIFA_SLOT_LABELS)) {
    const destNo = Number(destStr)
    if (destNo < 89) continue
    for (const [side, label] of Object.entries(slot)) {
      const m = String(label).match(/Gan\.?\s*M(\d+)/i)
      if (m) map.set(Number(m[1]), { destNo, side })
    }
  }
  return map
}

const WINNER_DEST = buildWinnerDestinations()

export function findPartidoByFifaNo(partidos, fifaNo) {
  for (const p of partidos || []) {
    if (fifaMatchNo(p) === fifaNo) return p
  }
  return null
}

export function esPartidoTercerPuesto(partido) {
  return partido?.ronda?.toLowerCase().includes('tercer')
}

export function resultadoCompleto(partido, resultado) {
  if (!resultado || resultado.goles_local == null || resultado.goles_visitante == null) {
    return false
  }
  if (resultado.goles_local !== resultado.goles_visitante) return true
  if (partido?.fase === 'grupos') return true
  return Boolean(resultado.definido_penales && resultado.ganador_penales)
}

export function partidosPendientesResultado(partidos, resultadosMap) {
  return (partidos || [])
    .filter((p) => cruceEliminatoriaCompleto(p))
    .filter((p) => !resultadoCompleto(p, resultadosMap?.[p.id]))
    .sort((a, b) => {
      const fa = FASE_ORDEN[a.fase] ?? 99
      const fb = FASE_ORDEN[b.fase] ?? 99
      return fa - fb || (a.orden ?? 0) - (b.orden ?? 0)
    })
}

function resolverSlotEquipo(label, partidos, resultadosMap, resolved) {
  const gan = String(label).match(/Gan\.?\s*M(\d+)/i)
  if (!gan) return label

  const sourceNo = Number(gan[1])
  const sourcePartido = findPartidoByFifaNo(partidos, sourceNo)
  if (!sourcePartido) return label

  const sourceTeams = resolved.get(sourceNo)
  if (!sourceTeams) return label

  const virtual = {
    ...sourcePartido,
    equipo_local: sourceTeams.local,
    equipo_visitante: sourceTeams.visitante,
  }
  const res = resultadosMap?.[sourcePartido.id]
  if (resultadoCompleto(virtual, res)) {
    const winner = ganadorRealPartido(virtual, res)
    if (winner) return winner
  }
  return label
}

/** Equipos resueltos por slot FIFA según resultados actuales (incluye revertir a placeholders). */
export function buildEquiposCuadroResueltos(partidos, resultadosMap) {
  const resolved = new Map()

  for (const fifaNo of ELIM_FIFA_NUMBERS) {
    const partido = findPartidoByFifaNo(partidos, fifaNo)
    const slot = FIFA_SLOT_LABELS[fifaNo]
    if (!slot) continue

    if (fifaNo < 89) {
      if (partido) {
        resolved.set(fifaNo, {
          local: partido.equipo_local,
          visitante: partido.equipo_visitante,
        })
      }
      continue
    }

    resolved.set(fifaNo, {
      local: resolverSlotEquipo(slot.local, partidos, resultadosMap, resolved),
      visitante: resolverSlotEquipo(slot.visitante, partidos, resultadosMap, resolved),
    })
  }

  return resolved
}

/** Todos los cambios necesarios en octavos+ para reflejar resultados (avance y retroceso). */
export function listarSyncCuadro(partidos, resultadosMap) {
  const resolved = buildEquiposCuadroResueltos(partidos, resultadosMap)
  const updates = []

  for (const partido of partidos || []) {
    if (partido.fase === 'grupos' || esPartidoTercerPuesto(partido)) continue

    const fifaNo = fifaMatchNo(partido)
    if (!fifaNo || fifaNo < 89) continue

    const desired = resolved.get(fifaNo)
    if (!desired) continue

    if (partido.equipo_local !== desired.local) {
      updates.push({
        partidoId: partido.id,
        field: 'equipo_local',
        equipo: desired.local,
        destPartido: partido,
        destFifaNo: fifaNo,
      })
    }
    if (partido.equipo_visitante !== desired.visitante) {
      updates.push({
        partidoId: partido.id,
        field: 'equipo_visitante',
        equipo: desired.visitante,
        destPartido: partido,
        destFifaNo: fifaNo,
      })
    }
  }

  return updates
}

export function calcularCampeonDesdeCuadro(partidos, resultadosMap, resolved = null) {
  const map = resolved || buildEquiposCuadroResueltos(partidos, resultadosMap)
  const finalPartido = (partidos || []).find(
    (p) => p.fase === 'final' && !esPartidoTercerPuesto(p)
  )
  if (!finalPartido) return null

  const fifaNo = fifaMatchNo(finalPartido)
  const teams = fifaNo ? map.get(fifaNo) : null
  const virtual = teams
    ? {
        ...finalPartido,
        equipo_local: teams.local,
        equipo_visitante: teams.visitante,
      }
    : finalPartido

  const res = resultadosMap?.[finalPartido.id]
  if (!resultadoCompleto(virtual, res)) return null
  return ganadorRealPartido(virtual, res)
}

export function calcularAvanceCuadro(partido, resultado, partidos) {
  if (!partido || partido.fase === 'grupos') return null
  if (!resultadoCompleto(partido, resultado)) return null

  const winner = ganadorRealPartido(partido, resultado)
  if (!winner) return null

  const sourceNo = fifaMatchNo(partido)
  if (!sourceNo) return null

  const dest = WINNER_DEST.get(sourceNo)
  if (!dest) return null

  const destPartido = findPartidoByFifaNo(partidos, dest.destNo)
  if (!destPartido) return null

  const field = dest.side === 'local' ? 'equipo_local' : 'equipo_visitante'
  if (destPartido[field] === winner) return null

  return {
    partidoId: destPartido.id,
    field,
    equipo: winner,
    destPartido,
    sourceFifaNo: sourceNo,
    destFifaNo: dest.destNo,
  }
}

/** @deprecated Usar listarSyncCuadro para sincronización bidireccional. */
export function listarAvancesCuadro(partidos, resultadosMap) {
  return listarSyncCuadro(partidos, resultadosMap)
}
