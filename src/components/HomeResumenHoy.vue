<script setup>
import { ref, computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import MisPrediccionRow from './MisPrediccionRow.vue'
import { useSession } from '../composables/useSession.js'
import { supabase, supabaseConfigured } from '../lib/supabase.js'
import { mapPrediccionesACanonica } from '../lib/participantProgress.js'
import {
  fetchAllPartidos,
  fetchAllResultados,
  fetchPrediccionesParticipante,
  mapResultadosPorPartido,
} from '../lib/dataLoaders.js'
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
const partidos = ref([])
const predicciones = ref({})
const resultados = ref({})
const loading = ref(true)
const error = ref('')
const offsetDias = ref(0)

const claveDia = computed(() => claveArgentinaOffset(offsetDias.value))

const etiquetaCorta = computed(() => labelDiaRelativo(offsetDias.value))

const tituloDia = computed(() =>
  formatFechaDiaTitulo(claveDia.value, { fecha: `${claveDia.value}T12:00:00` })
)

const predichos = computed(() =>
  partidosConPrediccion(partidosListadoPredicciones(partidos.value), predicciones.value)
)

const partidosDelDiaActivo = computed(() =>
  partidosDelDia(predichos.value, claveDia.value)
)

const resumenDia = computed(() =>
  resumenPuntosDia(partidosDelDiaActivo.value, predicciones.value, resultados.value)
)

function diaAnterior() {
  offsetDias.value -= 1
}

function diaSiguiente() {
  offsetDias.value += 1
}

function irAHoy() {
  offsetDias.value = 0
}

onMounted(cargar)

async function cargar() {
  loading.value = true
  error.value = ''
  if (!supabaseConfigured) {
    loading.value = false
    return
  }

  try {
    const [pts, preds, res] = await Promise.all([
      fetchAllPartidos(supabase),
      fetchPrediccionesParticipante(supabase, participanteId.value),
      fetchAllResultados(supabase),
    ])

    partidos.value = pts
    const predMap = Object.fromEntries(preds.map((p) => [p.partido_id, p]))
    const grupos = partidos.value.filter((p) => p.fase === 'grupos')
    predicciones.value = {
      ...predMap,
      ...mapPrediccionesACanonica(grupos, predMap),
    }
    resultados.value = mapResultadosPorPartido(res)
  } catch (e) {
    console.error(e)
    error.value = 'No se pudieron cargar los partidos. Probá de nuevo.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <section class="home-hoy">
    <div class="home-hoy-head">
      <h2 class="home-hoy-title">Mis partidos</h2>
      <div class="home-hoy-links">
        <RouterLink to="/rivales" class="home-hoy-link">Ver predicciones de contrincantes</RouterLink>
        <RouterLink to="/mis-predicciones" class="home-hoy-link">Ver todo</RouterLink>
      </div>
    </div>

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
      Configurá Supabase para ver el resumen.
    </p>

    <p v-else-if="partidosDelDiaActivo.length === 0" class="home-hoy-empty">
      No tenés predicciones para este día.
    </p>

    <template v-else>
      <div v-if="resumenDia.conResultado" class="home-hoy-stats">
        <span>{{ resumenDia.total }} {{ resumenDia.total === 1 ? 'partido' : 'partidos' }}</span>
        <span class="home-hoy-stat-sep">·</span>
        <span>{{ resumenDia.pts }} pts</span>
        <span v-if="resumenDia.exacto" class="home-hoy-stat home-hoy-stat--exacto">
          {{ resumenDia.exacto }} exacto{{ resumenDia.exacto === 1 ? '' : 's' }}
        </span>
        <span v-if="resumenDia.parcial" class="home-hoy-stat home-hoy-stat--parcial">
          {{ resumenDia.parcial }} parcial{{ resumenDia.parcial === 1 ? '' : 'es' }}
        </span>
      </div>
      <div v-else class="home-hoy-stats">
        <span>{{ resumenDia.total }} {{ resumenDia.total === 1 ? 'partido' : 'partidos' }}</span>
        <span class="home-hoy-stat-sep">·</span>
        <span>Sin resultados cargados</span>
      </div>

      <div class="home-hoy-lista">
        <MisPrediccionRow
          v-for="p in partidosDelDiaActivo"
          :key="p.id"
          :partido="p"
          :prediccion="predicciones[p.id]"
          :resultado="resultados[p.id]"
        />
      </div>
    </template>
  </section>
</template>
