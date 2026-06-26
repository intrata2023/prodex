<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppLayout from '../components/AppLayout.vue'
import NavBackLink from '../components/NavBackLink.vue'
import MisPrediccionRow from '../components/MisPrediccionRow.vue'
import { useSession } from '../composables/useSession.js'
import { usePrediccionContrincanteVisibilidad } from '../composables/usePrediccionContrincanteVisibilidad.js'
import { supabase, supabaseConfigured } from '../lib/supabase.js'
import { mapPrediccionesACanonica } from '../lib/participantProgress.js'
import {
  fetchAllPartidos,
  fetchAllParticipantesPublic,
  fetchAllResultados,
  fetchPrediccionesParticipante,
  mapResultadosPorPartido,
} from '../lib/dataLoaders.js'
import {
  agruparPorFecha,
  claveArgentinaOffset,
  formatFechaDiaTitulo,
  labelDiaRelativo,
  partidosConPrediccion,
  partidosDelDia,
  partidosListadoPredicciones,
  resumenPredicciones,
  resumenPuntosDia,
} from '../lib/misPredicciones.js'

const route = useRoute()
const { participanteId } = useSession()
const {
  iniciar: iniciarVisibilidad,
  detener: detenerVisibilidad,
  mensajePrediccionOculta: mensajeOcultaBase,
  filtrarPrediccionesVisibles,
} = usePrediccionContrincanteVisibilidad()
const rival = ref(null)
const partidos = ref([])
const predicciones = ref({})
const resultados = ref({})
const campeon = ref(null)
const loading = ref(true)
const error = ref('')
const fase = ref('todo')
const modo = ref('dia')
const offsetDias = ref(0)

const rivalId = computed(() => route.params.id)

const esYo = computed(() => rival.value?.id === participanteId.value)

const partidosLista = computed(() => partidosListadoPredicciones(partidos.value))

const partidosPredichos = computed(() =>
  partidosConPrediccion(partidosLista.value, predicciones.value)
)

const partidosFiltrados = computed(() => {
  if (fase.value === 'grupos') {
    return partidosPredichos.value.filter((p) => p.fase === 'grupos')
  }
  if (fase.value === 'eliminatorias') {
    return partidosPredichos.value.filter((p) => p.fase !== 'grupos')
  }
  return partidosPredichos.value
})

const resumenActivo = computed(() =>
  resumenPredicciones(
    partidosFiltrados.value,
    filtrarPrediccionesVisibles(partidosFiltrados.value, predicciones.value),
    resultados.value
  )
)

const claveDia = computed(() => claveArgentinaOffset(offsetDias.value))
const etiquetaCorta = computed(() => labelDiaRelativo(offsetDias.value))
const tituloDia = computed(() =>
  formatFechaDiaTitulo(claveDia.value, { fecha: `${claveDia.value}T12:00:00` })
)

const partidosDelDiaActivo = computed(() =>
  partidosDelDia(partidosFiltrados.value, claveDia.value)
)

const resumenDia = computed(() =>
  resumenPuntosDia(
    partidosDelDiaActivo.value,
    filtrarPrediccionesVisibles(partidosDelDiaActivo.value, predicciones.value),
    resultados.value
  )
)

function mensajePrediccionOculta(partido) {
  if (esYo.value) return ''
  return mensajeOcultaBase(partido)
}

const bloquesHistorial = computed(() => agruparPorFecha(partidosFiltrados.value))

const tieneCampeon = computed(
  () => campeon.value?.equipo || campeon.value?.finalista_1 || campeon.value?.finalista_2
)

watch(rivalId, () => {
  offsetDias.value = 0
  cargar()
})

function initial(nombre) {
  return (nombre || '?').charAt(0).toUpperCase()
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
  if (!supabaseConfigured || !rivalId.value) {
    loading.value = false
    return
  }

  try {
    const [pts, participantes, preds, res, campeonRow] = await Promise.all([
      fetchAllPartidos(supabase),
      fetchAllParticipantesPublic(supabase),
      fetchPrediccionesParticipante(supabase, rivalId.value),
      fetchAllResultados(supabase),
      supabase
        .from('prediccion_campeon')
        .select('equipo, finalista_1, finalista_2')
        .eq('participante_id', rivalId.value)
        .maybeSingle(),
    ])

    const idx = participantes.findIndex((p) => p.id === rivalId.value)
    if (idx === -1) {
      error.value = 'No encontramos a ese participante.'
      loading.value = false
      return
    }

    rival.value = { ...participantes[idx], puesto: idx + 1 }
    partidos.value = pts
    resultados.value = mapResultadosPorPartido(res)

    const predMap = Object.fromEntries(preds.map((p) => [p.partido_id, p]))
    const grupos = partidos.value.filter((p) => p.fase === 'grupos')
    predicciones.value = {
      ...predMap,
      ...mapPrediccionesACanonica(grupos, predMap),
    }
    campeon.value = campeonRow.data || null
  } catch (e) {
    console.error(e)
    error.value = 'No se pudieron cargar las predicciones. Probá de nuevo.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <AppLayout :title="esYo ? 'Mis predicciones' : ''">
    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border text-primary" role="status" />
    </div>

    <p v-else-if="error" class="home-hoy-empty">
      {{ error }}
      <button type="button" class="home-hoy-retry" @click="cargar">Reintentar</button>
    </p>

    <div v-else-if="rival" class="rd">
      <NavBackLink
        :to="esYo ? '/dashboard' : '/rivales/detalle'"
        :label="esYo ? 'Inicio' : 'Predicciones detalladas'"
      />

      <header class="rd-hero">
        <div class="rd-hero-main">
          <span class="rivales-pos" :class="{ 'rivales-pos--podium': rival.puesto <= 3 }">
            {{ rival.puesto }}
          </span>
          <span class="rd-avatar">{{ initial(rival.nombre) }}</span>
          <div class="rd-hero-text">
            <h1 class="rd-nombre">
              {{ rival.nombre }}
              <span v-if="esYo" class="pc-yo">vos</span>
            </h1>
            <p class="rd-desglose">
              {{ rival.desglose?.grupos ?? 0 }} grupos ·
              {{ rival.desglose?.eliminatorias ?? 0 }} elim. ·
              {{ rival.desglose?.final ?? 0 }} final
            </p>
          </div>
          <span class="rd-pts">{{ rival.puntos_total }}</span>
        </div>

        <div v-if="resumenActivo.total" class="rd-stats">
          <div class="rd-stat rd-stat--exacto">
            <span class="rd-stat-n">{{ resumenActivo.exacto }}</span>
            <span class="rd-stat-l">Exactos</span>
          </div>
          <div class="rd-stat rd-stat--parcial">
            <span class="rd-stat-n">{{ resumenActivo.parcial }}</span>
            <span class="rd-stat-l">Parciales</span>
          </div>
          <div class="rd-stat rd-stat--fallo">
            <span class="rd-stat-n">{{ resumenActivo.fallo }}</span>
            <span class="rd-stat-l">Errados</span>
          </div>
          <div class="rd-stat rd-stat--pend">
            <span class="rd-stat-n">{{ resumenActivo.pendiente }}</span>
            <span class="rd-stat-l">Pendientes</span>
          </div>
        </div>

        <div v-if="tieneCampeon" class="rd-campeon">
          <template v-if="campeon.finalista_1 || campeon.finalista_2">
            <span class="rd-campeon-chip">
              {{ campeon.finalista_1 || '—' }} · {{ campeon.finalista_2 || '—' }}
            </span>
          </template>
          <span v-if="campeon.equipo" class="rd-campeon-chip rd-campeon-chip--gold">
            🏆 {{ campeon.equipo }}
          </span>
        </div>
      </header>

      <nav class="rd-toolbar" aria-label="Filtros">
        <div class="rd-segment">
          <button
            type="button"
            class="rd-seg-btn"
            :class="{ active: fase === 'todo' }"
            @click="fase = 'todo'"
          >
            Todo
          </button>
          <button
            type="button"
            class="rd-seg-btn"
            :class="{ active: fase === 'grupos' }"
            @click="fase = 'grupos'"
          >
            Grupos
          </button>
          <button
            type="button"
            class="rd-seg-btn"
            :class="{ active: fase === 'eliminatorias' }"
            @click="fase = 'eliminatorias'"
          >
            Elim.
          </button>
        </div>
        <div class="rd-segment">
          <button
            type="button"
            class="rd-seg-btn"
            :class="{ active: modo === 'dia' }"
            @click="modo = 'dia'"
          >
            Por día
          </button>
          <button
            type="button"
            class="rd-seg-btn"
            :class="{ active: modo === 'historial' }"
            @click="modo = 'historial'"
          >
            Historial
          </button>
        </div>
      </nav>

      <p v-if="!esYo && fase === 'eliminatorias'" class="rd-aviso-ocultas">
        En eliminatorias, las predicciones se revelan 1 h antes de cada partido.
      </p>

      <p v-if="partidosFiltrados.length === 0" class="empty-state">
        Todavía no cargó predicciones en esta etapa.
      </p>

      <template v-else>
        <template v-if="modo === 'dia'">
          <div class="home-hoy-nav rd-nav">
            <button type="button" class="home-hoy-arrow" aria-label="Día anterior" @click="diaAnterior">
              ‹
            </button>
            <button type="button" class="home-hoy-dia" @click="irAHoy">
              <span class="home-hoy-dia-label">{{ etiquetaCorta || tituloDia }}</span>
              <span v-if="etiquetaCorta" class="home-hoy-dia-fecha">{{ tituloDia }}</span>
            </button>
            <button type="button" class="home-hoy-arrow" aria-label="Día siguiente" @click="diaSiguiente">
              ›
            </button>
          </div>

          <p v-if="partidosDelDiaActivo.length === 0" class="rd-empty">
            Sin predicciones este día.
          </p>

          <template v-else>
            <p v-if="resumenDia.conResultado" class="rd-dia-resumen">
              {{ resumenDia.pts }} pts
              <span v-if="resumenDia.exacto"> · {{ resumenDia.exacto }} exacto{{ resumenDia.exacto === 1 ? '' : 's' }}</span>
              <span v-if="resumenDia.parcial"> · {{ resumenDia.parcial }} parcial{{ resumenDia.parcial === 1 ? '' : 'es' }}</span>
            </p>

            <div class="home-hoy-lista rd-lista">
              <MisPrediccionRow
                v-for="p in partidosDelDiaActivo"
                :key="p.id"
                :partido="p"
                :prediccion="predicciones[p.id]"
                :resultado="resultados[p.id]"
                :mensaje-prediccion-oculta="mensajePrediccionOculta(p)"
              />
            </div>
          </template>
        </template>

        <div v-else class="mis-preds-lista rd-lista">
          <section v-for="bloque in bloquesHistorial" :key="bloque.clave" class="mis-preds-dia">
            <h2 class="mis-preds-dia-titulo">{{ bloque.label }}</h2>
            <div class="mis-preds-dia-partidos">
              <MisPrediccionRow
                v-for="p in bloque.partidos"
                :key="p.id"
                :partido="p"
                :prediccion="predicciones[p.id]"
                :resultado="resultados[p.id]"
                :mensaje-prediccion-oculta="mensajePrediccionOculta(p)"
              />
            </div>
          </section>
        </div>
      </template>

      <p class="rd-tz">Horarios ART</p>
    </div>
  </AppLayout>
</template>
