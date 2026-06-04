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
import { supabase, supabaseConfigured } from '../lib/supabase.js'

const tab = ref('config')
const ranking = ref([])

async function cargarRanking() {
  if (!supabaseConfigured) return
  const { data } = await supabase
    .from('participantes')
    .select('id, nombre, puntos_total, desglose')
    .order('puntos_total', { ascending: false })
  ranking.value = (data || []).map((p, i) => ({ ...p, puesto: i + 1 }))
}

function onTabChange(t) {
  tab.value = t
  if (t === 'ranking') cargarRanking()
}
</script>

<template>
  <AppLayout title="Panel Admin">
    <ul class="nav nav-pills flex-wrap mb-4 gap-1">
      <li class="nav-item" v-for="t in [
        { id: 'config', label: 'Etapas' },
        { id: 'participantes', label: 'Participantes' },
        { id: 'progreso', label: 'Progreso' },
        { id: 'partidos', label: 'Partidos' },
        { id: 'resultados', label: 'Resultados' },
        { id: 'predicciones', label: 'Predicciones' },
        { id: 'ranking', label: 'Ranking' },
      ]" :key="t.id">
        <button
          class="nav-link"
          :class="{ active: tab === t.id }"
          @click="onTabChange(t.id)"
        >
          {{ t.label }}
        </button>
      </li>
    </ul>

    <AdminConfig v-show="tab === 'config'" />
    <AdminParticipants v-show="tab === 'participantes'" />
    <AdminProgress v-show="tab === 'progreso'" />
    <AdminMatches v-show="tab === 'partidos'" />
    <AdminResultsUpdater v-show="tab === 'resultados'" />
    <AdminPredictionsView v-show="tab === 'predicciones'" />

    <div v-show="tab === 'ranking'">
      <RankingTable :rows="ranking" show-desglose />
    </div>
  </AppLayout>
</template>
