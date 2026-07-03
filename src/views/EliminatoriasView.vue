<script setup>
import { ref, onMounted, onUnmounted, computed, watch, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import AppLayout from '../components/AppLayout.vue'
import MatchPredictionCard from '../components/MatchPredictionCard.vue'
import PartidoRivalesLink from '../components/PartidoRivalesLink.vue'
import BracketView from '../components/BracketView.vue'
import FinalistasCampeonPicker from '../components/FinalistasCampeonPicker.vue'
import { useSession } from '../composables/useSession.js'
import { useConfig } from '../composables/useConfig.js'
import { supabase, supabaseConfigured } from '../lib/supabase.js'
import { resolverEquipoEnPartido } from '../lib/teamCrestAliases.js'
import { fetchAllPartidos, fetchAllResultados, fetchPrediccionesParticipante, mapResultadosPorPartido } from '../lib/dataLoaders.js'
import {
  campeonEdicionCerrada,
  cruceEliminatoriaCompleto,
  cuadroR32Completo,
  equiposMitadCuadro,
  formatCierreRelativo,
  linkVerTodosContrincantes,
  mostrarPrediccionesContrincantes,
  partidoEdicionCerrada,
  primerInicioEliminatorias,
} from '../lib/eliminatorias.js'

const RONDAS = [
  { fase: 'r32', label: '16avos de final' },
  { fase: 'r16', label: 'Octavos de final' },
  { fase: 'qf', label: 'Cuartos de final' },
  { fase: 'sf', label: 'Semifinales' },
  { fase: 'final', label: 'Final' },
]

const { participanteId } = useSession()
const { config, loadConfig } = useConfig()
const route = useRoute()
const partidos = ref([])
const predicciones = ref({})
const resultados = ref({})
const campeon = ref({ equipo: '', finalista_1: '', finalista_2: '' })
const loading = ref(true)
const vista = ref('cargar')
const soloPendientes = ref(false)
const ahora = ref(Date.now())
let campeonTimer = null
let relojTimer = null

const bloqueadoGlobal = computed(() => !config.value.eliminatorias_abiertos)

const cuadroListo = computed(() => cuadroR32Completo(partidos.value))

const equiposIzq = computed(() => equiposMitadCuadro(partidos.value, 'izq'))
const equiposDer = computed(() => equiposMitadCuadro(partidos.value, 'der'))

const campeonCerrado = computed(() => campeonEdicionCerrada(partidos.value, ahora.value))

const cierrePrimerCruce = computed(() => {
  const ms = primerInicioEliminatorias(partidos.value)
  if (ms == null) return ''
  return formatCierreRelativo(new Date(ms).toISOString())
})

const porRonda = computed(() =>
  RONDAS.map((r) => ({
    ...r,
    partidos: partidos.value.filter((p) => p.fase === r.fase),
  })).filter((r) => r.partidos.length > 0)
)

function partidoJugado(partido) {
  const r = resultados.value[partido.id]
  return Boolean(r && r.goles_local != null && r.goles_visitante != null)
}

const porRondaVisible = computed(() =>
  porRonda.value
    .map((r) => ({
      ...r,
      partidos: soloPendientes.value
        ? r.partidos.filter((p) => !partidoJugado(p))
        : r.partidos,
    }))
    .filter((r) => r.partidos.length > 0)
)

const totalPendientes = computed(() =>
  porRonda.value.reduce(
    (acc, r) => acc + r.partidos.filter((p) => !partidoJugado(p)).length,
    0
  )
)

onMounted(async () => {
  await loadConfig()
  await cargar()
  relojTimer = setInterval(() => {
    ahora.value = Date.now()
  }, 30_000)
  await irAFinalistasCampeonSiCorresponde()
})

watch(
  () => route.hash,
  () => {
    irAFinalistasCampeonSiCorresponde()
  }
)

async function irAFinalistasCampeonSiCorresponde() {
  if (route.hash !== '#finalistas-campeon') return
  vista.value = 'cargar'
  await nextTick()
  document.getElementById('finalistas-campeon')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

onUnmounted(() => {
  clearInterval(relojTimer)
  clearTimeout(campeonTimer)
})

async function cargar() {
  loading.value = true
  if (!supabaseConfigured) {
    loading.value = false
    return
  }
  try {
    const [pts, preds, resList, campRes] = await Promise.all([
      fetchAllPartidos(supabase),
      fetchPrediccionesParticipante(supabase, participanteId.value),
      fetchAllResultados(supabase),
      supabase
        .from('prediccion_campeon')
        .select('*')
        .eq('participante_id', participanteId.value)
        .maybeSingle(),
    ])

    partidos.value = pts
    predicciones.value = Object.fromEntries(preds.map((p) => [p.partido_id, p]))
    resultados.value = mapResultadosPorPartido(resList)
    if (campRes.error) throw campRes.error
    if (campRes.data) campeon.value = { ...campeon.value, ...campRes.data }
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

function partidoBloqueado(partido) {
  return (
    bloqueadoGlobal.value ||
    !cruceEliminatoriaCompleto(partido) ||
    partidoEdicionCerrada(partido, ahora.value)
  )
}

function linkContrincantes(partido) {
  return linkVerTodosContrincantes(partido)
}

function mensajeCierrePartido(partido) {
  if (!cruceEliminatoriaCompleto(partido)) {
    return 'Todavía no están definidos los dos equipos de este cruce.'
  }
  if (bloqueadoGlobal.value) return ''
  if (!partidoEdicionCerrada(partido, ahora.value)) {
    if (partido.fecha) {
      return `Podés editar hasta 1 h antes del partido (${formatCierreRelativo(partido.fecha)} ART).`
    }
    return ''
  }
  return 'Carga cerrada: faltaba menos de 1 hora para este partido.'
}

async function guardar(payload) {
  const partido = partidos.value.find((p) => p.id === payload.partido_id)
  if (!partido || !cruceEliminatoriaCompleto(partido) || partidoBloqueado(partido) || !supabaseConfigured) {
    return
  }
  const ganadorPenales = payload.ganador_penales
    ? resolverEquipoEnPartido(payload.ganador_penales, partido)
    : null
  await supabase.rpc('upsert_prediccion', {
    p_participante_id: participanteId.value,
    p_partido_id: payload.partido_id,
    p_goles_local: payload.goles_local,
    p_goles_visitante: payload.goles_visitante,
    p_penales: payload.penales ?? false,
    p_ganador_penales: ganadorPenales,
  })
  predicciones.value[payload.partido_id] = {
    ...predicciones.value[payload.partido_id],
    ...payload,
    ganador_penales: ganadorPenales,
  }
}

function guardarCampeon() {
  if (bloqueadoGlobal.value || campeonCerrado.value || !cuadroListo.value || !supabaseConfigured) {
    return
  }
  clearTimeout(campeonTimer)
  campeonTimer = setTimeout(async () => {
    await supabase.rpc('upsert_campeon_prediccion', {
      p_participante_id: participanteId.value,
      p_equipo: campeon.value.equipo || null,
      p_finalista_1: campeon.value.finalista_1 || null,
      p_finalista_2: campeon.value.finalista_2 || null,
    })
  }, 400)
}
</script>

<template>
  <AppLayout title="Eliminatorias">
    <div v-if="bloqueadoGlobal" class="alert alert-warning">
      La carga de eliminatorias está bloqueada por el administrador.
    </div>
    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border text-primary"></div>
    </div>
    <template v-else>
      <p class="elim-reglas">
        Marcador al cierre de los <strong>120 minutos</strong> (90 + alargue). Si empatan a los 120,
        elegí quién gana por penales (P). Cada partido se bloquea 1 h antes de su horario.
        Finalistas y campeón se bloquean 1 h antes del primer cruce de eliminatorias.
      </p>

      <div class="view-toggle">
        <button
          type="button"
          class="view-toggle-btn"
          :class="{ active: vista === 'cargar' }"
          @click="vista = 'cargar'"
        >
          Cargar
        </button>
        <button
          type="button"
          class="view-toggle-btn"
          :class="{ active: vista === 'cuadro' }"
          @click="vista = 'cuadro'"
        >
          Cuadro
        </button>
      </div>

      <template v-if="vista === 'cargar'">
        <div v-if="porRonda.length > 0" class="elim-filtro">
          <button
            type="button"
            class="elim-filtro-chip"
            :class="{ 'elim-filtro-chip--active': soloPendientes }"
            :aria-pressed="soloPendientes"
            @click="soloPendientes = !soloPendientes"
          >
            {{ soloPendientes ? 'Mostrando pendientes' : 'Solo por jugarse' }}
            <span class="elim-filtro-count">{{ totalPendientes }}</span>
          </button>
        </div>

        <div v-for="ronda in porRondaVisible" :key="ronda.fase" class="mb-4">
          <h2 class="section-heading">{{ ronda.label }}</h2>
          <div v-for="p in ronda.partidos" :key="p.id" class="elim-partido-item">
            <MatchPredictionCard
              :partido="p"
              :prediccion="predicciones[p.id]"
              :show-penales="true"
              :disabled="partidoBloqueado(p)"
              :lock-message="mensajeCierrePartido(p)"
              @save="guardar"
            />
            <PartidoRivalesLink v-if="linkContrincantes(p)" :partido-id="p.id" />
          </div>
        </div>

        <p
          v-if="soloPendientes && porRondaVisible.length === 0 && porRonda.length > 0"
          class="text-muted elim-filtro-vacio"
        >
          No quedan partidos por jugarse.
        </p>

        <FinalistasCampeonPicker
          v-model="campeon"
          :equipos-izq="equiposIzq"
          :equipos-der="equiposDer"
          :cuadro-listo="cuadroListo"
          :cerrado="campeonCerrado"
          :disabled="bloqueadoGlobal"
          :cierre-label="cierrePrimerCruce"
          @save="guardarCampeon"
        />
      </template>

      <BracketView v-else :partidos="partidos" :resultados="resultados" />

      <p v-if="porRonda.length === 0 && vista === 'cargar'" class="text-muted">
        Aún no hay partidos de eliminatorias. El admin debe traer los cuadros cuando se definan los
        cruces.
      </p>
    </template>
  </AppLayout>
</template>
