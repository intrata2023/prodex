export function normalizeGrupo(grupo) {
  const g = String(grupo || '').trim().toUpperCase()
  return g || '?'
}

function normTeam(name) {
  return String(name || '').trim().toLowerCase()
}

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

export function fixtureKey(partido) {
  const a = normTeam(partido.equipo_local)
  const b = normTeam(partido.equipo_visitante)
  const pair = a <= b ? `${a}|${b}` : `${b}|${a}`
  return `${normalizeGrupo(partido.grupo)}|${pair}`
}

export function indexPartidosGrupos(partidosG) {
  const fixtures = new Map()
  const porGrupo = new Map()

  for (const partido of partidosG || []) {
    const grupo = normalizeGrupo(partido.grupo)
    const key = fixtureKey({ ...partido, grupo })
    if (!fixtures.has(key)) {
      fixtures.set(key, { grupo, key, partidos: [], canonical: partido })
    }
    const fx = fixtures.get(key)
    fx.partidos.push(partido)

    const canon = fx.canonical
    const mejorCanon =
      (!canon.external_id && partido.external_id) ||
      (partido.orden ?? 9999) < (canon.orden ?? 9999)
    if (mejorCanon) fx.canonical = partido

    if (!porGrupo.has(grupo)) porGrupo.set(grupo, new Set())
    porGrupo.get(grupo).add(key)
  }

  return { fixtures, porGrupo }
}

function buildPredMap(predsP) {
  return Object.fromEntries(predsP.map((pr) => [pr.partido_id, pr]))
}

function fixtureCompleta(fx, predMap) {
  return fx.partidos.some((p) => prediccionCompleta(predMap[p.id]))
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

export function countGruposCompletas(partidosG, predsP) {
  const { fixtures } = indexPartidosGrupos(partidosG)
  const predMap = buildPredMap(predsP)
  let done = 0
  for (const fx of fixtures.values()) {
    if (fixtureCompleta(fx, predMap)) done++
  }
  return { done, total: fixtures.size }
}

export function detectarDuplicados(partidosG) {
  const { fixtures } = indexPartidosGrupos(partidosG)
  return [...fixtures.values()]
    .filter((fx) => fx.partidos.length > 1)
    .map((fx) => ({
      grupo: fx.grupo,
      cantidad: fx.partidos.length,
      equipo_local: fx.canonical.equipo_local,
      equipo_visitante: fx.canonical.equipo_visitante,
      partido_ids: fx.partidos.map((p) => p.id),
    }))
    .sort((a, b) => a.grupo.localeCompare(b.grupo))
}

export function gruposPendientesPorParticipante(partidosG, predsP) {
  const { fixtures, porGrupo } = indexPartidosGrupos(partidosG)
  const predMap = buildPredMap(predsP)

  let empezadoGrupos = false
  const pendientes = []

  for (const grupo of [...porGrupo.keys()].sort()) {
    const keys = porGrupo.get(grupo)
    let tieneEmpezado = false
    let tieneIncompleto = false

    for (const key of keys) {
      const fx = fixtures.get(key)
      const empezada = fx.partidos.some((p) => prediccionEmpezada(predMap[p.id]))
      if (empezada) tieneEmpezado = true
      if (!fixtureCompleta(fx, predMap)) tieneIncompleto = true
    }

    if (tieneEmpezado) empezadoGrupos = true
    if (tieneIncompleto) pendientes.push(grupo)
  }

  return { empezadoGrupos, gruposPendientes: pendientes }
}

export function listPartidosPendientes(partidosG, predsP) {
  const { fixtures } = indexPartidosGrupos(partidosG)
  const predMap = buildPredMap(predsP)
  const items = []

  for (const fx of fixtures.values()) {
    if (fixtureCompleta(fx, predMap)) continue

    const p = fx.canonical
    const preds = fx.partidos.map((pt) => predMap[pt.id]).filter(Boolean)
    const empezada = preds.some(prediccionEmpezada)
    let estado = 'sin_cargar'
    let detalle = ''

    if (empezada) {
      const pr = preds.find(prediccionEmpezada)
      estado = 'incompleta'
      detalle = `${pr?.goles_local ?? '–'}–${pr?.goles_visitante ?? '–'}`
    }

    items.push({
      grupo: fx.grupo,
      partido_id: p.id,
      orden: p.orden ?? 0,
      equipo_local: p.equipo_local,
      equipo_visitante: p.equipo_visitante,
      estado,
      detalle,
      duplicadoEnDb: fx.partidos.length > 1,
    })
  }

  return items.sort(
    (a, b) => a.grupo.localeCompare(b.grupo) || a.orden - b.orden
  )
}

export function mapPrediccionesACanonica(partidosG, predicciones = {}) {
  const { fixtures } = indexPartidosGrupos(partidosG)
  const map = { ...predicciones }

  for (const fx of fixtures.values()) {
    const canonicalId = fx.canonical.id
    for (const partido of fx.partidos) {
      const pred = predicciones[partido.id]
      if (pred) {
        map[canonicalId] = { ...pred, partido_id: canonicalId }
        break
      }
    }
  }

  return map
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
