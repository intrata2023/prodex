import {
  prediccionCompleta,
  prediccionCompletaCruce,
  faltaGanadorPenalesPrediccion,
  indexPartidosGrupos,
} from './participantProgress.js'
import { aciertoPrediccion } from './scoring.js'
import { cruceEliminatoriaCompleto, partidoEdicionCerrada } from './eliminatorias.js'

const SIN_FECHA = 'sin-fecha'

export const TZ_ARGENTINA = 'America/Argentina/Buenos_Aires'

export function fechaClave(partido) {
  if (!partido?.fecha) return SIN_FECHA
  const d = new Date(partido.fecha)
  if (Number.isNaN(d.getTime())) return SIN_FECHA
  return d.toLocaleDateString('en-CA', { timeZone: TZ_ARGENTINA })
}

export function formatHoraArgentina(fechaIso) {
  if (!fechaIso) return null
  const d = new Date(fechaIso)
  if (Number.isNaN(d.getTime())) return null
  return new Intl.DateTimeFormat('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: TZ_ARGENTINA,
  }).format(d)
}

export function formatFechaDiaTitulo(clave, partidoEjemplo) {
  if (clave === SIN_FECHA) return 'Fecha a confirmar'
  const d = partidoEjemplo?.fecha ? new Date(partidoEjemplo.fecha) : new Date(`${clave}T12:00:00`)
  return new Intl.DateTimeFormat('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: TZ_ARGENTINA,
  }).format(d)
}

export function hoyClaveArgentina() {
  return new Date().toLocaleDateString('en-CA', { timeZone: TZ_ARGENTINA })
}

export function claveArgentinaOffset(dias) {
  return new Date(Date.now() + dias * 86400000).toLocaleDateString('en-CA', {
    timeZone: TZ_ARGENTINA,
  })
}

export function ayerClaveArgentina() {
  return claveArgentinaOffset(-1)
}

export function mananaClaveArgentina() {
  return claveArgentinaOffset(1)
}

export function labelDiaRelativo(offset) {
  if (offset === -1) return 'Ayer'
  if (offset === 0) return 'Hoy'
  if (offset === 1) return 'Mañana'
  return null
}

export function partidosDelDia(partidos, claveDia) {
  return partidos
    .filter((p) => fechaClave(p) === claveDia)
    .sort((a, b) => {
      if (a.fecha && b.fecha) return new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
      return (a.orden ?? 0) - (b.orden ?? 0)
    })
}

/** Partido que el usuario aún puede cargar (fase abierta y carga no cerrada). */
export function partidoPredecibleUsuario(
  partido,
  { gruposAbiertos = true, eliminatoriasAbiertos = true, ahora = Date.now() } = {}
) {
  if (!partido) return false
  if (partido.fase === 'grupos') return Boolean(gruposAbiertos)
  if (!eliminatoriasAbiertos) return false
  if (!cruceEliminatoriaCompleto(partido)) return false
  if (partidoEdicionCerrada(partido, ahora)) return false
  return true
}

/** Estado de carga del día: partidos abiertos vs predicciones completas. */
export function resumenCargaDia(partidosDelDiaLista, predicciones, opts = {}) {
  const agenda = (partidosDelDiaLista || []).filter((p) => partidoPredecibleUsuario(p, opts))
  const partidosPendientes = agenda.filter(
    (p) => !prediccionCompletaCruce(predicciones[p.id], p)
  )
  const partidosCargados = agenda.filter((p) =>
    prediccionCompletaCruce(predicciones[p.id], p)
  )
  return {
    total: agenda.length,
    pendientes: partidosPendientes.length,
    cargados: partidosCargados.length,
    partidosPendientes,
    partidosCargados,
  }
}

export function etiquetaPartidoPendiente(partido, predicciones) {
  const base = `${partido.equipo_local} vs ${partido.equipo_visitante}`
  if (faltaGanadorPenalesPrediccion(predicciones?.[partido.id], partido)) {
    return `${base} (falta ganador por penales)`
  }
  return base
}

export function partidoTieneResultado(resultado) {
  return resultado?.goles_local != null && resultado?.goles_visitante != null
}

/** Horario de inicio ya pasó (hora Argentina vía UTC del ISO). */
export function partidoYaEmpezo(partido) {
  if (!partido?.fecha) return false
  const d = new Date(partido.fecha)
  return !Number.isNaN(d.getTime()) && d.getTime() <= Date.now()
}

/** Resultado cargado o el partido ya arrancó. */
export function partidoYaSucedio(partido, resultado) {
  if (partidoTieneResultado(resultado)) return true
  return partidoYaEmpezo(partido)
}

export function partidosConPrediccion(partidos, predicciones) {
  return partidos.filter((p) => prediccionCompleta(predicciones[p.id]))
}

/** Partidos únicos para listar predicciones (grupos sin duplicados en DB). */
export function partidosListadoPredicciones(partidos) {
  const grupos = (partidos || []).filter((p) => p.fase === 'grupos')
  const otros = (partidos || []).filter((p) => p.fase !== 'grupos')
  const { fixtures } = indexPartidosGrupos(grupos)
  const listaGrupos = [...fixtures.values()].map((fx) => fx.canonical)
  const unidos = [...listaGrupos, ...otros]

  return unidos.sort((a, b) => {
    if (a.fecha && b.fecha) return new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
    return (a.orden ?? 0) - (b.orden ?? 0)
  })
}

export function resumenPuntosDia(partidosDelDia, predicciones, resultados) {
  let pts = 0
  let exacto = 0
  let parcial = 0
  let conResultado = 0

  for (const p of partidosDelDia) {
    const pred = predicciones[p.id]
    const real = resultados[p.id]
    if (!partidoTieneResultado(real)) continue
    const acierto = aciertoPrediccion(pred, real, p)
    if (!acierto) continue
    conResultado++
    pts += acierto.pts
    if (acierto.tipo === 'exacto') exacto++
    else if (acierto.tipo === 'ganador') parcial++
  }

  return { pts, exacto, parcial, conResultado, total: partidosDelDia.length }
}

/** Resumen global de aciertos (exactos, parciales, errados, pendientes). */
export function resumenPredicciones(partidos, predicciones, resultados) {
  let exacto = 0
  let parcial = 0
  let fallo = 0
  let pendiente = 0
  let pts = 0

  for (const p of partidos) {
    const pred = predicciones[p.id]
    const real = resultados[p.id]
    const acierto = aciertoPrediccion(pred, real, p)
    if (!acierto) {
      pendiente++
      continue
    }
    pts += acierto.pts
    if (acierto.tipo === 'exacto') exacto++
    else if (acierto.tipo === 'ganador') parcial++
    else fallo++
  }

  return { exacto, parcial, fallo, pendiente, total: partidos.length, pts }
}

export function agruparPorFecha(partidos) {
  const map = new Map()

  for (const partido of partidos) {
    const clave = fechaClave(partido)
    if (!map.has(clave)) map.set(clave, [])
    map.get(clave).push(partido)
  }

  for (const lista of map.values()) {
    lista.sort((a, b) => {
      if (a.fecha && b.fecha) return new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
      return (a.orden ?? 0) - (b.orden ?? 0)
    })
  }

  const bloques = [...map.entries()].map(([clave, lista]) => ({
    clave,
    label: formatFechaDiaTitulo(clave, lista[0]),
    partidos: lista,
  }))

  bloques.sort((a, b) => {
    if (a.clave === SIN_FECHA) return 1
    if (b.clave === SIN_FECHA) return -1
    return a.clave.localeCompare(b.clave)
  })

  return bloques
}

/** Texto de predicción con penales en eliminatorias. */
export function formatoPrediccionDisplay(pred, partido) {
  if (!pred || pred.goles_local == null || pred.goles_visitante == null) return null
  const score = `${pred.goles_local}–${pred.goles_visitante}`
  if (partido?.fase === 'grupos') return { score, penales: null }
  return {
    score,
    penales: pred.penales && pred.ganador_penales ? pred.ganador_penales : null,
  }
}

/** Resultado real con penales si aplica. */
export function formatoResultadoDisplay(resultado, partido) {
  if (!resultado || resultado.goles_local == null || resultado.goles_visitante == null) return null
  const score = `${resultado.goles_local}–${resultado.goles_visitante}`
  if (partido?.fase === 'grupos') return { score, penales: null }
  return {
    score,
    penales:
      resultado.definido_penales && resultado.ganador_penales
        ? resultado.ganador_penales
        : null,
  }
}

/** IDs de partidos duplicados del mismo cruce (fase grupos). */
export function idsPartidoRelacionados(partidos, partidoId) {
  const target = (partidos || []).find((p) => p.id === partidoId)
  if (!target) return []
  if (target.fase !== 'grupos') return [partidoId]

  const { fixtures } = indexPartidosGrupos(partidos.filter((p) => p.fase === 'grupos'))
  for (const fx of fixtures.values()) {
    const ids = fx.partidos.map((p) => p.id)
    if (ids.includes(partidoId) || fx.canonical.id === partidoId) return ids
  }
  return [partidoId]
}

/** Predicción completa de un participante para un cruce (incluye alias de grupos). */
export function prediccionEnPartido(listaPreds, idsRelacionados) {
  for (const id of idsRelacionados) {
    const p = (listaPreds || []).find((x) => x.partido_id === id)
    if (prediccionCompleta(p)) return p
  }
  return null
}
