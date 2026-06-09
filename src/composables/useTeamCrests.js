import { ref } from 'vue'
import { fetchWorldCupMatches } from '../lib/syncResults.js'

const crestByExternalId = ref(null)
const crestByTeam = ref(null)
const crestsLoaded = ref(false)
let loadPromise = null

function norm(name) {
  return (name || '').toLowerCase().trim()
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
    if (m.homeTeam?.name && m.homeTeam?.crest) {
      byTeam.set(norm(m.homeTeam.name), m.homeTeam.crest)
    }
    if (m.awayTeam?.name && m.awayTeam?.crest) {
      byTeam.set(norm(m.awayTeam.name), m.awayTeam.crest)
    }
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

  function crestsForPartido(partido) {
    if (partido.external_id && crestByExternalId.value?.has(partido.external_id)) {
      return crestByExternalId.value.get(partido.external_id)
    }
    return {
      local: crestForTeam(partido.equipo_local, partido),
      visitante: crestForTeam(partido.equipo_visitante, partido),
    }
  }

  function crestForTeam(nombre, partido = null) {
    if (partido) {
      if (partido.equipo_local === nombre && partido.escudo_local) return partido.escudo_local
      if (partido.equipo_visitante === nombre && partido.escudo_visitante) {
        return partido.escudo_visitante
      }
    }
    return crestByTeam.value?.get(norm(nombre)) || null
  }

  return { load, crestsForPartido, crestForTeam, crestsLoaded }
}
