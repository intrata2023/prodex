import {
  fetchPromiedosBracketPartidos,
  isSlotPlaceholder,
  mergeEquipoDesdePromiedos,
} from '../../src/lib/promiedosBracket.js'

function normalizeExternalId(id) {
  if (id == null || id === '') return null
  const n = Number(id)
  return Number.isFinite(n) ? n : null
}

export async function syncEquiposFromPromiedos(supabase, adminPin) {
  const { data: maxGrupos } = await supabase
    .from('partidos')
    .select('orden')
    .eq('fase', 'grupos')
    .order('orden', { ascending: false })
    .limit(1)
    .maybeSingle()

  const baseGruposOrden = maxGrupos?.orden ?? 72
  const promiedosRows = await fetchPromiedosBracketPartidos(baseGruposOrden)
  if (!promiedosRows.length) {
    throw new Error('Promiedos no devolvió cruces de eliminatorias')
  }

  const { data: existentes, error: loadErr } = await supabase
    .from('partidos')
    .select('id, external_id, fase, ronda, orden, equipo_local, equipo_visitante')
    .neq('fase', 'grupos')

  if (loadErr) throw loadErr

  const byExternalId = new Map(
    (existentes || [])
      .map((p) => {
        const externalId = normalizeExternalId(p.external_id)
        return externalId != null ? [externalId, { ...p, external_id: externalId }] : null
      })
      .filter(Boolean)
  )

  let updated = 0
  let inserted = 0
  let localFilled = 0
  let visitanteFilled = 0
  let sinPartido = 0
  let sinCambios = 0

  let nextOrden =
    Math.max(
      baseGruposOrden,
      ...(existentes || []).map((p) => p.orden ?? 0),
      0
    ) + 1

  for (const row of promiedosRows) {
    const externalId = normalizeExternalId(row.external_id)
    let existente = externalId != null ? byExternalId.get(externalId) : null

    if (!existente && externalId != null) {
      const payload = {
        fase: row.fase,
        ronda: row.ronda,
        grupo: null,
        equipo_local: row.equipo_local,
        equipo_visitante: row.equipo_visitante,
        external_id: externalId,
        fecha: row.fecha,
        orden: row.orden ?? nextOrden++,
      }
      const { data: newId, error: insErr } = await supabase.rpc('admin_insert_partido', {
        p_admin_pin: adminPin,
        p_payload: payload,
      })
      if (insErr) throw insErr
      inserted++
      existente = { id: newId, external_id: externalId, ...payload }
      byExternalId.set(externalId, existente)
      if (!isSlotPlaceholder(row.equipo_local)) localFilled++
      if (!isSlotPlaceholder(row.equipo_visitante)) visitanteFilled++
      continue
    }

    if (!existente) {
      sinPartido++
      continue
    }

    const equipo_local = mergeEquipoDesdePromiedos(row.equipo_local, existente.equipo_local)
    const equipo_visitante = mergeEquipoDesdePromiedos(
      row.equipo_visitante,
      existente.equipo_visitante
    )

    const localAntesPlaceholder = isSlotPlaceholder(existente.equipo_local)
    const visitAntesPlaceholder = isSlotPlaceholder(existente.equipo_visitante)
    const localAhoraReal = localAntesPlaceholder && !isSlotPlaceholder(equipo_local)
    const visitAhoraReal = visitAntesPlaceholder && !isSlotPlaceholder(equipo_visitante)

    if (
      equipo_local === existente.equipo_local &&
      equipo_visitante === existente.equipo_visitante
    ) {
      sinCambios++
      continue
    }

    const payload = {
      fase: existente.fase,
      ronda: row.ronda || existente.ronda,
      grupo: null,
      equipo_local,
      equipo_visitante,
      external_id: externalId,
      ...(row.orden != null ? { orden: row.orden } : {}),
    }

    const { error } = await supabase.rpc('admin_update_partido', {
      p_admin_pin: adminPin,
      p_partido_id: existente.id,
      p_payload: payload,
    })
    if (error) throw error

    updated++
    if (localAhoraReal) localFilled++
    if (visitAhoraReal) visitanteFilled++
  }

  return {
    fuente: 'promiedos',
    total: promiedosRows.length,
    updated,
    inserted,
    localFilled,
    visitanteFilled,
    sinPartido,
    sinCambios,
  }
}
