export function normalizeGrupo(grupo) {
  const g = String(grupo || '').trim().toUpperCase()
  return g || '?'
}

export function normTeam(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
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

export function sameTeams(a, b) {
  const teamsA = new Set([normTeam(a?.equipo_local), normTeam(a?.equipo_visitante)])
  const teamsB = new Set([normTeam(b?.equipo_local), normTeam(b?.equipo_visitante)])
  if (teamsA.size !== teamsB.size) return false
  for (const t of teamsA) if (!teamsB.has(t)) return false
  return true
}

export function mismoCruce(a, b) {
  if (!a || !b) return false
  return normalizeGrupo(a.grupo) === normalizeGrupo(b.grupo) && sameTeams(a, b)
}

export function fixtureKey(partido) {
  const a = normTeam(partido.equipo_local)
  const b = normTeam(partido.equipo_visitante)
  const pair = a <= b ? `${a}|${b}` : `${b}|${a}`
  return `${normalizeGrupo(partido.grupo)}|${pair}`
}

function elegirCanonico(actual, candidato) {
  if (!actual) return candidato
  if (!actual.external_id && candidato.external_id) return candidato
  if ((candidato.orden ?? 9999) < (actual.orden ?? 9999)) return candidato
  return actual
}

function mergeFixtures(fixtures, porGrupo) {
  for (const grupo of porGrupo.keys()) {
    const keys = [...porGrupo.get(grupo)]
    const eliminadas = new Set()

    for (let i = 0; i < keys.length; i++) {
      const keyA = keys[i]
      if (eliminadas.has(keyA)) continue
      const fxA = fixtures.get(keyA)
      if (!fxA) continue

      for (let j = i + 1; j < keys.length; j++) {
        const keyB = keys[j]
        if (eliminadas.has(keyB)) continue
        const fxB = fixtures.get(keyB)
        if (!fxB || !sameTeams(fxA.canonical, fxB.canonical)) continue

        fxA.partidos.push(...fxB.partidos)
        fxA.canonical = elegirCanonico(fxA.canonical, fxB.canonical)
        fixtures.delete(keyB)
        eliminadas.add(keyB)
        porGrupo.get(grupo).delete(keyB)
      }
    }
  }
}

export function indexPartidosGrupos(partidosG) {
  const fixtures = new Map()
  const porGrupo = new Map()
  const keyPorExternal = new Map()

  for (const partido of partidosG || []) {
    const grupo = normalizeGrupo(partido.grupo)
    let key = fixtureKey({ ...partido, grupo })

    if (partido.external_id != null && keyPorExternal.has(partido.external_id)) {
      key = keyPorExternal.get(partido.external_id)
    }

    if (!fixtures.has(key)) {
      fixtures.set(key, { grupo, key, partidos: [], canonical: partido })
    }

    const fx = fixtures.get(key)
    fx.partidos.push(partido)
    fx.canonical = elegirCanonico(fx.canonical, partido)

    if (partido.external_id != null) {
      keyPorExternal.set(partido.external_id, key)
    }

    if (!porGrupo.has(grupo)) porGrupo.set(grupo, new Set())
    porGrupo.get(grupo).add(key)
  }

  mergeFixtures(fixtures, porGrupo)
  return { fixtures, porGrupo }
}

export function buildPartidoById(partidosG) {
  return new Map((partidosG || []).map((p) => [p.id, p]))
}

export function prediccionParaFixture(fx, predsP, partidoById) {
  for (const pr of predsP) {
    const partido = partidoById.get(pr.partido_id)
    if (!partido || !mismoCruce(partido, fx.canonical)) continue
    return pr
  }
  return null
}

function fixtureCompleta(fx, predsP, partidoById) {
  const pr = prediccionParaFixture(fx, predsP, partidoById)
  return prediccionCompleta(pr)
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
  const partidoById = buildPartidoById(partidosG)
  let done = 0
  for (const fx of fixtures.values()) {
    if (fixtureCompleta(fx, predsP, partidoById)) done++
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

export function predsLista(predicciones = {}) {
  if (Array.isArray(predicciones)) return predicciones
  return Object.entries(predicciones).map(([partido_id, pr]) => ({
    ...pr,
    partido_id: pr?.partido_id ?? partido_id,
  }))
}

export function letrasGruposIncompletos(partidosG, predicciones = {}) {
  return gruposPendientesPorParticipante(partidosG, predsLista(predicciones)).gruposPendientes
}

export function gruposPendientesPorParticipante(partidosG, predsP) {
  const { fixtures, porGrupo } = indexPartidosGrupos(partidosG)
  const partidoById = buildPartidoById(partidosG)

  let empezadoGrupos = false
  const pendientes = []

  for (const grupo of [...porGrupo.keys()].sort()) {
    const keys = porGrupo.get(grupo)
    let tieneEmpezado = false
    let tieneIncompleto = false

    for (const key of keys) {
      const fx = fixtures.get(key)
      const pr = prediccionParaFixture(fx, predsP, partidoById)
      if (prediccionEmpezada(pr)) tieneEmpezado = true
      if (!prediccionCompleta(pr)) tieneIncompleto = true
    }

    if (tieneEmpezado) empezadoGrupos = true
    if (tieneIncompleto) pendientes.push(grupo)
  }

  return { empezadoGrupos, gruposPendientes: pendientes }
}

export function listPartidosPendientes(partidosG, predsP) {
  const { fixtures } = indexPartidosGrupos(partidosG)
  const partidoById = buildPartidoById(partidosG)
  const items = []

  for (const fx of fixtures.values()) {
    const pr = prediccionParaFixture(fx, predsP, partidoById)
    if (prediccionCompleta(pr)) continue

    const p = fx.canonical
    let estado = 'sin_cargar'
    let detalle = ''

    if (prediccionEmpezada(pr)) {
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

export function resolveCanonicalPartidoId(partidosG, partidoId) {
  const partidoById = buildPartidoById(partidosG)
  const partido = partidoById.get(partidoId)
  if (!partido) return partidoId

  const { fixtures } = indexPartidosGrupos(partidosG)
  for (const fx of fixtures.values()) {
    if (mismoCruce(partido, fx.canonical)) return fx.canonical.id
  }
  return partidoId
}

export function mapPrediccionesACanonica(partidosG, predicciones = {}) {
  const { fixtures } = indexPartidosGrupos(partidosG)
  const partidoById = buildPartidoById(partidosG)
  const map = { ...predicciones }

  for (const fx of fixtures.values()) {
    const canonicalId = fx.canonical.id
    const pr = prediccionParaFixture(fx, Object.values(predicciones), partidoById)
    if (pr) {
      map[canonicalId] = { ...pr, partido_id: canonicalId }
    }
  }

  return map
}

export function reparacionesPredicciones(partidosG, predicciones = {}) {
  const { fixtures } = indexPartidosGrupos(partidosG)
  const partidoById = buildPartidoById(partidosG)
  const fixes = []

  for (const fx of fixtures.values()) {
    const canonicalId = fx.canonical.id
    const actual = predicciones[canonicalId]
    if (prediccionCompleta(actual)) continue

    const pr = prediccionParaFixture(fx, Object.values(predicciones), partidoById)
    if (!prediccionCompleta(pr) || pr.partido_id === canonicalId) continue

    fixes.push({
      partido_id: canonicalId,
      goles_local: pr.goles_local,
      goles_visitante: pr.goles_visitante,
      penales: pr.penales ?? false,
    })
  }

  return fixes
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
