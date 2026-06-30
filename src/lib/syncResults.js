import { isPlaceholderEquipo } from './eliminatorias.js'
import { enrichPartidoBracketMeta } from './fifaBracket2026.js'

const FASE_BY_STAGE = {
  GROUP_STAGE: 'grupos',
  LAST_32: 'r32',
  LAST_16: 'r16',
  QUARTER_FINALS: 'qf',
  SEMI_FINALS: 'sf',
  FINAL: 'final',
  THIRD_PLACE: 'sf',
}

export const KNOCKOUT_API_STAGES = new Set([
  'LAST_32',
  'LAST_16',
  'QUARTER_FINALS',
  'SEMI_FINALS',
  'FINAL',
])

const RONDA_BY_STAGE = {
  GROUP_STAGE: 'Fase de grupos',
  LAST_32: '16avos de final',
  LAST_16: 'Octavos de final',
  QUARTER_FINALS: 'Cuartos de final',
  SEMI_FINALS: 'Semifinales',
  FINAL: 'Final',
  THIRD_PLACE: 'Tercer puesto',
}

export function parseGrupo(group) {
  if (!group) return null
  const m = group.match(/GROUP_([A-L])/i)
  return m ? m[1].toUpperCase() : null
}

export function mapApiMatchToPartido(match, orden, slot = {}) {
  const fase = FASE_BY_STAGE[match.stage]
  if (!fase) return null

  const local = slot.local ?? match.homeTeam?.name
  const visitante = slot.visitante ?? match.awayTeam?.name
  if (!local || !visitante) return null

  return {
    fase,
    grupo: fase === 'grupos' ? parseGrupo(match.group) : null,
    ronda: RONDA_BY_STAGE[match.stage] || match.stage,
    equipo_local: local,
    equipo_visitante: visitante,
    escudo_local: slot.escudo_local ?? match.homeTeam?.crest ?? null,
    escudo_visitante: slot.escudo_visitante ?? match.awayTeam?.crest ?? null,
    external_id: match.id,
    fecha: match.utcDate || null,
    orden,
  }
}

export function mapApiMatchesToPartidos(matches) {
  const sorted = [...matches].sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate))
  const stageIndex = {}
  const rows = []

  for (const m of sorted) {
    const fase = FASE_BY_STAGE[m.stage]
    if (!fase) continue

    let local = m.homeTeam?.name
    let visitante = m.awayTeam?.name

    if (fase !== 'grupos' && (!local || !visitante)) {
      stageIndex[m.stage] = (stageIndex[m.stage] || 0) + 1
      const n = stageIndex[m.stage]
      const ronda = RONDA_BY_STAGE[m.stage]
      local = local || `${ronda} · Local ${n}`
      visitante = visitante || `${ronda} · Visitante ${n}`
    }

    const row = mapApiMatchToPartido(m, rows.length + 1, { local, visitante })
    if (row) rows.push(row)
  }

  return rows
}

/** Solo eliminatorias (16avos → final), sin fase de grupos ni tercer puesto. */
export function mapApiMatchesToEliminatorias(matches, baseGruposOrden = 72) {
  const knockout = (matches || []).filter((m) => KNOCKOUT_API_STAGES.has(m.stage))
  return mapApiMatchesToPartidos(knockout).map((p) =>
    enrichPartidoBracketMeta(p, baseGruposOrden)
  )
}

function stripEscudos(partido) {
  const { escudo_local, escudo_visitante, ...rest } = partido
  return rest
}

/** No pisar un equipo real ya guardado si la API devuelve placeholder (respuesta en caché). */
export function mergeEquipoNombre(apiName, existingName) {
  if (!isPlaceholderEquipo(apiName)) return apiName
  if (!isPlaceholderEquipo(existingName)) return existingName
  return apiName
}

function normalizeExternalId(id) {
  if (id == null || id === '') return null
  const n = Number(id)
  return Number.isFinite(n) ? n : null
}

function countEquiposConfirmados(partidos) {
  let completos = 0
  let parciales = 0
  for (const p of partidos) {
    const local = !isPlaceholderEquipo(p.equipo_local)
    const visitante = !isPlaceholderEquipo(p.equipo_visitante)
    if (local && visitante) completos++
    else if (local || visitante) parciales++
  }
  return { completos, parciales }
}

export async function importWorldCupFixture(supabase, adminPin) {
  const matches = await fetchWorldCupMatches()
  let partidos = mapApiMatchesToPartidos(matches)
  if (!partidos.length) throw new Error('La API no devolvió partidos')

  let { error } = await supabase.rpc('admin_replace_partidos', {
    p_admin_pin: adminPin,
    p_partidos: partidos,
  })
  if (error?.message?.includes('escudo')) {
    ;({ error } = await supabase.rpc('admin_replace_partidos', {
      p_admin_pin: adminPin,
      p_partidos: partidos.map(stripEscudos),
    }))
  }
  if (error) throw error

  return {
    total: partidos.length,
    grupos: partidos.filter((p) => p.fase === 'grupos').length,
    eliminatorias: partidos.filter((p) => p.fase !== 'grupos').length,
  }
}

/**
 * Sincroniza cuadros de eliminatorias desde partidos ya obtenidos de la API.
 * Usado por el cliente y por el cron de Vercel.
 */
export async function importWorldCupEliminatoriasFromMatches(supabase, adminPin, matches) {
  const { data: maxGrupos } = await supabase
    .from('partidos')
    .select('orden')
    .eq('fase', 'grupos')
    .order('orden', { ascending: false })
    .limit(1)
    .maybeSingle()

  const baseGruposOrden = maxGrupos?.orden ?? 72
  const partidos = mapApiMatchesToEliminatorias(matches, baseGruposOrden)
  if (!partidos.length) {
    throw new Error('La API no devolvió partidos de eliminatorias')
  }

  const { data: existentes } = await supabase
    .from('partidos')
    .select('id, external_id, orden, equipo_local, equipo_visitante')
    .neq('fase', 'grupos')

  const byExternalId = new Map(
    (existentes || [])
      .map((p) => {
        const externalId = normalizeExternalId(p.external_id)
        return externalId != null ? [externalId, { ...p, external_id: externalId }] : null
      })
      .filter(Boolean)
  )

  const baseOrden = maxGrupos?.orden ?? 0
  let nextOrden = Math.max(baseOrden, ...(existentes || []).map((p) => p.orden ?? 0), 0) + 1
  let updated = 0
  let inserted = 0
  let conservados = 0
  const guardados = []

  async function upsertRow(row) {
    const externalId = normalizeExternalId(row.external_id)
    const existente = externalId != null ? byExternalId.get(externalId) : null

    let equipo_local = row.equipo_local
    let equipo_visitante = row.equipo_visitante
    if (existente) {
      const mergedLocal = mergeEquipoNombre(row.equipo_local, existente.equipo_local)
      const mergedVisitante = mergeEquipoNombre(row.equipo_visitante, existente.equipo_visitante)
      if (mergedLocal !== row.equipo_local) conservados++
      if (mergedVisitante !== row.equipo_visitante) conservados++
      equipo_local = mergedLocal
      equipo_visitante = mergedVisitante
    }

    const payload = stripEscudos({
      fase: row.fase,
      ronda: row.ronda,
      grupo: null,
      equipo_local,
      equipo_visitante,
      external_id: externalId,
      fecha: row.fecha,
      ...(row.orden != null ? { orden: row.orden } : {}),
    })

    guardados.push({ equipo_local, equipo_visitante })
    if (existente) {
      const { error } = await supabase.rpc('admin_update_partido', {
        p_admin_pin: adminPin,
        p_partido_id: existente.id,
        p_payload: payload,
      })
      if (error) throw error
      updated++
      return
    }

    const { error } = await supabase.rpc('admin_insert_partido', {
      p_admin_pin: adminPin,
      p_payload: { ...payload, orden: row.orden ?? nextOrden++ },
    })
    if (error) throw error
    inserted++
  }

  for (const row of partidos) {
    await upsertRow(row)
  }

  const apiStats = countEquiposConfirmados(partidos)
  const guardadosStats = countEquiposConfirmados(guardados)

  return {
    total: partidos.length,
    updated,
    inserted,
    conEquipos: guardadosStats.completos,
    conParcial: guardadosStats.parciales,
    apiConEquipos: apiStats.completos,
    apiConParcial: apiStats.parciales,
    conservados,
  }
}

/** Sincroniza cuadros vía API del servidor (Vercel). Más fiable que 31 RPCs desde el browser. */
export async function syncCuadrosViaServer(adminPin) {
  const res = await fetch('/api/sync-cuadros', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ admin_pin: adminPin }),
  })

  const text = await res.text()
  let data = null
  try {
    data = JSON.parse(text)
  } catch {
    if (/^\s*</.test(text)) {
      throw new Error(
        '/api/sync-cuadros no está disponible en el servidor. Verificá el deploy en Vercel.'
      )
    }
    throw new Error(`Respuesta inválida del servidor (${res.status})`)
  }

  if (!res.ok || data?.error) {
    throw new Error(data?.error || `Error ${res.status} al sincronizar cuadros`)
  }

  return data
}

/** Sincroniza cuadros: primero servidor, fallback cliente si el endpoint no existe aún. */
export async function importWorldCupEliminatorias(supabase, adminPin) {
  try {
    return await syncCuadrosViaServer(adminPin)
  } catch (serverErr) {
    const msg = serverErr.message || ''
    if (
      msg.includes('PIN') ||
      msg.includes('admin_update_partido') ||
      msg.includes('FOOTBALL_DATA_TOKEN')
    ) {
      throw serverErr
    }
    const matches = await fetchWorldCupMatches()
    return importWorldCupEliminatoriasFromMatches(supabase, adminPin, matches)
  }
}

export async function fetchFootballDataMatches(token) {
  return fetchFootballDataDirect(token)
}

const FOOTBALL_DATA_WC_URL =
  'https://api.football-data.org/v4/competitions/WC/matches?season=2026'

function parseMatchesPayload(text) {
  if (!text?.trim()) return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

async function fetchFootballDataDirect(token) {
  const res = await fetch(FOOTBALL_DATA_WC_URL, {
    headers: { 'X-Auth-Token': token },
  })
  const text = await res.text()
  const data = parseMatchesPayload(text)
  if (!data) throw new Error('football-data.org devolvió una respuesta inválida')
  if (!res.ok) throw new Error(data.message || `football-data.org respondió ${res.status}`)
  if (!data.matches?.length) throw new Error('football-data.org no devolvió partidos')
  return data.matches
}

export async function fetchWorldCupMatches() {
  let res
  try {
    res = await fetch('/api/wc-matches')
  } catch {
    throw new Error(
      'No se pudo contactar /api/wc-matches. En local usá npm run dev; en producción verificá el deploy en Vercel.'
    )
  }

  const text = await res.text()
  const data = parseMatchesPayload(text)

  if (data?.error) {
    throw new Error(
      typeof data.error === 'string'
        ? data.error
        : 'Falta FOOTBALL_DATA_TOKEN en el servidor (Vercel → Settings → Environment Variables).'
    )
  }

  if (data?.matches?.length) return data.matches

  const looksLikeHtml = /^\s*</.test(text)
  if (looksLikeHtml) {
    const devToken = import.meta.env.VITE_FOOTBALL_DATA_TOKEN
    if (import.meta.env.DEV && devToken) {
      return fetchFootballDataDirect(devToken)
    }
    throw new Error(
      '/api/wc-matches no está disponible (el servidor devolvió HTML en lugar de JSON). ' +
        'En Vercel agregá FOOTBALL_DATA_TOKEN y redeployá. En local: npm run dev con FOOTBALL_DATA_TOKEN en .env.'
    )
  }

  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${text.slice(0, 200)}`)
  }

  throw new Error(
    'La API no devolvió partidos de eliminatorias. Revisá FOOTBALL_DATA_TOKEN en el servidor.'
  )
}

export function mapApiMatchToResult(match) {
  if (match.status !== 'FINISHED') return null

  const score120 =
    match.score?.extraTime?.home != null && match.score?.extraTime?.away != null
      ? match.score.extraTime
      : match.score?.fullTime || match.score?.regularTime
  if (!score120 || score120.home == null || score120.away == null) return null

  const penales =
    match.score?.penalties &&
    (match.score.penalties.home != null || match.score.penalties.away != null)

  let ganador_penales = null
  if (penales) {
    ganador_penales =
      match.score.penalties.home > match.score.penalties.away
        ? match.homeTeam?.name
        : match.awayTeam?.name
  }

  return {
    external_id: match.id,
    goles_local: score120.home,
    goles_visitante: score120.away,
    definido_penales: Boolean(penales),
    ganador_penales,
    equipo_local: match.homeTeam?.name,
    equipo_visitante: match.awayTeam?.name,
  }
}

export function matchPartidoLocal(partido, apiResult) {
  if (partido.external_id && apiResult.external_id) {
    return partido.external_id === apiResult.external_id
  }
  const norm = (s) => (s || '').toLowerCase().trim()
  return (
    norm(partido.equipo_local) === norm(apiResult.equipo_local) &&
    norm(partido.equipo_visitante) === norm(apiResult.equipo_visitante)
  )
}
