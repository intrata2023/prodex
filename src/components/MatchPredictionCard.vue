<script setup>
import { ref, watch, computed, onMounted } from 'vue'
import { useTeamCrests } from '../composables/useTeamCrests.js'

const props = defineProps({
  partido: { type: Object, required: true },
  prediccion: { type: Object, default: null },
  readonly: { type: Boolean, default: false },
  showPenales: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
})

const emit = defineEmits(['save'])
const { load, crestsForPartido, crestsLoaded } = useTeamCrests()

const golesLocal = ref(null)
const golesVisitante = ref(null)
const penales = ref(false)
const status = ref('idle')
let debounceTimer = null

const crests = computed(() => {
  crestsLoaded.value
  return crestsForPartido(props.partido)
})

onMounted(load)

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
  <div class="match-card" :class="{ 'match-card--disabled': disabled }">
    <div v-if="partido.grupo" class="match-meta">Grupo {{ partido.grupo }}</div>

    <div class="match-row">
      <div class="match-side match-side--local">
        <img
          v-if="crests.local"
          :src="crests.local"
          class="match-crest"
          :alt="partido.equipo_local"
          loading="lazy"
        />
        <div v-else class="match-crest match-crest--placeholder" aria-hidden="true" />
        <span class="match-name">{{ partido.equipo_local }}</span>
      </div>

      <div class="match-center">
        <div class="match-score-row">
          <input
            type="number"
            min="0"
            max="20"
            inputmode="numeric"
            class="form-control match-score-input"
            v-model.number="golesLocal"
            :disabled="readonly || disabled"
            :aria-label="`Goles ${partido.equipo_local}`"
          />
          <span class="match-separator">-</span>
          <input
            type="number"
            min="0"
            max="20"
            inputmode="numeric"
            class="form-control match-score-input"
            v-model.number="golesVisitante"
            :disabled="readonly || disabled"
            :aria-label="`Goles ${partido.equipo_visitante}`"
          />
        </div>
      </div>

      <div class="match-side match-side--away">
        <img
          v-if="crests.visitante"
          :src="crests.visitante"
          class="match-crest"
          :alt="partido.equipo_visitante"
          loading="lazy"
        />
        <div v-else class="match-crest match-crest--placeholder" aria-hidden="true" />
        <span class="match-name">{{ partido.equipo_visitante }}</span>
      </div>
    </div>

    <div v-if="showPenales" class="match-penales">
      <label class="match-penales-label">
        <input
          class="form-check-input"
          type="checkbox"
          v-model="penales"
          :disabled="readonly || disabled"
        />
        Pasa por penales
      </label>
    </div>

    <div v-if="!readonly && status !== 'idle'" class="match-status">
      <small class="match-status--saving" v-if="status === 'saving'">Guardando…</small>
      <small class="match-status--saved" v-if="status === 'saved'">Guardado</small>
    </div>
  </div>
</template>
