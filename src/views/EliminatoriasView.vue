<script setup>
import { ref, onMounted, computed } from 'vue'
import AppLayout from '../components/AppLayout.vue'
import MatchPredictionCard from '../components/MatchPredictionCard.vue'
import BracketView from '../components/BracketView.vue'
import { useSession } from '../composables/useSession.js'
import { useConfig } from '../composables/useConfig.js'
import { supabase, supabaseConfigured } from '../lib/supabase.js'

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
const resultados = ref({})
const equipos = ref([])
const campeon = ref({ equipo: '', finalista_1: '', finalista_2: '' })
const loading = ref(true)
const vista = ref('cargar')
let campeonTimer = null

const bloqueado = computed(() => !config.value.eliminatorias_abiertos)

const porRonda = computed(() =>
  RONDAS.map((r) => ({
    ...r,
    partidos: partidos.value.filter((p) => p.fase === r.fase),
  })).filter((r) => r.partidos.length > 0)
)

onMounted(async () => {
  await loadConfig()
  await cargar()
})

async function cargar() {
  loading.value = true
  if (!supabaseConfigured) {
    loading.value = false
    return
  }
  const { data: pts } = await supabase
    .from('partidos')
    .select('*')
    .neq('fase', 'grupos')
    .order('orden')
  partidos.value = pts || []

  const allEquipos = new Set()
  for (const p of partidos.value) {
    allEquipos.add(p.equipo_local)
    allEquipos.add(p.equipo_visitante)
  }
  equipos.value = [...allEquipos].sort()

  const [{ data: preds }, { data: res }] = await Promise.all([
    supabase.from('predicciones').select('*').eq('participante_id', participanteId.value),
    supabase.from('resultados_reales').select('*'),
  ])
  predicciones.value = Object.fromEntries((preds || []).map((p) => [p.partido_id, p]))
  resultados.value = Object.fromEntries((res || []).map((r) => [r.partido_id, r]))

  const { data: camp } = await supabase
    .from('prediccion_campeon')
    .select('*')
    .eq('participante_id', participanteId.value)
    .maybeSingle()
  if (camp) campeon.value = { ...campeon.value, ...camp }
  loading.value = false
}

async function guardar(payload) {
  if (bloqueado.value || !supabaseConfigured) return
  await supabase.rpc('upsert_prediccion', {
    p_participante_id: participanteId.value,
    p_partido_id: payload.partido_id,
    p_goles_local: payload.goles_local,
    p_goles_visitante: payload.goles_visitante,
    p_penales: payload.penales ?? false,
  })
  predicciones.value[payload.partido_id] = { ...predicciones.value[payload.partido_id], ...payload }
}

function guardarCampeon() {
  if (bloqueado.value || !supabaseConfigured) return
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
    <div v-if="bloqueado" class="alert alert-warning">
      La carga de eliminatorias está bloqueada por el administrador.
    </div>
    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border text-primary"></div>
    </div>
    <template v-else>
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
          <MatchPredictionCard
            v-for="p in ronda.partidos"
            :key="p.id"
            :partido="p"
            :prediccion="predicciones[p.id]"
            :resultado="resultados[p.id]"
            :show-penales="true"
            :disabled="bloqueado"
            @save="guardar"
          />
        </div>

        <div class="panel-card panel-card--highlight">
          <div class="panel-card-header">Finalistas y campeón</div>
          <div class="panel-card-body">
            <div class="stack-form">
              <div>
                <label class="form-label">Finalista 1</label>
                <select
                  v-model="campeon.finalista_1"
                  class="form-select"
                  :disabled="bloqueado"
                  @change="guardarCampeon"
                >
                  <option value="">Elegir...</option>
                  <option v-for="e in equipos" :key="e" :value="e">{{ e }}</option>
                </select>
              </div>
              <div>
                <label class="form-label">Finalista 2</label>
                <select
                  v-model="campeon.finalista_2"
                  class="form-select"
                  :disabled="bloqueado"
                  @change="guardarCampeon"
                >
                  <option value="">Elegir...</option>
                  <option v-for="e in equipos" :key="e" :value="e">{{ e }}</option>
                </select>
              </div>
              <div>
                <label class="form-label">Campeón</label>
                <select
                  v-model="campeon.equipo"
                  class="form-select"
                  :disabled="bloqueado"
                  @change="guardarCampeon"
                >
                  <option value="">Elegir...</option>
                  <option v-for="e in equipos" :key="e" :value="e">{{ e }}</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </template>

      <BracketView
        v-else
        :partidos="partidos"
        :predicciones="predicciones"
      />

      <p v-if="porRonda.length === 0 && vista === 'cargar'" class="text-muted">
        Aún no hay partidos de eliminatorias. El admin debe cargarlos cuando se definan los cruces.
      </p>
    </template>
  </AppLayout>
</template>
