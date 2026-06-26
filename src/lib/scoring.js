/**
 * Cálculo de puntos - Prode Mundial 2026
 */

export function ganador(golesLocal, golesVisitante) {
  if (golesLocal == null || golesVisitante == null) return null
  if (golesLocal > golesVisitante) return 'local'
  if (golesVisitante > golesLocal) return 'visitante'
  return 'empate'
}

export function puntosGrupo(pred, real) {
  if (
    real.goles_local == null ||
    real.goles_visitante == null ||
    pred.goles_local == null ||
    pred.goles_visitante == null
  ) {
    return 0
  }
  const exacto =
    pred.goles_local === real.goles_local &&
    pred.goles_visitante === real.goles_visitante
  if (exacto) return 2
  const gPred = ganador(pred.goles_local, pred.goles_visitante)
  const gReal = ganador(real.goles_local, real.goles_visitante)
  if (gPred === gReal) return 1
  return 0
}

function equipoQuePasa(data, partido, esPrediccion) {
  const gl = data.goles_local
  const gv = data.goles_visitante
  if (gl == null || gv == null) return null
  if (gl > gv) return partido.equipo_local
  if (gv > gl) return partido.equipo_visitante
  if (gl === gv) {
    if (esPrediccion) {
      if (data.penales && data.ganador_penales) return data.ganador_penales
      return null
    }
    if (data.definido_penales && data.ganador_penales) return data.ganador_penales
    return null
  }
  return null
}

export function puntosEliminatoria(pred, real, partido) {
  if (
    real.goles_local == null ||
    real.goles_visitante == null ||
    pred.goles_local == null ||
    pred.goles_visitante == null
  ) {
    return 0
  }
  const exacto =
    pred.goles_local === real.goles_local &&
    pred.goles_visitante === real.goles_visitante
  const empateReal = real.goles_local === real.goles_visitante
  const empatePred = pred.goles_local === pred.goles_visitante
  const penalesOk =
    empateReal &&
    empatePred &&
    exacto &&
    real.definido_penales &&
    pred.penales &&
    pred.ganador_penales &&
    real.ganador_penales &&
    pred.ganador_penales === real.ganador_penales

  if (exacto && penalesOk) return 3
  if (exacto) return 2

  const pasaPred = equipoQuePasa(pred, partido, true)
  const pasaReal = equipoQuePasa(real, partido, false)
  if (pasaPred && pasaReal && pasaPred === pasaReal) return 1
  return 0
}

/** null si aún no hay resultado real cargado */
export function aciertoPrediccion(pred, real, partido) {
  if (
    !pred ||
    !real ||
    pred.goles_local == null ||
    pred.goles_visitante == null ||
    real.goles_local == null ||
    real.goles_visitante == null
  ) {
    return null
  }

  if (partido?.fase === 'grupos') {
    const pts = puntosGrupo(pred, real)
    if (pts === 2) return { tipo: 'exacto', pts, label: 'Acertaste resultado exacto' }
    if (pts === 1) return { tipo: 'ganador', pts, label: 'Acertaste resultado parcial' }
    return { tipo: 'fallo', pts: 0, label: 'No acertaste' }
  }

  const pts = puntosEliminatoria(pred, real, partido)
  if (pts === 3) return { tipo: 'exacto', pts, label: 'Acertaste resultado exacto y penales' }
  if (pts === 2) return { tipo: 'exacto', pts, label: 'Acertaste resultado exacto' }
  if (pts === 1) return { tipo: 'ganador', pts, label: 'Acertaste resultado parcial' }
  return { tipo: 'fallo', pts: 0, label: 'No acertaste' }
}

export function puntosFinalCampeon({
  finalista_1,
  finalista_2,
  campeonPred,
  finalistasReales,
  campeonReal,
}) {
  const preds = [finalista_1, finalista_2].filter(Boolean)
  const reales = finalistasReales.filter(Boolean)
  let aciertosFinalistas = 0
  for (const f of preds) {
    if (reales.includes(f)) aciertosFinalistas++
  }
  const acertoCampeon = campeonPred && campeonReal && campeonPred === campeonReal

  if (aciertosFinalistas === 2 && acertoCampeon) return 12
  if (aciertosFinalistas === 2 && !acertoCampeon) return 5
  if (acertoCampeon) return 8
  if (aciertosFinalistas === 1) return 3
  return 0
}

export function calcularPuntosParticipante({
  partidos,
  predicciones,
  resultados,
  predCampeon,
  campeonReal,
  finalistasReales,
}) {
  const resMap = Object.fromEntries(resultados.map((r) => [r.partido_id, r]))
  const predMap = Object.fromEntries(predicciones.map((p) => [p.partido_id, p]))
  let grupos = 0
  let eliminatorias = 0
  let finalPts = 0

  for (const partido of partidos) {
    const pred = predMap[partido.id]
    const real = resMap[partido.id]
    if (!pred || !real) continue
    if (partido.fase === 'grupos') {
      grupos += puntosGrupo(pred, real)
    } else {
      eliminatorias += puntosEliminatoria(pred, real, partido)
    }
  }

  if (campeonReal && finalistasReales?.length >= 2) {
    finalPts = puntosFinalCampeon({
      finalista_1: predCampeon?.finalista_1,
      finalista_2: predCampeon?.finalista_2,
      campeonPred: predCampeon?.equipo,
      finalistasReales,
      campeonReal,
    })
  }

  return {
    total: grupos + eliminatorias + finalPts,
    desglose: { grupos, eliminatorias, final: finalPts },
  }
}

export function calcularTodosLosPuntos(
  participantes,
  partidos,
  todasPredicciones,
  resultados,
  campeonesPred,
  campeonReal,
  finalistasReales
) {
  return participantes.map((p) => {
    const preds = todasPredicciones.filter((pr) => pr.participante_id === p.id)
    const predCampeon = campeonesPred.find((c) => c.participante_id === p.id)
    const { total, desglose } = calcularPuntosParticipante({
      partidos,
      predicciones: preds,
      resultados,
      predCampeon,
      campeonReal,
      finalistasReales,
    })
    return { id: p.id, puntos_total: total, desglose }
  })
}
