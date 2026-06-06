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
      local: partido.escudo_local || crestByTeam.value?.get(norm(partido.equipo_local)) || null,
      visitante:
        partido.escudo_visitante || crestByTeam.value?.get(norm(partido.equipo_visitante)) || null,
    }
  }

  return { load, crestsForPartido, crestsLoaded }
}
