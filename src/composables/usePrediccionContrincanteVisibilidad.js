import { ref } from 'vue'
import { useConfig } from './useConfig.js'
import {
  mensajePrediccionContrincante,
  mostrarPrediccionesContrincantes,
} from '../lib/eliminatorias.js'

export function usePrediccionContrincanteVisibilidad() {
  const { config, loadConfig } = useConfig()
  const ahora = ref(Date.now())
  let relojTimer = null

  async function iniciar() {
    await loadConfig()
    relojTimer = setInterval(() => {
      ahora.value = Date.now()
    }, 30_000)
  }

  function detener() {
    clearInterval(relojTimer)
  }

  function visibilidadOpts() {
    return {
      eliminatoriasAbiertos: config.value.eliminatorias_abiertos,
      ahora: ahora.value,
    }
  }

  function prediccionVisible(partido) {
    return mostrarPrediccionesContrincantes(partido, visibilidadOpts())
  }

  function mensajePrediccionOculta(partido) {
    return mensajePrediccionContrincante(partido, visibilidadOpts()) || ''
  }

  /** Predicciones visibles para resúmenes (sin filtrar puntos de cruces bloqueados). */
  function filtrarPrediccionesVisibles(partidos, predicciones) {
    const out = {}
    for (const p of partidos) {
      const pred = predicciones[p.id]
      if (pred && prediccionVisible(p)) out[p.id] = pred
    }
    return out
  }

  return {
    iniciar,
    detener,
    prediccionVisible,
    mensajePrediccionOculta,
    filtrarPrediccionesVisibles,
  }
}
