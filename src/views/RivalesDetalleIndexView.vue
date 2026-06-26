<script setup>
import { ref, onMounted } from 'vue'
import AppLayout from '../components/AppLayout.vue'
import { useSession } from '../composables/useSession.js'
import { supabase, supabaseConfigured } from '../lib/supabase.js'
import { fetchAllParticipantesPublic } from '../lib/dataLoaders.js'

const { participanteId } = useSession()
const rivales = ref([])
const loading = ref(true)
const error = ref('')

function initial(nombre) {
  return (nombre || '?').charAt(0).toUpperCase()
}

onMounted(cargar)

async function cargar() {
  loading.value = true
  error.value = ''
  if (!supabaseConfigured) {
    loading.value = false
    return
  }

  try {
    const participantes = await fetchAllParticipantesPublic(supabase)
    rivales.value = participantes
      .map((p, i) => ({ ...p, puesto: i + 1 }))
      .filter((p) => p.id !== participanteId.value)
  } catch (e) {
    console.error(e)
    error.value = 'No se pudieron cargar los contrincantes. Probá de nuevo.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <AppLayout title="Contrincantes">
    <router-link to="/rivales" class="rd-back">← Vista rápida</router-link>

    <p class="rd-index-intro">
      Elegí un rival para ver todas sus predicciones, aciertos y puntos por etapa.
    </p>

    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border text-primary" role="status" />
    </div>

    <p v-else-if="error" class="home-hoy-empty">
      {{ error }}
      <button type="button" class="home-hoy-retry" @click="cargar">Reintentar</button>
    </p>

    <p v-else-if="!supabaseConfigured" class="home-hoy-empty">
      Configurá Supabase para ver a tus contrincantes.
    </p>

    <p v-else-if="rivales.length === 0" class="home-hoy-empty">
      No hay otros participantes en la tabla todavía.
    </p>

    <div v-else class="rd-index-list">
      <router-link
        v-for="rival in rivales"
        :key="rival.id"
        :to="`/rivales/detalle/${rival.id}`"
        class="rd-index-row"
      >
        <span class="rivales-pos" :class="{ 'rivales-pos--podium': rival.puesto <= 3 }">
          {{ rival.puesto }}
        </span>
        <span class="rd-avatar">{{ initial(rival.nombre) }}</span>
        <span class="rd-index-info">
          <span class="rivales-nombre">{{ rival.nombre }}</span>
          <span class="rd-index-meta">{{ rival.puntos_total }} pts totales</span>
        </span>
        <span class="rivales-link-arrow" aria-hidden="true">›</span>
      </router-link>
    </div>
  </AppLayout>
</template>
