<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import AppLayout from '../components/AppLayout.vue'
import MatchPredictionCard from '../components/MatchPredictionCard.vue'
import PartidoRivalesLink from '../components/PartidoRivalesLink.vue'
import BracketView from '../components/BracketView.vue'
import FinalistasCampeonPicker from '../components/FinalistasCampeonPicker.vue'
import { useSession } from '../composables/useSession.js'
import { useConfig } from '../composables/useConfig.js'
import { supabase, supabaseConfigured } from '../lib/supabase.js'
import { fetchAllPartidos } from '../lib/dataLoaders.js'
import {
  campeonEdicionCerrada,
  cuadroR32Completo,
  equiposMitadCuadro,
  formatCierreRelativo,
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
const partidos = ref([])
const predicciones = ref({})
const campeon = ref({ equipo: '', finalista_1: '', finalista_2: '' })
const loading = ref(true)
const vista = ref('cargar')
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

onMounted(async () => {
  await loadConfig()
  await cargar()
  relojTimer = setInterval(() => {
    ahora.value = Date.now()
  }, 30_000)
})

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
  partidos.value = await fetchAllPartidos(supabase)

  const { data: preds } = await supabase
    .from('predicciones')
    .select('*')
    .eq('participante_id', participanteId.value)
  predicciones.value = Object.fromEntries((preds || []).map((p) => [p.partido_id, p]))

  const { data: camp } = await supabase
    .from('prediccion_campeon')
    .select('*')
    .eq('participante_id', participanteId.value)
    .maybeSingle()
  if (camp) campeon.value = { ...campeon.value, ...camp }
  loading.value = false
}

function partidoBloqueado(partido) {
  return bloqueadoGlobal.value || partidoEdicionCerrada(partido, ahora.value)
}

function mensajeCierrePartido(partido) {
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
  if (!partido || partidoBloqueado(partido) || !supabaseConfigured) return
  await supabase.rpc('upsert_prediccion', {
    p_participante_id: participanteId.value,
    p_partido_id: payload.partido_id,
    p_goles_local: payload.goles_local,
    p_goles_visitante: payload.goles_visitante,
    p_penales: payload.penales ?? false,
    p_ganador_penales: payload.ganador_penales ?? null,
  })
  predicciones.value[payload.partido_id] = { ...predicciones.value[payload.partido_id], ...payload }
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
        Cada partido se bloquea 1 h antes de su horario. Finalistas y campeón se bloquean 1 h antes
        del primer cruce de eliminatorias.
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
        <div v-for="ronda in porRonda" :key="ronda.fase" class="mb-4">
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
            <PartidoRivalesLink :partido-id="p.id" />
          </div>
        </div>

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

      <BracketView v-else :partidos="partidos" :predicciones="predicciones" />

      <p v-if="porRonda.length === 0 && vista === 'cargar'" class="text-muted">
        Aún no hay partidos de eliminatorias. El admin debe traer los cuadros cuando se definan los
        cruces.
      </p>
    </template>
  </AppLayout>
</template>
