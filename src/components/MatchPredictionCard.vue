<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  partido: { type: Object, required: true },
  prediccion: { type: Object, default: null },
  readonly: { type: Boolean, default: false },
  showPenales: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
})

const emit = defineEmits(['save'])

const golesLocal = ref(null)
const golesVisitante = ref(null)
const penales = ref(false)
const status = ref('idle')
let debounceTimer = null

function syncFromPred() {
  if (props.prediccion) {
    golesLocal.value = props.prediccion.goles_local
    golesVisitante.value = props.prediccion.goles_visitante
    penales.value = props.prediccion.penales ?? false
  }
}

syncFromPred()
watch(() => props.prediccion, syncFromPred, { deep: true })

function scheduleSave() {
  if (props.readonly || props.disabled) return
  status.value = 'saving'
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    emit('save', {
      partido_id: props.partido.id,
      goles_local: golesLocal.value === '' ? null : Number(golesLocal.value),
      goles_visitante: golesVisitante.value === '' ? null : Number(golesVisitante.value),
      penales: penales.value,
    })
    status.value = 'saved'
    setTimeout(() => {
      if (status.value === 'saved') status.value = 'idle'
    }, 2000)
  }, 400)
}

watch([golesLocal, golesVisitante, penales], scheduleSave)
</script>

<template>
  <div class="card mb-2 shadow-sm" :class="{ 'opacity-50': disabled }">
    <div class="card-body py-2">
      <div class="row align-items-center g-2">
        <div class="col-4 text-end fw-semibold text-truncate" :title="partido.equipo_local">
          {{ partido.equipo_local }}
        </div>
        <div class="col-4">
          <div class="d-flex align-items-center justify-content-center gap-1">
            <input
              type="number"
              min="0"
              max="20"
              class="form-control form-control-sm text-center"
              style="width: 3rem"
              v-model.number="golesLocal"
              :disabled="readonly || disabled"
            />
            <span class="text-muted">-</span>
            <input
              type="number"
              min="0"
              max="20"
              class="form-control form-control-sm text-center"
              style="width: 3rem"
              v-model.number="golesVisitante"
              :disabled="readonly || disabled"
            />
          </div>
        </div>
        <div class="col-4 fw-semibold text-truncate" :title="partido.equipo_visitante">
          {{ partido.equipo_visitante }}
        </div>
      </div>
      <div v-if="showPenales" class="mt-2 text-center">
        <div class="form-check form-check-inline">
          <input
            class="form-check-input"
            type="checkbox"
            id="penales"
            v-model="penales"
            :disabled="readonly || disabled"
          />
          <label class="form-check-label" for="penales">
            Pasa por penales (P)
          </label>
        </div>
      </div>
      <div v-if="!readonly && status !== 'idle'" class="text-center mt-1">
        <small class="text-muted" v-if="status === 'saving'">Guardando...</small>
        <small class="text-success" v-if="status === 'saved'">Guardado</small>
      </div>
      <div v-if="partido.grupo" class="text-center">
        <small class="text-muted">Grupo {{ partido.grupo }}</small>
      </div>
    </div>
  </div>
</template>
