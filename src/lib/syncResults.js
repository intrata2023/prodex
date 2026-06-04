const API_BASE = 'https://api.football-data.org/v4'

export async function fetchWorldCupMatches(token) {
  const res = await fetch(`${API_BASE}/competitions/WC/matches?season=2026`, {
    headers: { 'X-Auth-Token': token },
  })
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

  return {
    external_id: match.id,
    goles_local: score.home,
    goles_visitante: score.away,
    definido_penales: Boolean(penales),
    ganador_penales:
      penales && match.score.penalties.home > match.score.penalties.away
        ? match.homeTeam?.name
        : match.awayTeam?.name,
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
