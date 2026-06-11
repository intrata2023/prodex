<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { FRASES_IDOLOS } from '../lib/frasesIdolos.js'

const ROTATE_MS = 9000
const FADE_MS = 320

const idx = ref(0)
const visible = ref(true)
let timer = null
let fadeTimer = null

const frase = computed(() => FRASES_IDOLOS[idx.value])

function indiceAleatorio(excluir) {
  const total = FRASES_IDOLOS.length
  if (total <= 1) return 0
  let next = excluir
  while (next === excluir) {
    next = Math.floor(Math.random() * total)
  }
  return next
}

function siguiente() {
  visible.value = false
  clearTimeout(fadeTimer)
  fadeTimer = setTimeout(() => {
    idx.value = indiceAleatorio(idx.value)
    visible.value = true
  }, FADE_MS)
}

onMounted(() => {
  idx.value = indiceAleatorio(-1)
  timer = setInterval(siguiente, ROTATE_MS)
})

onBeforeUnmount(() => {
  clearInterval(timer)
  clearTimeout(fadeTimer)
})
</script>

<template>
  <aside class="home-idolo" aria-live="polite">
    <p class="home-idolo-kicker">Frase del vestuario</p>
    <div class="home-idolo-card" :class="{ 'is-fading': !visible }">
      <span class="home-idolo-flag" aria-hidden="true">
        <svg viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg" role="img">
          <title>Bandera de Argentina</title>
          <rect width="60" height="13.33" fill="#74ACDF" />
          <rect y="13.33" width="60" height="13.34" fill="#FFFFFF" />
          <rect y="26.67" width="60" height="13.33" fill="#74ACDF" />
          <circle cx="30" cy="20" r="5.25" fill="#F6B40E" />
          <g stroke="#F6B40E" stroke-width="1.15" stroke-linecap="round">
            <line x1="30" y1="12.2" x2="30" y2="14.4" />
            <line x1="30" y1="25.6" x2="30" y2="27.8" />
            <line x1="22.2" y1="20" x2="24.4" y2="20" />
            <line x1="35.6" y1="20" x2="37.8" y2="20" />
            <line x1="24.5" y1="14.5" x2="26" y2="16" />
            <line x1="34" y1="24" x2="35.5" y2="25.5" />
            <line x1="24.5" y1="25.5" x2="26" y2="24" />
            <line x1="34" y1="16" x2="35.5" y2="14.5" />
          </g>
        </svg>
      </span>
      <blockquote class="home-idolo-frase">«{{ frase }}»</blockquote>
    </div>
  </aside>
</template>
