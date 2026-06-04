<script setup>
import { ref, onMounted } from 'vue'
import AppLayout from '../components/AppLayout.vue'
import RankingTable from '../components/RankingTable.vue'
import { supabase, supabaseConfigured } from '../lib/supabase.js'
import { calcularPremios, formatARS } from '../lib/premios.js'
import { useConfig } from '../composables/useConfig.js'

const { config, loadConfig } = useConfig()
const rows = ref([])
const pozoTotal = ref(0)

onMounted(async () => {
  await loadConfig()
  await cargar()
})

async function cargar() {
  if (!supabaseConfigured) return
  const { data } = await supabase
    .from('participantes')
    .select('id, nombre, puntos_total, desglose')
    .eq('activo', true)
    .order('puntos_total', { ascending: false })

  const participantes = data || []
  const conPremios = calcularPremios(participantes, config.value.monto_por_persona)
  rows.value = conPremios
  pozoTotal.value = participantes.length * config.value.monto_por_persona
}
</script>

<template>
  <AppLayout title="Ranking">
    <div class="alert alert-info mb-4">
      Pozo total: <strong>{{ formatARS(pozoTotal) }}</strong>
      (${{ config.monto_por_persona?.toLocaleString('es-AR') }} por participante)
    </div>
    <RankingTable :rows="rows" show-premios show-desglose />
    <div class="card mt-4">
      <div class="card-body small text-muted">
        <strong>Distribución:</strong> 1° 70% · 2° 20% · 3° 10%.
        Empate en 1° entre 2: 45% c/u. Empate 3+ en 1°: 100% dividido.
      </div>
    </div>
  </AppLayout>
</template>
