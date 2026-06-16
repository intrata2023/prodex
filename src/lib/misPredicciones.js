import { prediccionCompleta } from './participantProgress.js'

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
