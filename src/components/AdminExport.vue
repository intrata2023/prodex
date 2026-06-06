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
    const filas = Object.entries(result.rows || {})
      .map(([tab, n]) => `${tab}: ${n}`)
      .join(' · ')
    mensaje.value = `Exportado OK. ${filas}`
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
      Volca Participantes, Partidos, Predicciones, Resultados, Ranking y Config a tu
      spreadsheet. Ideal como backup y para ver resultados en Excel.
    </p>

    <button class="btn btn-primary w-100 mb-2" :disabled="loading" @click="exportar">
      {{ loading ? 'Exportando…' : 'Exportar todo a Google Sheets' }}
    </button>

    <div v-if="mensaje" class="alert alert-secondary py-2">{{ mensaje }}</div>
    <p v-if="ultimo" class="text-muted small mb-0">Última exportación: {{ ultimo }}</p>

    <div class="panel-form mt-4">
      <p class="small text-muted mb-2"><strong>Setup (una vez):</strong></p>
      <ol class="small text-muted mb-0 ps-3">
        <li>Creá un Google Sheet y copiá el ID de la URL</li>
        <li>Service Account en Google Cloud + JSON key</li>
        <li>Compartí el sheet con el email del service account (Editor)</li>
        <li>Variables: <code>GOOGLE_SHEETS_ID</code>, <code>GOOGLE_SERVICE_ACCOUNT_JSON</code></li>
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
