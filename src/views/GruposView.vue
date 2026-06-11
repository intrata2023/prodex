<script setup>
import { ref, onMounted, computed } from 'vue'
import AppLayout from '../components/AppLayout.vue'
import MatchPredictionCard from '../components/MatchPredictionCard.vue'
import GroupStandingsPanel from '../components/GroupStandingsPanel.vue'
import { useSession } from '../composables/useSession.js'
import { useConfig } from '../composables/useConfig.js'
import { supabase, supabaseConfigured } from '../lib/supabase.js'
import {
  indexPartidosGrupos,
  mapPrediccionesACanonica,
  resolveCanonicalPartidoId,
  reparacionesPredicciones,
  letrasGruposIncompletos,
} from '../lib/participantProgress.js'

const { participanteId } = useSession()
const { config, loadConfig } = useConfig()
const partidos = ref([])
const predicciones = ref({})
const loading = ref(true)
const vista = ref('cargar')

const grupos = computed(() => {
  const { fixtures, porGrupo } = indexPartidosGrupos(partidos.value)
  return [...porGrupo.keys()]
    .sort()
    .map((letra) => ({
      letra,
      partidos: [...porGrupo.get(letra)]
        .map((key) => fixtures.get(key).canonical)
        .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0)),
    }))
})

const bloqueado = computed(() => !config.value.grupos_abiertos)

const gruposIncompletos = computed(() =>
  new Set(letrasGruposIncompletos(partidos.value, predicciones.value))
)

const faltanGrupos = computed(() => gruposIncompletos.value.size > 0)

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
    .eq('fase', 'grupos')
    .order('grupo')
    .order('orden')
  partidos.value = pts || []

  const { data: preds } = await supabase
    .from('predicciones')
    .select('*')
    .eq('participante_id', participanteId.value)
  const predMap = Object.fromEntries((preds || []).map((p) => [p.partido_id, p]))
  const fixes = reparacionesPredicciones(partidos.value, predMap)
  for (const fix of fixes) {
    if (!bloqueado.value) {
      await supabase.rpc('upsert_prediccion', {
        p_participante_id: participanteId.value,
        p_partido_id: fix.partido_id,
        p_goles_local: fix.goles_local,
        p_goles_visitante: fix.goles_visitante,
        p_penales: fix.penales ?? false,
      })
    }
    predMap[fix.partido_id] = { ...fix, participante_id: participanteId.value }
  }
  predicciones.value = mapPrediccionesACanonica(partidos.value, predMap)
  loading.value = false
}

async function guardar(payload) {
  if (bloqueado.value || !supabaseConfigured) return
  const partidoId = resolveCanonicalPartidoId(partidos.value, payload.partido_id)
  await supabase.rpc('upsert_prediccion', {
    p_participante_id: participanteId.value,
    p_partido_id: partidoId,
    p_goles_local: payload.goles_local,
    p_goles_visitante: payload.goles_visitante,
    p_penales: false,
  })
  predicciones.value[partidoId] = {
    ...predicciones.value[partidoId],
    ...payload,
    partido_id: partidoId,
  }
}
</script>

<template>
  <AppLayout title="Fase de grupos">
    <div v-if="bloqueado" class="alert alert-info py-2">
      La carga está cerrada. Podés ver tus predicciones, pero no editarlas.
    </div>
    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border text-primary"></div>
    </div>
    <div v-else-if="!supabaseConfigured" class="alert alert-info">
      Configurá Supabase en .env para cargar partidos.
    </div>
    <template v-else>
      <div class="view-toggle">
        <button
          type="button"
          class="view-toggle-btn"
          :class="{ active: vista === 'cargar' }"
          @click="vista = 'cargar'"
        >
          {{ bloqueado ? 'Mis predicciones' : 'Cargar' }}
        </button>
        <button
          type="button"
          class="view-toggle-btn"
          :class="{ active: vista === 'tablas' }"
          @click="vista = 'tablas'"
        >
          Tablas
        </button>
      </div>

      <p v-if="faltanGrupos && !bloqueado" class="grupos-aviso-incompleto">
        Todavía no completaste todos los grupos. Revisá los que figuran como
        <strong>Incompleto</strong>.
      </p>

      <template v-if="vista === 'cargar'">
        <div class="accordion" id="gruposAcc">
          <div v-for="(g, idx) in grupos" :key="g.letra" class="accordion-item">
            <h2 class="accordion-header">
              <button
                class="accordion-button"
                :class="{ collapsed: idx > 0 }"
                type="button"
                data-bs-toggle="collapse"
                :data-bs-target="'#g' + g.letra"
              >
                <span class="accordion-grupo-label">
                  <span>Grupo {{ g.letra }}</span>
                  <span
                    v-if="gruposIncompletos.has(g.letra)"
                    class="grupo-incompleto-badge"
                  >Incompleto</span>
                </span>
              </button>
            </h2>
            <div
              :id="'g' + g.letra"
              class="accordion-collapse collapse"
              :class="{ show: idx === 0 }"
              data-bs-parent="#gruposAcc"
            >
              <div class="accordion-body">
                <MatchPredictionCard
                  v-for="p in g.partidos"
                  :key="p.id"
                  :partido="p"
                  :prediccion="predicciones[p.id]"
                  :readonly="bloqueado"
                  @save="guardar"
                />
              </div>
            </div>
          </div>
        </div>
      </template>

      <GroupStandingsPanel v-else :partidos="partidos" :predicciones="predicciones" />
    </template>
  </AppLayout>
</template>
