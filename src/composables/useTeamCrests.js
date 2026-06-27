import { ref } from 'vue'
import { fetchWorldCupMatches } from '../lib/syncResults.js'
import { isPlaceholderEquipo } from '../lib/eliminatorias.js'
import {
  normTeamCrestKey,
  apiTeamNameForCrest,
  TEAM_CREST_ALIASES,
} from '../lib/teamCrestAliases.js'

const crestByExternalId = ref(null)
const crestByTeam = ref(null)
const crestsLoaded = ref(false)
let loadPromise = null

function registerCrest(byTeam, name, crest) {
  if (!name || !crest) return
  byTeam.set(normTeamCrestKey(name), crest)
}

function buildMaps(matches) {
  const byId = new Map()
  const byTeam = new Map()

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
    if (crestByExternalId.value) return
    if (!loadPromise) {
      loadPromise = (async () => {
        try {
          const matches = await fetchWorldCupMatches()
          const { byId, byTeam } = buildMaps(matches)
          crestByExternalId.value = byId
          crestByTeam.value = byTeam
        } catch {
          crestByExternalId.value = new Map()
          crestByTeam.value = new Map()
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
      return crestByTeam.value?.get(normTeamCrestKey(apiName)) || null
    }
    return null
  }

  function crestForTeam(nombre, partido = null) {
    if (partido) {
      if (partido.equipo_local === nombre && partido.escudo_local) return partido.escudo_local
      if (partido.equipo_visitante === nombre && partido.escudo_visitante) {
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
