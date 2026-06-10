export function prediccionCompleta(pr) {
  return pr?.goles_local != null && pr?.goles_visitante != null
}

export function prediccionEmpezada(pr) {
  return pr && (pr.goles_local != null || pr.goles_visitante != null)
}

export function progressPct(done, total) {
  if (!total) return 0
  if (done >= total) return 100
  return Math.round((done / total) * 100)
}

export function countCompletas(preds, partidoIds) {
  const ids = partidoIds instanceof Set ? partidoIds : new Set(partidoIds)
  const done = new Set()
  for (const pr of preds) {
    if (!prediccionCompleta(pr)) continue
    if (ids.has(pr.partido_id)) done.add(pr.partido_id)
  }
  return done.size
}

export function gruposPendientesPorParticipante(partidosG, predsP) {
  const predMap = Object.fromEntries(predsP.map((pr) => [pr.partido_id, pr]))
  const porGrupo = {}

  for (const partido of partidosG || []) {
    const letra = partido.grupo || '?'
    if (!porGrupo[letra]) porGrupo[letra] = []
    porGrupo[letra].push(partido.id)
  }

  let empezadoGrupos = false
  const pendientes = []

  for (const letra of Object.keys(porGrupo).sort()) {
    const ids = porGrupo[letra]
    let completos = 0
    let empezados = 0

    for (const id of ids) {
      const pr = predMap[id]
      if (prediccionCompleta(pr)) completos++
      if (prediccionEmpezada(pr)) empezados++
    }

    if (empezados > 0) empezadoGrupos = true
    if (completos < ids.length) pendientes.push(letra)
  }

  return { empezadoGrupos, gruposPendientes: pendientes }
}

export function badgeGrupos(done, total) {
  if (total && done >= total) return 'Completo'
  if (!done) return 'Sin empezar'
  return 'En curso'
}

export function badgeEliminatorias(done, total, campeon) {
  if (total && done >= total && campeon?.equipo) return 'Completo'
  if (!done) return 'Sin empezar'
  return 'En curso'
}
