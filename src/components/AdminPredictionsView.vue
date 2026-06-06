<script setup>
import { ref, onMounted } from 'vue'
import { supabase, supabaseConfigured } from '../lib/supabase.js'
import MatchPredictionCard from './MatchPredictionCard.vue'

const participantes = ref([])
const seleccionado = ref('')
const partidos = ref([])
const predicciones = ref({})
const campeon = ref(null)

async function cargarParticipantes() {
  const { data } = await supabase.from('participantes_list').select('id, nombre').eq('activo', true).order('nombre')
  participantes.value = data || []
}

async function verPredicciones() {
  if (!seleccionado.value) return
  const { data: pts } = await supabase.from('partidos').select('*').order('orden')
  partidos.value = pts || []
  const { data: preds } = await supabase
    .from('predicciones')
    .select('*')
    .eq('participante_id', seleccionado.value)
  predicciones.value = Object.fromEntries((preds || []).map((p) => [p.partido_id, p]))
  const { data: camp } = await supabase
    .from('prediccion_campeon')
    .select('*')
    .eq('participante_id', seleccionado.value)
    .maybeSingle()
  campeon.value = camp
}

onMounted(cargarParticipantes)
</script>

<template>
  <div>
    <h3 class="section-title">Ver predicciones</h3>
    <div class="stack-form mb-3">
      <select v-model="seleccionado" class="form-select" @change="verPredicciones">
          <option value="">Elegir participante...</option>
          <option v-for="p in participantes" :key="p.id" :value="p.id">{{ p.nombre }}</option>
        </select>
    </div>

    <div v-if="campeon" class="alert alert-warning mb-3">
      <strong>Finalistas:</strong> {{ campeon.finalista_1 || '?' }} vs
      {{ campeon.finalista_2 || '?' }} —
      <strong>Campeón:</strong> {{ campeon.equipo || '?' }}
    </div>

    <MatchPredictionCard
      v-for="p in partidos"
      :key="p.id"
      :partido="p"
      :prediccion="predicciones[p.id]"
      :show-penales="p.fase !== 'grupos'"
      readonly
    />
  </div>
</template>
