import { createClient } from '@supabase/supabase-js'
import {
  enrichPartidoBracketMeta,
} from '../../src/lib/fifaBracket2026.js'

const FOOTBALL_DATA_WC_URL =
  'https://api.football-data.org/v4/competitions/WC/matches?season=2026'

const KNOCKOUT_STAGES = new Set([
  'LAST_32',
  'LAST_16',
  'QUARTER_FINALS',
  'SEMI_FINALS',
  'FINAL',
])

const FASE_BY_STAGE = {
  LAST_32: 'r32',
  LAST_16: 'r16',
  QUARTER_FINALS: 'qf',
  SEMI_FINALS: 'sf',
  FINAL: 'final',
}

const RONDA_BY_STAGE = {
  LAST_32: '16avos de final',
  LAST_16: 'Octavos de final',
  QUARTER_FINALS: 'Cuartos de final',
  SEMI_FINALS: 'Semifinales',
  FINAL: 'Final',
}

function isPlaceholderEquipo(name) {
  if (!name || !String(name).trim()) return true
  const raw = String(name).trim()
  const n = raw.toLowerCase()
  if (n === 'tbd' || n === 'por definir') return true
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

function mergeEquipoNombre(apiName, existingName) {
  if (!isPlaceholderEquipo(apiName)) return apiName
  if (!isPlaceholderEquipo(existingName)) return existingName
  return apiName
}

function normalizeExternalId(id) {
  if (id == null || id === '') return null
  const n = Number(id)
  return Number.isFinite(n) ? n : null
}

function mapKnockoutPartidos(matches) {
  const knockout = (matches || []).filter((m) => KNOCKOUT_STAGES.has(m.stage))
  const sorted = [...knockout].sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate))
  const stageIndex = {}
  const rows = []

  for (const m of sorted) {
    const fase = FASE_BY_STAGE[m.stage]
    if (!fase) continue

    let local = m.homeTeam?.name
    let visitante = m.awayTeam?.name

    if (!local || !visitante) {
      stageIndex[m.stage] = (stageIndex[m.stage] || 0) + 1
      const n = stageIndex[m.stage]
      const ronda = RONDA_BY_STAGE[m.stage]
      local = local || `${ronda} · Local ${n}`
      visitante = visitante || `${ronda} · Visitante ${n}`
    }

    rows.push({
      fase,
      ronda: RONDA_BY_STAGE[m.stage],
      equipo_local: local,
      equipo_visitante: visitante,
      external_id: m.id,
      fecha: m.utcDate || null,
    })
  }

  return rows
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

export async function fetchFootballDataMatches(token) {
  const res = await fetch(FOOTBALL_DATA_WC_URL, {
    headers: { 'X-Auth-Token': token },
  })
  const text = await res.text()
  let data
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('football-data.org devolvió una respuesta inválida')
  }
  if (!res.ok) {
    throw new Error(data.message || `football-data.org respondió ${res.status}`)
  }
  if (!data.matches?.length) {
    throw new Error('football-data.org no devolvió partidos')
  }
  return data.matches
}

export async function verifyAdminPin(supabase, pin) {
  const { data, error } = await supabase.rpc('login_admin', { p_pin: pin })
  if (error) throw error
  if (!data) throw new Error('PIN admin inválido')
}

export async function syncEliminatoriasCuadros(supabase, adminPin, matches) {
  const { data: maxGrupos } = await supabase
    .from('partidos')
    .select('orden')
    .eq('fase', 'grupos')
    .order('orden', { ascending: false })
    .limit(1)
    .maybeSingle()

  const baseGruposOrden = maxGrupos?.orden ?? 72
  const partidos = mapKnockoutPartidos(matches).map((p) =>
    enrichPartidoBracketMeta(p, baseGruposOrden)
  )
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

  for (const row of partidos) {
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

    const payload = {
      fase: row.fase,
      ronda: row.ronda,
      grupo: null,
      equipo_local,
      equipo_visitante,
      external_id: externalId,
      fecha: row.fecha,
      ...(row.orden != null ? { orden: row.orden } : {}),
    }

    guardados.push({ equipo_local, equipo_visitante })

    if (existente) {
      const { error } = await supabase.rpc('admin_update_partido', {
        p_admin_pin: adminPin,
        p_partido_id: existente.id,
        p_payload: payload,
      })
      if (error) throw error
      updated++
      continue
    }

    const { error } = await supabase.rpc('admin_insert_partido', {
      p_admin_pin: adminPin,
      p_payload: { ...payload, orden: row.orden ?? nextOrden++ },
    })
    if (error) throw error
    inserted++
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

export function createSupabaseFromEnv(env = process.env) {
  const url = env.VITE_SUPABASE_URL || env.SUPABASE_URL
  const key =
    env.SUPABASE_SERVICE_ROLE_KEY ||
    env.VITE_SUPABASE_ANON_KEY ||
    env.SUPABASE_ANON_KEY
  if (!url || !key) {
    throw new Error('Faltan VITE_SUPABASE_URL y clave de Supabase en el servidor')
  }
  return createClient(url, key)
}

export function footballTokenFromEnv(env = process.env) {
  return env.FOOTBALL_DATA_TOKEN || env.VITE_FOOTBALL_DATA_TOKEN
}
