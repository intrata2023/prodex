<script setup>
import { ref, onMounted, computed } from 'vue'
import AppLayout from '../components/AppLayout.vue'
import MatchPredictionCard from '../components/MatchPredictionCard.vue'
import GroupStandingsPanel from '../components/GroupStandingsPanel.vue'
import { useSession } from '../composables/useSession.js'
import { useConfig } from '../composables/useConfig.js'
import { supabase, supabaseConfigured } from '../lib/supabase.js'
import { indexPartidosGrupos, mapPrediccionesACanonica } from '../lib/participantProgress.js'

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
  predicciones.value = mapPrediccionesACanonica(partidos.value, predMap)
  loading.value = false
}

async function guardar(payload) {
  if (bloqueado.value || !supabaseConfigured) return
  await supabase.rpc('upsert_prediccion', {
    p_participante_id: participanteId.value,
    p_partido_id: payload.partido_id,
    p_goles_local: payload.goles_local,
    p_goles_visitante: payload.goles_visitante,
    p_penales: false,
  })
  predicciones.value[payload.partido_id] = {
    ...predicciones.value[payload.partido_id],
    ...payload,
  }
}
</script>

<template>
  <AppLayout title="Fase de grupos">
    <div v-if="bloqueado" class="alert alert-warning">
      La carga de grupos está bloqueada por el administrador.
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
          Cargar
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
                Grupo {{ g.letra }}
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
                  :disabled="bloqueado"
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
