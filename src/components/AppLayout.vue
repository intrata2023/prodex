<script setup>
import { useSession } from '../composables/useSession.js'
import { useRouter } from 'vue-router'

defineProps({
  title: { type: String, default: 'Prode Mundial 2026' },
})

const { isAdmin, isParticipant, nombre, logout } = useSession()
const router = useRouter()

function salir() {
  logout()
  router.push('/')
}
</script>

<template>
  <div class="min-vh-100 bg-light">
    <nav class="navbar navbar-expand-lg navbar-dark bg-primary">
      <div class="container">
        <router-link class="navbar-brand fw-bold" to="/dashboard">Prode 2026</router-link>
        <button
          class="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#nav"
        >
          <span class="navbar-toggler-icon"></span>
        </button>
        <div id="nav" class="collapse navbar-collapse">
          <ul class="navbar-nav me-auto" v-if="isParticipant">
            <li class="nav-item">
              <router-link class="nav-link" to="/dashboard">Inicio</router-link>
            </li>
            <li class="nav-item">
              <router-link class="nav-link" to="/grupos">Grupos</router-link>
            </li>
            <li class="nav-item">
              <router-link class="nav-link" to="/eliminatorias">Eliminatorias</router-link>
            </li>
            <li class="nav-item">
              <router-link class="nav-link" to="/ranking">Ranking</router-link>
            </li>
          </ul>
          <ul class="navbar-nav me-auto" v-if="isAdmin">
            <li class="nav-item">
              <router-link class="nav-link" to="/admin">Admin</router-link>
            </li>
          </ul>
          <span class="navbar-text text-white me-3" v-if="nombre">Hola, {{ nombre }}</span>
          <button class="btn btn-outline-light btn-sm" @click="salir">Salir</button>
        </div>
      </div>
    </nav>
    <main class="container py-4">
      <h1 v-if="title" class="h3 mb-4">{{ title }}</h1>
      <slot />
    </main>
  </div>
</template>
