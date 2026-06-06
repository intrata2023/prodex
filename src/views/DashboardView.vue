<script setup>
import { onMounted, computed } from 'vue'
import AppLayout from '../components/AppLayout.vue'
import ScoringRules from '../components/ScoringRules.vue'
import { useSession } from '../composables/useSession.js'
import { useConfig } from '../composables/useConfig.js'

const { nombre } = useSession()
const { config, loadConfig } = useConfig()

onMounted(loadConfig)

const gruposBloqueado = computed(() => !config.value.grupos_abiertos)
const elimBloqueado = computed(() => !config.value.eliminatorias_abiertos)
</script>

<template>
  <AppLayout>
    <header class="home-hero">
      <p class="home-eyebrow">Mundial 2026</p>
      <h1 class="home-brand">PRODEX</h1>
      <p class="home-greeting">Hola, {{ nombre }}</p>
    </header>

    <div class="action-grid">
      <div class="action-card">
        <div class="action-card-top">
          <h2>Fase de grupos</h2>
          <span v-if="gruposBloqueado" class="badge bg-danger">Bloqueada</span>
          <span v-else class="badge bg-success">Abierta</span>
        </div>
        <router-link
          class="btn btn-primary w-100"
          :class="{ disabled: gruposBloqueado }"
          to="/grupos"
        >
          Cargar grupos
        </router-link>
      </div>

      <div class="action-card">
        <div class="action-card-top">
          <h2>Eliminatorias</h2>
          <span v-if="elimBloqueado" class="badge bg-danger">Bloqueada</span>
          <span v-else class="badge bg-success">Abierta</span>
        </div>
        <router-link
          class="btn btn-warning w-100"
          :class="{ disabled: elimBloqueado }"
          to="/eliminatorias"
        >
          Cargar eliminatorias
        </router-link>
      </div>

      <div class="action-card">
        <h2>Ranking</h2>
        <p>Ver posiciones y puntos.</p>
        <router-link class="btn btn-outline-primary w-100" to="/ranking">
          Ver ranking
        </router-link>
      </div>
    </div>

    <ScoringRules class="mt-4" />
  </AppLayout>
</template>

<style scoped>
.home-hero {
  text-align: center;
  margin-bottom: 1.75rem;
}

.home-eyebrow {
  margin: 0 0 0.375rem;
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--accent);
}

.home-brand {
  margin: 0;
  font-size: 2.5rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  line-height: 1;
}

.home-greeting {
  margin: 0.625rem 0 0;
  font-size: 0.9375rem;
  color: var(--text-muted);
}

.mt-4 {
  margin-top: 1.25rem;
}
</style>
