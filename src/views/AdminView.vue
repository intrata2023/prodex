<script setup>
import { ref } from 'vue'
import AppLayout from '../components/AppLayout.vue'
import RankingTable from '../components/RankingTable.vue'
import AdminParticipants from '../components/AdminParticipants.vue'
import AdminProgress from '../components/AdminProgress.vue'
import AdminConfig from '../components/AdminConfig.vue'
import AdminMatches from '../components/AdminMatches.vue'
import AdminResultsUpdater from '../components/AdminResultsUpdater.vue'
import AdminPredictionsView from '../components/AdminPredictionsView.vue'
import AdminExport from '../components/AdminExport.vue'
import { supabase, supabaseConfigured } from '../lib/supabase.js'
import { fetchAllParticipantesPublic } from '../lib/dataLoaders.js'

const tab = ref('config')
const ranking = ref([])
const rankingCargado = ref(false)

async function cargarRanking() {
  if (!supabaseConfigured) return
  const data = await fetchAllParticipantesPublic(supabase)
  ranking.value = data.map((p, i) => ({ ...p, puesto: i + 1 }))
  rankingCargado.value = true
}

function onTabChange(t) {
  tab.value = t
}
</script>

<template>
  <AppLayout title="Admin">
    <div class="admin-tabs">
      <button
        v-for="t in [
          { id: 'config', label: 'Etapas' },
          { id: 'participantes', label: 'Participantes' },
          { id: 'progreso', label: 'Progreso' },
          { id: 'partidos', label: 'Partidos' },
          { id: 'resultados', label: 'Resultados' },
          { id: 'predicciones', label: 'Predicciones' },
          { id: 'ranking', label: 'Ranking' },
          { id: 'sheets', label: 'Sheets' },
        ]"
        :key="t.id"
        class="admin-tab"
        :class="{ active: tab === t.id }"
        @click="onTabChange(t.id)"
      >
        {{ t.label }}
      </button>
    </div>

    <div class="panel-card" v-show="tab === 'config'">
      <div class="panel-card-body"><AdminConfig /></div>
    </div>
    <div class="panel-card" v-show="tab === 'participantes'">
      <div class="panel-card-body"><AdminParticipants /></div>
    </div>
    <div class="panel-card" v-show="tab === 'progreso'">
      <div class="panel-card-body"><AdminProgress /></div>
    </div>
    <div class="panel-card" v-show="tab === 'partidos'">
      <div class="panel-card-body"><AdminMatches /></div>
    </div>
    <div class="panel-card" v-if="tab === 'resultados'">
      <div class="panel-card-body"><AdminResultsUpdater /></div>
    </div>
    <div class="panel-card" v-show="tab === 'predicciones'">
      <div class="panel-card-body"><AdminPredictionsView /></div>
    </div>

    <div class="panel-card" v-show="tab === 'ranking'">
      <div class="panel-card-body">
        <p class="text-muted small mb-3">
          Nada se carga solo. Tocá «Actualizar ranking» para ver la tabla con desglose.
        </p>
        <button type="button" class="btn btn-outline-secondary w-100 mb-3" @click="cargarRanking">
          Actualizar ranking
        </button>
        <RankingTable v-if="rankingCargado" :rows="ranking" show-desglose />
      </div>
    </div>
    <div class="panel-card" v-show="tab === 'sheets'">
      <div class="panel-card-body"><AdminExport /></div>
    </div>
  </AppLayout>
</template>
