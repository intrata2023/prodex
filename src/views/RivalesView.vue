<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import AppLayout from '../components/AppLayout.vue'
import NavBackLink from '../components/NavBackLink.vue'
import MisPrediccionRow from '../components/MisPrediccionRow.vue'
import { useSession } from '../composables/useSession.js'
import { usePrediccionContrincanteVisibilidad } from '../composables/usePrediccionContrincanteVisibilidad.js'
import { linkVerTodosContrincantes } from '../lib/eliminatorias.js'
import { supabase, supabaseConfigured } from '../lib/supabase.js'
import {
  fetchAllPartidos,
  fetchAllParticipantesPublic,
  fetchAllPredicciones,
  fetchAllResultados,
  mapResultadosPorPartido,
} from '../lib/dataLoaders.js'
import { mapPrediccionesACanonica } from '../lib/participantProgress.js'
import {
  claveArgentinaOffset,
  formatFechaDiaTitulo,
  labelDiaRelativo,
  partidosConPrediccion,
  partidosDelDia,
  partidosListadoPredicciones,
  resumenPuntosDia,
} from '../lib/misPredicciones.js'

const { participanteId } = useSession()
const {
  iniciar: iniciarVisibilidad,
  detener: detenerVisibilidad,
  mensajePrediccionOculta,
  filtrarPrediccionesVisibles,
} = usePrediccionContrincanteVisibilidad()
const partidos = ref([])
const partidosLista = computed(() => partidosListadoPredicciones(partidos.value))
const rivales = ref([])
const prediccionesPorRival = ref({})
const resultados = ref({})
const loading = ref(true)
const error = ref('')
const offsetDias = ref(0)
const expandido = ref(null)

const claveDia = computed(() => claveArgentinaOffset(offsetDias.value))
const etiquetaCorta = computed(() => labelDiaRelativo(offsetDias.value))
const tituloDia = computed(() =>
  formatFechaDiaTitulo(claveDia.value, { fecha: `${claveDia.value}T12:00:00` })
)

function initial(nombre) {
  return (nombre || '?').charAt(0).toUpperCase()
}

function prediccionesRival(id) {
  return prediccionesPorRival.value[id] || {}
}

function partidosDelRival(id) {
  return partidosDelDia(
    partidosConPrediccion(partidosLista.value, prediccionesRival(id)),
    claveDia.value
  )
}

function resumenRivalDia(id) {
  const lista = partidosDelRival(id)
  const preds = filtrarPrediccionesVisibles(lista, prediccionesRival(id))
  const resumen = resumenPuntosDia(lista, preds, resultados.value)
  const ocultas = lista.filter(
    (p) => p.fase !== 'grupos' && prediccionesRival(id)[p.id] && mensajePrediccionOculta(p)
  ).length
  return { ...resumen, ocultas }
}

function resumenDiaTexto(resumen) {
  if (!resumen.total) return 'Sin predicciones este día'
  const ocultasTxt =
    resumen.ocultas > 0
      ? ` · ${resumen.ocultas} oculta${resumen.ocultas === 1 ? '' : 's'}`
      : ''
  if (!resumen.conResultado) {
    return `${resumen.total} ${resumen.total === 1 ? 'partido' : 'partidos'}${ocultasTxt}`
  }
  const partes = [`${resumen.pts} pts`]
  if (resumen.exacto) partes.push(`${resumen.exacto} exacto${resumen.exacto === 1 ? '' : 's'}`)
  if (resumen.parcial) partes.push(`${resumen.parcial} parcial${resumen.parcial === 1 ? '' : 'es'}`)
  return partes.join(' · ') + ocultasTxt
}

function toggleRival(id) {
  expandido.value = expandido.value === id ? null : id
}

function linkContrincantes(partido) {
  return linkVerTodosContrincantes(partido)
}

function diaAnterior() {
  offsetDias.value -= 1
}

function diaSiguiente() {
  offsetDias.value += 1
}

function irAHoy() {
  offsetDias.value = 0
}

onMounted(async () => {
  await iniciarVisibilidad()
  cargar()
})

onUnmounted(detenerVisibilidad)

async function cargar() {
  loading.value = true
  error.value = ''
  if (!supabaseConfigured) {
    loading.value = false
    return
  }

  try {
    const [pts, participantes, preds, res] = await Promise.all([
      fetchAllPartidos(supabase),
      fetchAllParticipantesPublic(supabase),
      fetchAllPredicciones(supabase),
      fetchAllResultados(supabase),
    ])

    partidos.value = pts
    resultados.value = mapResultadosPorPartido(res)

    const grupos = partidos.value.filter((p) => p.fase === 'grupos')
    const porParticipante = {}
    for (const p of preds) {
      if (!porParticipante[p.participante_id]) porParticipante[p.participante_id] = []
      porParticipante[p.participante_id].push(p)
    }

    const mapa = {}
    for (const [id, lista] of Object.entries(porParticipante)) {
      const predMap = Object.fromEntries(lista.map((p) => [p.partido_id, p]))
      mapa[id] = { ...predMap, ...mapPrediccionesACanonica(grupos, predMap) }
    }
    prediccionesPorRival.value = mapa

    rivales.value = participantes
      .map((p, i) => ({ ...p, puesto: i + 1 }))
      .filter((p) => p.id !== participanteId.value)
  } catch (e) {
    console.error(e)
    error.value = 'No se pudieron cargar los contrincantes. Probá de nuevo.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <AppLayout title="Contrincantes">
    <NavBackLink to="/dashboard" label="Inicio" />

    <p class="rivales-intro">
      Ordenados según la tabla. Tocá un nombre para el día elegido, o entrá al detalle completo.
      En eliminatorias, las predicciones de los demás se van revelando a medida que cierra la carga
      de cada cruce (1 h antes del partido).
      <router-link to="/rivales/detalle" class="rivales-intro-link rivales-intro-link--cta">
        Ver predicciones detalladas
      </router-link>
    </p>

    <section class="home-hoy rivales-panel">
      <div class="home-hoy-nav">
        <button
          type="button"
          class="home-hoy-arrow"
          aria-label="Día anterior"
          @click="diaAnterior"
        >
          ‹
        </button>

        <button type="button" class="home-hoy-dia" @click="irAHoy">
          <span class="home-hoy-dia-label">{{ etiquetaCorta || tituloDia }}</span>
          <span v-if="etiquetaCorta" class="home-hoy-dia-fecha">{{ tituloDia }}</span>
          <span v-if="offsetDias !== 0" class="home-hoy-dia-hint">Tocá para volver a hoy</span>
        </button>

        <button
          type="button"
          class="home-hoy-arrow"
          aria-label="Día siguiente"
          @click="diaSiguiente"
        >
          ›
        </button>
      </div>

      <div v-if="loading" class="home-hoy-loading">
        <div class="spinner-border spinner-border-sm text-secondary" role="status" />
      </div>

      <p v-else-if="error" class="home-hoy-empty">
        {{ error }}
        <button type="button" class="home-hoy-retry" @click="cargar">Reintentar</button>
      </p>

      <p v-else-if="!supabaseConfigured" class="home-hoy-empty">
        Configurá Supabase para ver a tus contrincantes.
      </p>

      <p v-else-if="rivales.length === 0" class="home-hoy-empty">
        No hay otros participantes en la tabla todavía.
      </p>

      <div v-else class="rivales-lista">
        <div
          v-for="rival in rivales"
          :key="rival.id"
          class="rivales-item"
          :class="{ 'rivales-item--open': expandido === rival.id }"
        >
          <button
            type="button"
            class="rivales-trigger"
            :aria-expanded="expandido === rival.id"
            @click="toggleRival(rival.id)"
          >
            <span class="rivales-pos" :class="{ 'rivales-pos--podium': rival.puesto <= 3 }">
              {{ rival.puesto }}
            </span>
            <span class="rivales-avatar">{{ initial(rival.nombre) }}</span>
            <span class="rivales-info">
              <span class="rivales-nombre">{{ rival.nombre }}</span>
              <span class="rivales-dia-resumen">{{ resumenDiaTexto(resumenRivalDia(rival.id)) }}</span>
            </span>
            <span class="rivales-pts">{{ rival.puntos_total }} pts</span>
            <span class="rivales-chevron" aria-hidden="true">
              {{ expandido === rival.id ? '▾' : '▸' }}
            </span>
          </button>

          <div v-if="expandido === rival.id" class="rivales-detalle">
            <div
              v-if="resumenRivalDia(rival.id).total"
              class="home-hoy-stats rivales-detalle-stats"
            >
              <span>
                {{ resumenRivalDia(rival.id).total }}
                {{ resumenRivalDia(rival.id).total === 1 ? 'partido' : 'partidos' }}
              </span>
              <template v-if="resumenRivalDia(rival.id).conResultado">
                <span class="home-hoy-stat-sep">·</span>
                <span>{{ resumenRivalDia(rival.id).pts }} pts</span>
                <span
                  v-if="resumenRivalDia(rival.id).exacto"
                  class="home-hoy-stat home-hoy-stat--exacto"
                >
                  {{ resumenRivalDia(rival.id).exacto }} exacto{{
                    resumenRivalDia(rival.id).exacto === 1 ? '' : 's'
                  }}
                </span>
                <span
                  v-if="resumenRivalDia(rival.id).parcial"
                  class="home-hoy-stat home-hoy-stat--parcial"
                >
                  {{ resumenRivalDia(rival.id).parcial }} parcial{{
                    resumenRivalDia(rival.id).parcial === 1 ? '' : 'es'
                  }}
                </span>
              </template>
            </div>

            <p v-if="partidosDelRival(rival.id).length === 0" class="home-hoy-empty">
              No cargó predicciones para este día.
            </p>

            <div v-else class="home-hoy-lista">
              <MisPrediccionRow
                v-for="p in partidosDelRival(rival.id)"
                :key="p.id"
                :partido="p"
                :prediccion="prediccionesRival(rival.id)[p.id]"
                :resultado="resultados[p.id]"
                :mensaje-prediccion-oculta="mensajePrediccionOculta(p)"
                :show-contrincantes-link="linkContrincantes(p)"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  </AppLayout>
</template>
