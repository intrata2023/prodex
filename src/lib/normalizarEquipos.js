import { resolverEquipoEnPartido, resolverEquipoEnLista } from './teamCrestAliases.js'

/** Predicciones y resultados con ganador_penales fuera del nombre del fixture. */
export function listarCorreccionesNombresEquipos(partidos, predicciones, resultados) {
  const partidoById = Object.fromEntries((partidos || []).map((p) => [p.id, p]))
  const predFixes = []
  const resFixes = []

  for (const pr of predicciones || []) {
    if (!pr.ganador_penales) continue
    const partido = partidoById[pr.partido_id]
    if (!partido || partido.fase === 'grupos') continue
    const canon = resolverEquipoEnPartido(pr.ganador_penales, partido)
    if (canon !== pr.ganador_penales) {
      predFixes.push({ ...pr, ganador_penales: canon })
    }
  }

  for (const r of resultados || []) {
    if (!r.ganador_penales) continue
    const partido = partidoById[r.partido_id]
    if (!partido || partido.fase === 'grupos') continue
    const canon = resolverEquipoEnPartido(r.ganador_penales, partido)
    if (canon !== r.ganador_penales) {
      resFixes.push({ ...r, ganador_penales: canon })
    }
  }

  return { predFixes, resFixes }
}

export function normalizarCampeonConFinalistas(campeon, finalistasReales) {
  if (!campeon) return campeon
  const equipos = (finalistasReales || []).filter(Boolean)
  if (!equipos.length) return campeon
  return {
    ...campeon,
    finalista_1: campeon.finalista_1
      ? resolverEquipoEnLista(campeon.finalista_1, equipos)
      : campeon.finalista_1,
    finalista_2: campeon.finalista_2
      ? resolverEquipoEnLista(campeon.finalista_2, equipos)
      : campeon.finalista_2,
    equipo: campeon.equipo ? resolverEquipoEnLista(campeon.equipo, equipos) : campeon.equipo,
  }
}
