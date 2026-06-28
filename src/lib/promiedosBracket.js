/**
 * Cuadro eliminatorio desde Promiedos (HTML __NEXT_DATA__).
 * Orden de cruces alineado con fifaBracket2026 / Promiedos.
 */

import {
  BRACKET_POSITION_BY_FIFA,
  EXTERNAL_TO_FIFA_MATCH,
  enrichPartidoBracketMeta,
} from './fifaBracket2026.js'

export const PROMIEDOS_WC_URL =
  'https://www.promiedos.com.ar/league/fifa-world-cup/fjda'

const STAGE_TO_FASE = {
  '16avos de final': 'r32',
  'Octavos de Final': 'r16',
  'Cuartos de Final': 'qf',
  Semifinales: 'sf',
  Final: 'final',
}

/** Promiedos → nombre canónico en PRODEX */
export const PROMIEDOS_TO_PRODEX = {
  'Bosnia Herzegovina': 'Bosnia-Herzegovina',
}

const FIFA_NO_BY_FASE_POS = {}
for (const [fase, map] of Object.entries(BRACKET_POSITION_BY_FIFA)) {
  for (const [fifa, pos] of Object.entries(map)) {
    FIFA_NO_BY_FASE_POS[`${fase}:${pos}`] = Number(fifa)
  }
}

const EXTERNAL_BY_FIFA = Object.fromEntries(
  Object.entries(EXTERNAL_TO_FIFA_MATCH).map(([ext, fifa]) => [Number(fifa), Number(ext)])
)

export function isSlotPlaceholder(name) {
  if (!name || !String(name).trim()) return true
  const raw = String(name).trim()
  const n = raw.toLowerCase()
  if (n === 'tbd' || n === 'por definir') return true
  if (/^ganador del partido \d+/i.test(raw)) return true
  if (/^perdedor del partido \d+/i.test(raw)) return true
  if (/^[12][a-l]$/i.test(raw)) return true
  if (/^3[a-l0-9/°]+$/i.test(raw.replace(/°/g, ''))) return true
  if (/^1[a-l]$/i.test(raw)) return true
  return (
    n.includes('por definir') ||
    n.includes('· local') ||
    n.includes('· visitante') ||
    /·\s*(local|visitante)\s*\d/i.test(raw) ||
    /16avos.*local|16avos.*visitante/.test(n) ||
    /octavos.*local|octavos.*visitante/.test(n) ||
    /cuartos.*local|cuartos.*visitante/.test(n) ||
    /semi.*local|semi.*visitante/.test(n) ||
    /final.*local|final.*visitante/.test(n) ||
    /^(local|visitante)\s+\d+$/i.test(raw)
  )
}

export function normalizePromiedosTeam(name) {
  const trimmed = String(name ?? '').trim()
  if (!trimmed) return trimmed
  if (isSlotPlaceholder(trimmed)) return trimmed
  return PROMIEDOS_TO_PRODEX[trimmed] || trimmed
}

function externalIdForBracketSlot(fase, bracketPos) {
  const fifaNo = FIFA_NO_BY_FASE_POS[`${fase}:${bracketPos}`]
  if (fifaNo == null) return null
  return EXTERNAL_BY_FIFA[fifaNo] ?? null
}

export function parsePromiedosNextData(html) {
  const marker = 'type="application/json">'
  const start = html.indexOf(marker)
  if (start < 0) throw new Error('Promiedos: no se encontró __NEXT_DATA__')
  const jsonStart = start + marker.length
  const jsonEnd = html.indexOf('</script>', jsonStart)
  if (jsonEnd < 0) throw new Error('Promiedos: JSON inválido')
  const data = JSON.parse(html.slice(jsonStart, jsonEnd))
  const brackets = data?.props?.pageProps?.data?.brackets
  if (!brackets?.stages?.length) {
    throw new Error('Promiedos: no hay datos de cuadro eliminatorio')
  }
  return brackets
}

export function mapPromiedosBracket(brackets, baseGruposOrden = 72) {
  const rows = []

  for (const stage of brackets.stages || []) {
    const fase = STAGE_TO_FASE[stage.name]
    if (!fase) continue

    const groups = stage.groups || []
    groups.forEach((group, index) => {
      // Final incluye 3er puesto como 2º cruce; PRODEX solo guarda la final (M104).
      if (fase === 'final' && index > 0) return

      const participants = group.participants || []
      const localRaw = participants[0]?.name || participants[0]?.short_name || ''
      const visitanteRaw = participants[1]?.name || participants[1]?.short_name || ''
      const bracketPos = index + 1
      const external_id = externalIdForBracketSlot(fase, bracketPos)
      if (external_id == null) return

      const row = {
        fase,
        external_id,
        equipo_local: normalizePromiedosTeam(localRaw),
        equipo_visitante: normalizePromiedosTeam(visitanteRaw),
        fecha: group.games?.[0]?.start_time || null,
      }
      rows.push(enrichPartidoBracketMeta(row, baseGruposOrden))
    })
  }

  return rows
}

export async function fetchPromiedosBracketPartidos(baseGruposOrden = 72) {
  const res = await fetch(PROMIEDOS_WC_URL, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; ProdexBracketSync/1.0)',
      Accept: 'text/html',
    },
  })
  if (!res.ok) {
    throw new Error(`Promiedos respondió ${res.status}`)
  }
  const html = await res.text()
  const brackets = parsePromiedosNextData(html)
  return mapPromiedosBracket(brackets, baseGruposOrden)
}

export function mergeEquipoDesdePromiedos(promiedosName, existingName) {
  const fromPromiedos = normalizePromiedosTeam(promiedosName)
  if (!isSlotPlaceholder(fromPromiedos)) return fromPromiedos
  if (!isSlotPlaceholder(existingName)) return existingName
  return fromPromiedos || existingName
}
