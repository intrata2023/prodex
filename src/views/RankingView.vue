<script setup>
import { ref, onMounted } from 'vue'
import AppLayout from '../components/AppLayout.vue'
import RankingTable from '../components/RankingTable.vue'
import { supabase, supabaseConfigured } from '../lib/supabase.js'
import { fetchAllParticipantesPublic } from '../lib/dataLoaders.js'

const rows = ref([])
const loading = ref(true)
const error = ref('')

onMounted(cargar)

async function cargar() {
  loading.value = true
  error.value = ''
  if (!supabaseConfigured) {
    loading.value = false
    return
  }

  try {
    const data = await fetchAllParticipantesPublic(supabase)
    rows.value = data.map((p, i) => ({ ...p, puesto: i + 1 }))
  } catch (e) {
    console.error(e)
    error.value = 'No se pudo cargar la tabla. Probá de nuevo.'
    rows.value = []
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <AppLayout title="Tabla">
    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border text-primary"></div>
    </div>

    <div v-else-if="error" class="alert alert-warning">
      {{ error }}
      <button type="button" class="btn btn-sm btn-outline-light ms-2" @click="cargar">
        Reintentar
      </button>
    </div>

    <div v-else class="panel-card">
      <RankingTable :rows="rows" show-desglose />
    </div>
  </AppLayout>
</template>
