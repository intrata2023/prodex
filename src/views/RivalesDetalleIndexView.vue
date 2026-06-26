<script setup>
import { ref, onMounted, computed } from 'vue'
import AppLayout from '../components/AppLayout.vue'
import { useSession } from '../composables/useSession.js'
import { supabase, supabaseConfigured } from '../lib/supabase.js'
import { fetchAllParticipantesPublic } from '../lib/dataLoaders.js'

const { participanteId } = useSession()
const participantes = ref([])
const loading = ref(true)
const error = ref('')

function initial(nombre) {
  return (nombre || '?').charAt(0).toUpperCase()
}

function esYo(id) {
  return id === participanteId.value
}

const lista = computed(() =>
  participantes.value.map((p, i) => ({ ...p, puesto: i + 1, esYo: esYo(p.id) }))
)

onMounted(cargar)

async function cargar() {
  loading.value = true
  error.value = ''
  if (!supabaseConfigured) {
    loading.value = false
    return
  }

  try {
    participantes.value = await fetchAllParticipantesPublic(supabase)
  } catch (e) {
    console.error(e)
    error.value = 'No se pudieron cargar los participantes. Probá de nuevo.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <AppLayout title="Contrincantes">
    <router-link to="/rivales" class="rd-back">← Vista rápida</router-link>

    <p class="rd-index-intro">
      Elegí un participante para ver todas sus predicciones, aciertos y puntos por etapa. También
      podés ver las tuyas.
    </p>

    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border text-primary" role="status" />
    </div>

    <p v-else-if="error" class="home-hoy-empty">
      {{ error }}
      <button type="button" class="home-hoy-retry" @click="cargar">Reintentar</button>
    </p>

    <p v-else-if="!supabaseConfigured" class="home-hoy-empty">
      Configurá Supabase para ver las predicciones.
    </p>

    <p v-else-if="lista.length === 0" class="home-hoy-empty">
      No hay participantes en la tabla todavía.
    </p>

    <div v-else class="rd-index-list">
      <router-link
        v-for="p in lista"
        :key="p.id"
        :to="`/rivales/detalle/${p.id}`"
        class="rd-index-row"
        :class="{ 'rd-index-row--yo': p.esYo }"
      >
        <span class="rivales-pos" :class="{ 'rivales-pos--podium': p.puesto <= 3 }">
          {{ p.puesto }}
        </span>
        <span class="rd-avatar">{{ initial(p.nombre) }}</span>
        <span class="rd-index-info">
          <span class="rivales-nombre">
            {{ p.nombre }}
            <span v-if="p.esYo" class="pc-yo">vos</span>
          </span>
          <span class="rd-index-meta">{{ p.puntos_total }} pts totales</span>
        </span>
        <span class="rivales-link-arrow" aria-hidden="true">›</span>
      </router-link>
    </div>
  </AppLayout>
</template>
