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

async function cargarRanking() {
  if (!supabaseConfigured) return
  const data = await fetchAllParticipantesPublic(supabase)
  ranking.value = data.map((p, i) => ({ ...p, puesto: i + 1 }))
}

function onTabChange(t) {
  tab.value = t
  if (t === 'ranking') cargarRanking()
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
    <div class="panel-card" v-show="tab === 'resultados'">
      <div class="panel-card-body"><AdminResultsUpdater /></div>
    </div>
    <div class="panel-card" v-show="tab === 'predicciones'">
      <div class="panel-card-body"><AdminPredictionsView /></div>
    </div>

    <div class="panel-card" v-show="tab === 'ranking'">
      <div class="panel-card-body">
        <RankingTable :rows="ranking" show-desglose />
      </div>
    </div>
    <div class="panel-card" v-show="tab === 'sheets'">
      <div class="panel-card-body"><AdminExport /></div>
    </div>
  </AppLayout>
</template>
