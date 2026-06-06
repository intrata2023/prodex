const FASE_BY_STAGE = {
  GROUP_STAGE: 'grupos',
  LAST_32: 'r32',
  LAST_16: 'r16',
  QUARTER_FINALS: 'qf',
  SEMI_FINALS: 'sf',
  FINAL: 'final',
  THIRD_PLACE: 'sf',
}

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

function stripEscudos(partido) {
  const { escudo_local, escudo_visitante, ...rest } = partido
  return rest
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

export async function fetchWorldCupMatches() {
  const res = await fetch('/api/wc-matches')
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`API error ${res.status}: ${text}`)
  }
  const data = await res.json()
  return data.matches || []
}

export function mapApiMatchToResult(match) {
  if (match.status !== 'FINISHED') return null
  const score = match.score?.fullTime || match.score?.regularTime
  if (!score || score.home == null || score.away == null) return null

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
    goles_local: score.home,
    goles_visitante: score.away,
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
