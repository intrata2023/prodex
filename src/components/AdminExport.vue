<script setup>
import { ref } from 'vue'
import { gatherExportData, pushToGoogleSheets } from '../lib/gatherExportData.js'

const loading = ref(false)
const mensaje = ref('')
const ultimo = ref(null)

async function exportar() {
  loading.value = true
  mensaje.value = ''
  try {
    const data = await gatherExportData()
    const result = await pushToGoogleSheets(data)
    ultimo.value = new Date().toLocaleString('es-AR')
    const filas = ['Predicciones', 'Participantes', 'Posiciones']
      .filter((tab) => result.rows?.[tab] != null)
      .map((tab) => `${tab}: ${result.rows[tab]}`)
      .join(' · ')
    const completos = result.participantesCompletos
      ? ` · ${result.participantesCompletos} al 100%`
      : ''
    mensaje.value = `Exportado OK. ${filas}${completos}`
  } catch (e) {
    mensaje.value = e.message
  }
  loading.value = false
}

defineExpose({ exportar })
</script>

<template>
  <div>
    <h3 class="section-title">Google Sheets</h3>
    <p class="text-muted small mb-3">
      Solo quienes completaron los 72 partidos de grupos. Tres hojas:
      <strong>Predicciones</strong>, <strong>Participantes</strong> y
      <strong>Posiciones</strong> (ranking en vivo según resultados reales).
      Cada exportación actualiza las 3 hojas: si alguien nuevo completa al 100%, se agrega;
      el ranking se recalcula al momento.
    </p>

    <button class="btn btn-primary w-100 mb-2" :disabled="loading" @click="exportar">
      {{ loading ? 'Exportando…' : 'Exportar a Google Sheets' }}
    </button>

    <div v-if="mensaje" class="alert alert-secondary py-2">{{ mensaje }}</div>
    <p v-if="ultimo" class="text-muted small mb-0">Última exportación: {{ ultimo }}</p>

    <div class="panel-form mt-4">
      <p class="small text-muted mb-2"><strong>Setup (una vez):</strong></p>
      <ol class="small text-muted mb-0 ps-3">
        <li>Creá un Google Sheet y copiá el ID de la URL</li>
        <li>Service Account en Google Cloud + JSON key</li>
        <li>Compartí el sheet con el email del service account (Editor)</li>
        <li>
          Variables en Vercel: <code>GOOGLE_SHEETS_ID</code> +
          <code>GOOGLE_CLIENT_EMAIL</code> + <code>GOOGLE_PRIVATE_KEY</code>
          (recomendado; la clave con saltos de línea)
        </li>
        <li>
          Alternativa: un solo <code>GOOGLE_SERVICE_ACCOUNT_JSON</code> (JSON en una línea o base64)
        </li>
        <li>Opcional: <code>EXPORT_SECRET</code> y <code>VITE_EXPORT_SECRET</code></li>
      </ol>
    </div>
  </div>
</template>

<style scoped>
code {
  font-size: 0.75rem;
  color: var(--accent);
}
</style>
