<script setup>
import { useSession } from '../composables/useSession.js'
import { useRouter } from 'vue-router'

defineProps({
  title: { type: String, default: '' },
})

const { isAdmin, isParticipant, logout } = useSession()
const router = useRouter()

function salir() {
  logout()
  router.push('/')
}
</script>

<template>
  <div class="app-shell" :class="{ 'app-shell--no-nav': !isParticipant }">
    <div class="app-bg" aria-hidden="true"></div>

    <header class="app-topbar">
      <router-link class="app-brand" to="/dashboard">
        <span class="app-brand-eyebrow">Mundial 2026</span>
        <span class="app-brand-name">PRODEX</span>
      </router-link>
      <button class="app-logout" @click="salir">Salir</button>
    </header>

    <main class="app-main">
      <h1 v-if="title" class="app-title">{{ title }}</h1>
      <slot />
    </main>

    <nav v-if="isParticipant" class="app-bottom-nav" aria-label="Navegación principal">
      <router-link class="app-bottom-link" to="/dashboard">
        <span class="app-bottom-icon" aria-hidden="true">⌂</span>
        Inicio
      </router-link>
      <router-link class="app-bottom-link" to="/grupos">
        <span class="app-bottom-icon" aria-hidden="true">⚽</span>
        Grupos
      </router-link>
      <router-link class="app-bottom-link" to="/eliminatorias">
        <span class="app-bottom-icon" aria-hidden="true">🏆</span>
        Elim.
      </router-link>
      <router-link class="app-bottom-link" to="/ranking">
        <span class="app-bottom-icon" aria-hidden="true">📊</span>
        Ranking
      </router-link>
    </nav>
  </div>
</template>
