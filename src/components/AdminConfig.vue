<script setup>
import { ref } from 'vue'
import { useConfig } from '../composables/useConfig.js'

const { config, loadConfig, updateConfig } = useConfig()
const campeonReal = ref('')
const mensaje = ref('')
const cargado = ref(false)

async function cargar() {
  await loadConfig()
  campeonReal.value = config.value.campeon_real || ''
  cargado.value = true
}

async function toggleGrupos() {
  await updateConfig({ grupos_abiertos: !config.value.grupos_abiertos })
  mensaje.value = 'Config actualizada'
}

async function toggleElim() {
  await updateConfig({ eliminatorias_abiertos: !config.value.eliminatorias_abiertos })
  mensaje.value = 'Config actualizada'
}

async function guardarCampeon() {
  await updateConfig({ campeon_real: campeonReal.value || null })
  mensaje.value = 'Campeón real guardado'
}
</script>

<template>
  <div>
    <h3 class="section-title">Control de etapas</h3>
    <p class="text-muted small mb-3">
      Nada se carga solo. Tocá «Actualizar» para ver el estado actual de la config.
    </p>

    <div class="mb-3">
      <button type="button" class="btn btn-outline-secondary w-100" @click="cargar">
        Actualizar config
      </button>
    </div>

    <div v-if="mensaje" class="alert alert-success py-2">{{ mensaje }}</div>

    <template v-if="cargado">
      <div class="d-flex flex-wrap gap-3 mb-4">
        <div class="form-check form-switch">
          <input
            class="form-check-input"
            type="checkbox"
            :checked="config.grupos_abiertos"
            @change="toggleGrupos"
            id="swGrupos"
          />
          <label class="form-check-label" for="swGrupos">Carga de grupos abierta</label>
        </div>
        <div class="form-check form-switch">
          <input
            class="form-check-input"
            type="checkbox"
            :checked="config.eliminatorias_abiertos"
            @change="toggleElim"
            id="swElim"
          />
          <label class="form-check-label" for="swElim">Carga de eliminatorias abierta</label>
        </div>
      </div>

      <div class="mb-3" style="max-width: 320px">
        <label class="form-label">Campeón real (para puntos final)</label>
        <input v-model="campeonReal" class="form-control" placeholder="Nombre del equipo" />
        <button class="btn btn-sm btn-primary mt-2" @click="guardarCampeon">Guardar campeón</button>
      </div>
    </template>
  </div>
</template>
