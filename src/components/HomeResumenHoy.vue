<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { RouterLink } from 'vue-router'
import MisPrediccionRow from './MisPrediccionRow.vue'
import { useSession } from '../composables/useSession.js'
import { useConfig } from '../composables/useConfig.js'
import { supabase, supabaseConfigured } from '../lib/supabase.js'
import {
  linkVerTodosContrincantes,
  campeonEdicionCerrada,
} from '../lib/eliminatorias.js'
import { mapPrediccionesACanonica, statusCampeon } from '../lib/participantProgress.js'
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
  partidosDelDia,
  partidosListadoPredicciones,
  resumenCargaDia,
  resumenPuntosDia,
  etiquetaPartidoPendiente,
} from '../lib/misPredicciones.js'

const { participanteId } = useSession()
const { config, loadConfig } = useConfig()

const partidos = ref([])
const predicciones = ref({})
const resultados = ref({})
const campeonPred = ref(null)
const loading = ref(true)
const error = ref('')
const offsetDias = ref(0)
const ahora = ref(Date.now())
let relojTimer = null

const claveDia = computed(() => claveArgentinaOffset(offsetDias.value))
const etiquetaCorta = computed(() => labelDiaRelativo(offsetDias.value))
const tituloDia = computed(() =>
  formatFechaDiaTitulo(claveDia.value, { fecha: `${claveDia.value}T12:00:00` })
)

const partidosLista = computed(() => partidosListadoPredicciones(partidos.value))

const partidosDelDiaTodos = computed(() =>
  partidosDelDia(partidosLista.value, claveDia.value)
)

const cargaDia = computed(() =>
  resumenCargaDia(partidosDelDiaTodos.value, predicciones.value, {
    gruposAbiertos: config.value.grupos_abiertos,
    eliminatoriasAbiertos: config.value.eliminatorias_abiertos,
    ahora: ahora.value,
  })
)

const campeonStatus = computed(() => statusCampeon(campeonPred.value))

const campeonBloqueado = computed(
  () =>
    !config.value.eliminatorias_abiertos ||
    campeonEdicionCerrada(partidos.value, ahora.value)
)

const linkCargaPendiente = computed(() => {
  const pend = cargaDia.value.partidosPendientes
  if (!pend.length) return null
  const tieneGrupos = pend.some((p) => p.fase === 'grupos')
  const tieneElim = pend.some((p) => p.fase !== 'grupos')
  if (tieneGrupos && !tieneElim) return { to: '/grupos', label: 'Ir a grupos' }
  if (tieneElim && !tieneGrupos) return { to: '/eliminatorias', label: 'Ir a eliminatorias' }
  return { to: '/grupos', label: 'Ir a cargar predicciones' }
})

const resumenDia = computed(() =>
  resumenPuntosDia(partidosDelDiaTodos.value, predicciones.value, resultados.value)
)

function etiquetaPartido(partido) {
  return etiquetaPartidoPendiente(partido, predicciones.value)
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
  await loadConfig()
  cargar()
  relojTimer = setInterval(() => {
    ahora.value = Date.now()
  }, 30_000)
})

onUnmounted(() => {
  clearInterval(relojTimer)
})

async function cargar() {
  loading.value = true
  error.value = ''
  if (!supabaseConfigured) {
    loading.value = false
    return
  }

  try {
    const [pts, preds, res, campRes] = await Promise.all([
      fetchAllPartidos(supabase),
      fetchPrediccionesParticipante(supabase, participanteId.value),
      fetchAllResultados(supabase),
      supabase
        .from('prediccion_campeon')
        .select('*')
        .eq('participante_id', participanteId.value)
        .maybeSingle(),
    ])

    campeonPred.value = campRes.data || null
    if (campRes.error) throw campRes.error

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
  <div
    v-if="!loading && !error && supabaseConfigured && cargaDia.pendientes > 0"
    class="home-alarma"
    role="alert"
  >
    <span class="home-alarma-icono" aria-hidden="true">⚠️</span>
    <div class="home-alarma-texto">
      <strong class="home-alarma-titulo">
        {{
          cargaDia.pendientes === 1
            ? 'Te falta cargar un partido'
            : `Te faltan cargar ${cargaDia.pendientes} partidos`
        }}
      </strong>
      <span class="home-alarma-sub">
        {{
          offsetDias === 0
            ? 'Completá tus predicciones de hoy antes de que cierren.'
            : 'Completá tus predicciones de este día antes de que cierren.'
        }}
      </span>
    </div>
    <RouterLink
      v-if="linkCargaPendiente"
      :to="linkCargaPendiente.to"
      class="home-alarma-btn"
    >
      {{ linkCargaPendiente.label }}
    </RouterLink>
  </div>

  <section class="home-hoy">
    <nav class="home-hoy-links-bar" aria-label="Predicciones">
      <RouterLink to="/rivales/detalle" class="home-hoy-link home-hoy-link--cta">
        Ver detalle completo
      </RouterLink>
      <div v-if="participanteId" class="home-hoy-links-row">
        <RouterLink
          to="/rivales"
          class="home-hoy-link home-hoy-link--pill"
        >
          Ver contrincantes
        </RouterLink>
        <RouterLink
          to="/eliminatorias#finalistas-campeon"
          class="home-hoy-link home-hoy-link--pill home-hoy-link--pill-campeon"
          :class="{
            'home-hoy-link--pill-warn': !campeonBloqueado && !campeonStatus.completo,
            'home-hoy-link--pill-ok': !campeonBloqueado && campeonStatus.completo,
            'home-hoy-link--pill-locked': campeonBloqueado,
          }"
        >
          <span class="home-hoy-pill-label">Finalistas y campeón</span>
          <span
            class="home-hoy-pill-tag"
            :class="{
              'home-hoy-pill-tag--ok': !campeonBloqueado && campeonStatus.completo,
              'home-hoy-pill-tag--warn': !campeonBloqueado && !campeonStatus.completo,
              'home-hoy-pill-tag--muted': campeonBloqueado,
            }"
          >
            {{ campeonStatus.completo ? 'Completado' : 'Incompleto' }}
          </span>
        </RouterLink>
      </div>
    </nav>

    <div class="home-hoy-head">
      <h2 class="home-hoy-title">Mis partidos</h2>
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

    <div
      v-if="!loading && !error && supabaseConfigured && cargaDia.total > 0"
      class="home-hoy-alerta"
      :class="cargaDia.pendientes > 0 ? 'home-hoy-alerta--warn' : 'home-hoy-alerta--ok'"
      role="status"
    >
      <template v-if="cargaDia.pendientes > 0">
        <strong>
          {{
            cargaDia.pendientes === 1
              ? 'Partido del día sin cargar:'
              : 'Partidos del día sin cargar:'
          }}
        </strong>
        {{ cargaDia.partidosPendientes.map(etiquetaPartido).join(' · ') }}
        <RouterLink v-if="linkCargaPendiente" :to="linkCargaPendiente.to" class="home-hoy-alerta-link">
          {{ linkCargaPendiente.label }}
        </RouterLink>
      </template>
      <template v-else>
        {{ cargaDia.cargados === 1 ? 'Partido del día cargado' : 'Partidos del día cargados' }}
      </template>
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

    <template v-else>
      <p v-if="partidosDelDiaTodos.length === 0" class="home-hoy-empty">
        No hay partidos programados para este día.
      </p>

      <template v-else>
        <div class="home-hoy-stats">
          <span>{{ resumenDia.total }} {{ resumenDia.total === 1 ? 'partido' : 'partidos' }}</span>
          <template v-if="resumenDia.conResultado">
            <span class="home-hoy-stat-sep">·</span>
            <span>{{ resumenDia.pts }} pts</span>
            <span v-if="resumenDia.exacto" class="home-hoy-stat home-hoy-stat--exacto">
              {{ resumenDia.exacto }} exacto{{ resumenDia.exacto === 1 ? '' : 's' }}
            </span>
            <span v-if="resumenDia.parcial" class="home-hoy-stat home-hoy-stat--parcial">
              {{ resumenDia.parcial }} parcial{{ resumenDia.parcial === 1 ? '' : 'es' }}
            </span>
          </template>
        </div>

        <div class="home-hoy-lista">
          <MisPrediccionRow
            v-for="p in partidosDelDiaTodos"
            :key="p.id"
            :partido="p"
            :prediccion="predicciones[p.id]"
            :resultado="resultados[p.id]"
            :show-contrincantes-link="linkContrincantes(p)"
          />
        </div>
      </template>
    </template>
  </section>
</template>
