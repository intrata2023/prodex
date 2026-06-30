import { ref } from 'vue'
import { fetchWorldCupMatches } from '../lib/syncResults.js'
import { isPlaceholderEquipo } from '../lib/eliminatorias.js'
import {
  normTeamCrestKey,
  apiTeamNameForCrest,
  equiposEquivalentes,
  TEAM_CREST_ALIASES,
  TEAM_STATIC_CRESTS,
  staticCrestForTeam,
} from '../lib/teamCrestAliases.js'

const crestByExternalId = ref(null)
const crestByTeam = ref(null)
const crestsLoaded = ref(false)
let loadPromise = null

function registerCrest(byTeam, name, crest) {
  if (!name || !crest) return
  byTeam.set(normTeamCrestKey(name), crest)
}

function seedStaticCrests(byTeam) {
  for (const [apiKey, url] of Object.entries(TEAM_STATIC_CRESTS)) {
    registerCrest(byTeam, apiKey, url)
  }
  for (const [alias, apiName] of Object.entries(TEAM_CREST_ALIASES)) {
    const url = TEAM_STATIC_CRESTS[normTeamCrestKey(apiName)]
    if (url) registerCrest(byTeam, alias, url)
  }
}

function buildMaps(matches) {
  const byId = new Map()
  const byTeam = new Map()

  seedStaticCrests(byTeam)

  for (const m of matches) {
    if (m.id) {
      byId.set(m.id, {
        local: m.homeTeam?.crest || null,
        visitante: m.awayTeam?.crest || null,
      })
    }
    registerCrest(byTeam, m.homeTeam?.name, m.homeTeam?.crest)
    registerCrest(byTeam, m.homeTeam?.shortName, m.homeTeam?.crest)
    registerCrest(byTeam, m.awayTeam?.name, m.awayTeam?.crest)
    registerCrest(byTeam, m.awayTeam?.shortName, m.awayTeam?.crest)
  }

  for (const [alias, apiName] of Object.entries(TEAM_CREST_ALIASES)) {
    const crest = byTeam.get(normTeamCrestKey(apiName))
    if (crest) registerCrest(byTeam, alias, crest)
  }

  return { byId, byTeam }
}

export function useTeamCrests() {
  async function load() {
    if (crestsLoaded.value) return
    if (!loadPromise) {
      loadPromise = (async () => {
        try {
          const matches = await fetchWorldCupMatches()
          const { byId, byTeam } = buildMaps(matches)
          crestByExternalId.value = byId
          crestByTeam.value = byTeam
        } catch {
          crestByExternalId.value = new Map()
          const fallback = new Map()
          seedStaticCrests(fallback)
          crestByTeam.value = fallback
        }
        crestsLoaded.value = true
        loadPromise = null
      })()
    }
    await loadPromise
  }

  function lookupTeamCrest(nombre) {
    if (!nombre || isPlaceholderEquipo(nombre)) return null

    const direct = crestByTeam.value?.get(normTeamCrestKey(nombre))
    if (direct) return direct

    const apiName = apiTeamNameForCrest(nombre)
    if (apiName !== nombre) {
      const fromAlias = crestByTeam.value?.get(normTeamCrestKey(apiName))
      if (fromAlias) return fromAlias
    }
    return staticCrestForTeam(nombre)
  }

  function crestForTeam(nombre, partido = null) {
    if (partido) {
      if (equiposEquivalentes(nombre, partido.equipo_local) && partido.escudo_local) {
        return partido.escudo_local
      }
      if (equiposEquivalentes(nombre, partido.equipo_visitante) && partido.escudo_visitante) {
        return partido.escudo_visitante
      }
    }
    return lookupTeamCrest(nombre)
  }

  function crestsForPartido(partido) {
    let local = crestForTeam(partido.equipo_local, partido)
    let visitante = crestForTeam(partido.equipo_visitante, partido)

    if (partido.external_id && crestByExternalId.value?.has(partido.external_id)) {
      const fromApi = crestByExternalId.value.get(partido.external_id)
      if (!local && fromApi.local && !isPlaceholderEquipo(partido.equipo_local)) {
        local = fromApi.local
      }
      if (!visitante && fromApi.visitante && !isPlaceholderEquipo(partido.equipo_visitante)) {
        visitante = fromApi.visitante
      }
    }

    return { local, visitante }
  }

  return { load, crestsForPartido, crestForTeam, crestsLoaded }
}
