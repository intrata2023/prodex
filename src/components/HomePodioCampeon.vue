<script setup>
import { ref, computed, watch } from 'vue'
import { supabase, supabaseConfigured } from '../lib/supabase.js'
import { fetchAllParticipantesPublic } from '../lib/dataLoaders.js'
import { getPodio, nombresPodio } from '../lib/premios.js'

const props = defineProps({
  campeonReal: { type: String, default: '' },
})

const loading = ref(false)
const ranking = ref([])

const podio = computed(() => getPodio(ranking.value))

const campeonLabel = computed(() => nombresPodio(podio.value.campeon))
const segundoLabel = computed(() => nombresPodio(podio.value.segundo))
const terceroLabel = computed(() => nombresPodio(podio.value.tercero))

const campeonPts = computed(() => podio.value.campeon[0]?.puntos_total)
const segundoPts = computed(() => podio.value.segundo[0]?.puntos_total)
const terceroPts = computed(() => podio.value.tercero[0]?.puntos_total)

const listo = computed(
  () => props.campeonReal && !loading.value && podio.value.campeon.length > 0
)

async function cargarRanking() {
  if (!props.campeonReal || !supabaseConfigured) {
    ranking.value = []
    return
  }
  loading.value = true
  try {
    ranking.value = await fetchAllParticipantesPublic(supabase)
  } catch (e) {
    console.error(e)
    ranking.value = []
  } finally {
    loading.value = false
  }
}

watch(() => props.campeonReal, cargarRanking, { immediate: true })
</script>

<template>
  <section v-if="campeonReal" class="home-podio" aria-labelledby="home-podio-title">
    <div v-if="loading" class="home-podio-loading">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Cargando podio…</span>
      </div>
    </div>

    <template v-else-if="listo">
      <p class="home-podio-mundial">
        Campeón del Mundial: <strong>{{ campeonReal }}</strong>
      </p>

      <div class="home-podio-campeon">
        <span class="home-podio-trophy" aria-hidden="true">🏆</span>
        <p id="home-podio-title" class="home-podio-kicker">¡Campeón del PRODEX!</p>
        <p class="home-podio-nombre home-podio-nombre--campeon">{{ campeonLabel }}</p>
        <p class="home-podio-pts">{{ campeonPts }} pts</p>
      </div>

      <div v-if="segundoLabel || terceroLabel" class="home-podio-rest">
        <div class="home-podio-subgrid">
          <template v-if="segundoLabel">
            <span class="home-podio-medalla" aria-hidden="true">🥈</span>
            <div class="home-podio-puesto-info">
              <p class="home-podio-puesto-label">2° puesto</p>
              <p class="home-podio-nombre">{{ segundoLabel }}</p>
              <p class="home-podio-pts home-podio-pts--sm">{{ segundoPts }} pts</p>
            </div>
          </template>
          <template v-if="terceroLabel">
            <span class="home-podio-medalla" aria-hidden="true">🥉</span>
            <div class="home-podio-puesto-info">
              <p class="home-podio-puesto-label">3° puesto</p>
              <p class="home-podio-nombre">{{ terceroLabel }}</p>
              <p class="home-podio-pts home-podio-pts--sm">{{ terceroPts }} pts</p>
            </div>
          </template>
        </div>
      </div>
    </template>
  </section>
</template>
