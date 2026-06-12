<script setup>
import { onMounted, computed } from 'vue'
import AppLayout from '../components/AppLayout.vue'
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

    <p class="home-section-label">Tus predicciones</p>

    <div class="home-tiles">
      <router-link
        to="/grupos"
        class="home-tile home-tile--grupos"
        :class="{ 'home-tile--readonly': gruposBloqueado }"
      >
        <span class="home-tile-icon" aria-hidden="true">⚽</span>
        <div class="home-tile-body">
          <div class="home-tile-top">
            <h2>Fase de grupos</h2>
            <span class="home-tile-badge" :class="gruposBloqueado ? 'is-locked' : 'is-open'">
              {{ gruposBloqueado ? 'Solo lectura' : 'Abierta' }}
            </span>
          </div>
          <p class="home-tile-desc">
            {{
              gruposBloqueado
                ? 'Revisá tus predicciones de los 12 grupos.'
                : 'Cargá los resultados de los 12 grupos.'
            }}
          </p>
        </div>
        <span class="home-tile-arrow" aria-hidden="true">›</span>
      </router-link>

      <component
        :is="elimBloqueado ? 'div' : 'router-link'"
        :to="elimBloqueado ? undefined : '/eliminatorias'"
        class="home-tile home-tile--elim"
        :class="{ 'home-tile--locked': elimBloqueado }"
      >
        <span class="home-tile-icon" aria-hidden="true">🏆</span>
        <div class="home-tile-body">
          <div class="home-tile-top">
            <h2>Eliminatorias</h2>
            <span class="home-tile-badge" :class="elimBloqueado ? 'is-locked' : 'is-open'">
              {{ elimBloqueado ? 'Bloqueada' : 'Abierta' }}
            </span>
          </div>
          <p class="home-tile-desc">Octavos, cuartos, semis y la final.</p>
        </div>
        <span v-if="!elimBloqueado" class="home-tile-arrow" aria-hidden="true">›</span>
      </component>

      <router-link class="home-tile home-tile--ranking" to="/ranking">
        <span class="home-tile-icon" aria-hidden="true">📊</span>
        <div class="home-tile-body">
          <div class="home-tile-top">
            <h2>Ranking</h2>
            <span class="home-tile-badge is-neutral">En vivo</span>
          </div>
          <p class="home-tile-desc">Posiciones, puntos y desglose.</p>
        </div>
        <span class="home-tile-arrow" aria-hidden="true">›</span>
      </router-link>
    </div>

    <p v-if="etapasAbiertas === 0" class="home-hint">
      Las cargas están cerradas. Podés entrar a Grupos para ver lo que ya cargaste.
    </p>

    <ScoringRules class="home-rules" />
  </AppLayout>
</template>
