<script setup>
import { onMounted, computed } from 'vue'
import AppLayout from '../components/AppLayout.vue'
import HomeResumenHoy from '../components/HomeResumenHoy.vue'
import ScoringRules from '../components/ScoringRules.vue'
import { useSession } from '../composables/useSession.js'
import { useConfig } from '../composables/useConfig.js'

const { nombre } = useSession()
const { config, loadConfig } = useConfig()

const gruposBloqueado = computed(() => !config.value.grupos_abiertos)
const elimBloqueado = computed(() => !config.value.eliminatorias_abiertos)

const etapasAbiertas = computed(() => {
  let n = 0
  if (!gruposBloqueado.value) n++
  if (!elimBloqueado.value) n++
  return n
})

onMounted(loadConfig)
</script>

<template>
  <AppLayout>
    <header class="home-hero">
      <div class="home-hero-glow" aria-hidden="true" />
      <p class="home-eyebrow">Mundial 2026</p>
      <h1 class="home-brand">PRODEX</h1>
      <p class="home-greeting">
        Hola, <strong>{{ nombre }}</strong>
      </p>
    </header>

    <HomeResumenHoy />

    <p class="home-section-label">Menú</p>

    <div class="home-tiles">
      <router-link to="/mis-predicciones" class="home-tile">
        <span class="home-tile-icon" aria-hidden="true">◎</span>
        <span class="home-tile-label">Ver mis predicciones</span>
        <span class="home-tile-arrow" aria-hidden="true">›</span>
      </router-link>

      <router-link
        to="/grupos"
        class="home-tile"
        :class="{ 'home-tile--muted': gruposBloqueado }"
      >
        <span class="home-tile-icon" aria-hidden="true">⚽</span>
        <span class="home-tile-label">Fase de grupos</span>
        <span v-if="gruposBloqueado" class="home-tile-status">Solo lectura</span>
        <span class="home-tile-arrow" aria-hidden="true">›</span>
      </router-link>

      <component
        :is="elimBloqueado ? 'div' : 'router-link'"
        :to="elimBloqueado ? undefined : '/eliminatorias'"
        class="home-tile"
        :class="{ 'home-tile--muted home-tile--locked': elimBloqueado }"
      >
        <span class="home-tile-icon" aria-hidden="true">🏆</span>
        <span class="home-tile-label">Eliminatorias</span>
        <span v-if="elimBloqueado" class="home-tile-status">Bloqueada</span>
        <span v-if="!elimBloqueado" class="home-tile-arrow" aria-hidden="true">›</span>
      </component>

      <router-link to="/ranking" class="home-tile">
        <span class="home-tile-icon" aria-hidden="true">≡</span>
        <span class="home-tile-label">Tabla</span>
        <span class="home-tile-arrow" aria-hidden="true">›</span>
      </router-link>
    </div>

    <p class="home-hint">
      Podés ir viendo tus predicciones a medida que se cargan los resultados.
      <template v-if="etapasAbiertas === 0">
        Las cargas están cerradas; en Grupos podés revisar lo que ya cargaste.
      </template>
    </p>

    <ScoringRules class="home-rules" />
  </AppLayout>
</template>
