import { FIFA_SLOT_LABELS, fifaMatchNo } from './fifaBracket2026.js'
import { cruceEliminatoriaCompleto } from './eliminatorias.js'
import { resolverEquipoEnPartido, equiposEquivalentes } from './teamCrestAliases.js'
import { ganadorRealPartido } from './scoring.js'

const FASE_ORDEN = { grupos: 0, r32: 1, r16: 2, qf: 3, sf: 4, final: 5 }

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

export function calcularAvanceCuadro(partido, resultado, partidos) {
  if (!partido || partido.fase === 'grupos') return null
  if (!resultadoCompleto(partido, resultado)) return null

  const winnerRaw = ganadorRealPartido(partido, resultado)
  if (!winnerRaw) return null
  const winner = resolverEquipoEnPartido(winnerRaw, partido)

  const sourceNo = fifaMatchNo(partido)
  if (!sourceNo) return null

  const dest = WINNER_DEST.get(sourceNo)
  if (!dest) return null

  const destPartido = findPartidoByFifaNo(partidos, dest.destNo)
  if (!destPartido) return null

  const field = dest.side === 'local' ? 'equipo_local' : 'equipo_visitante'
  if (equiposEquivalentes(destPartido[field], winner)) return null

  return {
    partidoId: destPartido.id,
    field,
    equipo: resolverEquipoEnPartido(winner, destPartido) || winner,
    destPartido,
    sourceFifaNo: sourceNo,
    destFifaNo: dest.destNo,
  }
}

export function listarAvancesCuadro(partidos, resultadosMap) {
  const updates = []
  const seen = new Set()

  for (const p of partidos || []) {
    if (p.fase === 'grupos') continue
    const avance = calcularAvanceCuadro(p, resultadosMap?.[p.id], partidos)
    if (!avance) continue
    const key = `${avance.partidoId}:${avance.field}`
    if (seen.has(key)) continue
    seen.add(key)
    updates.push(avance)
  }

  return updates
}
