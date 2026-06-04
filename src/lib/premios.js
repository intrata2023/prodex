/**
 * Distribución de premios del pozo
 */

export function calcularPremios(ranking, montoPorPersona = 15000) {
  const n = ranking.length
  if (n === 0) return []

  const pozoTotal = n * montoPorPersona
  const sorted = [...ranking].sort((a, b) => b.puntos_total - a.puntos_total)

  const grupos = []
  let i = 0
  while (i < sorted.length) {
    const puntos = sorted[i].puntos_total
    const grupo = sorted.filter((p) => p.puntos_total === puntos)
    grupos.push(grupo)
    i += grupo.length
  }

  const porcentajes = [0.7, 0.2, 0.1]
  const premios = sorted.map((p) => ({ ...p, premio: 0, puesto: null }))

  let puestoActual = 1
  let idxPorcentaje = 0

  for (const grupo of grupos) {
    if (puestoActual > 3) break
    if (idxPorcentaje >= porcentajes.length) break

    let pct = porcentajes[idxPorcentaje]

    if (puestoActual === 1 && grupo.length === 2) {
      pct = 0.45
      const monto = pozoTotal * pct
      for (const p of grupo) {
        const item = premios.find((x) => x.id === p.id)
        item.premio = monto
        item.puesto = 1
      }
      idxPorcentaje = 2
      puestoActual = 3
      continue
    }

    if (puestoActual === 1 && grupo.length >= 3) {
      const monto = pozoTotal / grupo.length
      for (const p of grupo) {
        const item = premios.find((x) => x.id === p.id)
        item.premio = monto
        item.puesto = 1
      }
      break
    }

    const monto = (pozoTotal * pct) / grupo.length
    for (const p of grupo) {
      const item = premios.find((x) => x.id === p.id)
      item.premio = monto
      item.puesto = puestoActual
    }

    puestoActual += grupo.length
    idxPorcentaje += grupo.length
  }

  return premios
}

export function formatARS(monto) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(monto)
}
