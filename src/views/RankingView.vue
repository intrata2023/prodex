<script setup>
import { ref, onMounted } from 'vue'
import AppLayout from '../components/AppLayout.vue'
import RankingTable from '../components/RankingTable.vue'
import { supabase, supabaseConfigured } from '../lib/supabase.js'

const rows = ref([])

onMounted(cargar)

async function cargar() {
  if (!supabaseConfigured) return
  const { data } = await supabase
    .from('participantes')
    .select('id, nombre, puntos_total, desglose')
    .eq('activo', true)
    .order('puntos_total', { ascending: false })

  rows.value = (data || []).map((p, i) => ({ ...p, puesto: i + 1 }))
}
</script>

<template>
  <AppLayout title="Ranking">
    <div class="panel-card">
      <RankingTable :rows="rows" show-desglose />
    </div>
  </AppLayout>
</template>
