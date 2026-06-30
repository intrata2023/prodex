<script setup>
import { ref, watch, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useTeamCrests } from '../composables/useTeamCrests.js'
import { aciertoPrediccion } from '../lib/scoring.js'
import { resolverEquipoEnPartido } from '../lib/teamCrestAliases.js'
import PenalesGanadorPicker from './PenalesGanadorPicker.vue'

const props = defineProps({
  partido: { type: Object, required: true },
  prediccion: { type: Object, default: null },
  resultado: { type: Object, default: null },
  readonly: { type: Boolean, default: false },
  showPenales: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  lockMessage: { type: String, default: '' },
})

const emit = defineEmits(['save'])
const { load, crestsForPartido, crestsLoaded } = useTeamCrests()

const golesLocal = ref('')
const golesVisitante = ref('')
const ganadorPenales = ref('')
const status = ref('idle')
let debounceTimer = null
let skipSave = true

const crests = computed(() => {
  crestsLoaded.value
  return crestsForPartido(props.partido)
})

const acierto = computed(() =>
  aciertoPrediccion(props.prediccion, props.resultado, props.partido)
)

const tieneResultadoReal = computed(
  () =>
    props.resultado?.goles_local != null && props.resultado?.goles_visitante != null
)

const esEmpate = computed(() => {
  const gl = parseGoles(golesLocal.value)
  const gv = parseGoles(golesVisitante.value)
  return gl != null && gv != null && gl === gv
})

const faltaGanadorPenales = computed(
  () => props.showPenales && esEmpate.value && !ganadorPenales.value && !props.readonly
)

onMounted(load)

function formatGoles(val) {
  return val != null && val !== '' ? String(val) : ''
}

function parseGoles(val) {
  if (val === '' || val == null) return null
  const n = Number(val)
  if (!Number.isInteger(n) || n < 0 || n > 20) return null
  return n
}

function onScoreInput(field, event) {
  const raw = event.target.value.replace(/\D/g, '').slice(0, 2)
  if (field === 'local') golesLocal.value = raw
  else golesVisitante.value = raw
}

async function syncFromPred() {
  skipSave = true
  if (props.prediccion) {
    golesLocal.value = formatGoles(props.prediccion.goles_local)
    golesVisitante.value = formatGoles(props.prediccion.goles_visitante)
    ganadorPenales.value = props.prediccion.ganador_penales
      ? resolverEquipoEnPartido(props.prediccion.ganador_penales, props.partido)
      : ''
  } else {
    golesLocal.value = ''
    golesVisitante.value = ''
    ganadorPenales.value = ''
  }
  await nextTick()
  skipSave = false
}

syncFromPred()
watch(() => props.prediccion, syncFromPred, { deep: true })

watch(esEmpate, (empate) => {
  if (!empate && ganadorPenales.value) {
    ganadorPenales.value = ''
  }
})

function buildPayload() {
  const gl = parseGoles(golesLocal.value)
  const gv = parseGoles(golesVisitante.value)
  const empate = gl != null && gv != null && gl === gv
  return {
    partido_id: props.partido.id,
    goles_local: gl,
    goles_visitante: gv,
    penales: empate && Boolean(ganadorPenales.value),
    ganador_penales:
      empate && ganadorPenales.value
        ? resolverEquipoEnPartido(ganadorPenales.value, props.partido)
        : null,
  }
}

function shouldPersist(payload) {
  const { goles_local: gl, goles_visitante: gv } = payload
  return (gl == null && gv == null) || (gl != null && gv != null)
}

function flushSave() {
  if (skipSave || props.readonly || props.disabled) return
  const payload = buildPayload()
  if (!shouldPersist(payload)) return
  clearTimeout(debounceTimer)
  emit('save', payload)
  status.value = 'saved'
  setTimeout(() => {
    if (status.value === 'saved') status.value = 'idle'
  }, 2000)
}

function scheduleSave() {
  if (skipSave || props.readonly || props.disabled) return
  const payload = buildPayload()
  if (!shouldPersist(payload)) {
    clearTimeout(debounceTimer)
    status.value = 'idle'
    return
  }
  status.value = 'saving'
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(flushSave, 400)
}

watch([golesLocal, golesVisitante, ganadorPenales], scheduleSave)
onBeforeUnmount(flushSave)
</script>

<template>
  <div
    class="match-card"
    :class="{
      'match-card--disabled': disabled,
      'match-card--exacto': acierto?.tipo === 'exacto',
      'match-card--ganador': acierto?.tipo === 'ganador',
      'match-card--fallo': acierto?.tipo === 'fallo',
    }"
  >
    <div v-if="partido.grupo" class="match-meta">Grupo {{ partido.grupo }}</div>
    <div v-else-if="partido.ronda" class="match-meta">{{ partido.ronda }}</div>

    <p v-if="lockMessage" class="match-lock-msg">{{ lockMessage }}</p>

    <p v-if="showPenales && !readonly" class="match-penales-label match-penales-label--120">
      Marcador a los 120 min (incluye alargue).
    </p>

    <div class="match-row">
      <div class="match-side match-side--local">
        <span v-if="crests.local" class="match-crest-wrap">
          <img
            :src="crests.local"
            class="match-crest-img"
            :alt="partido.equipo_local"
            loading="lazy"
          />
        </span>
        <span v-else class="match-crest-wrap match-crest-wrap--placeholder" aria-hidden="true" />
        <span class="match-name">{{ partido.equipo_local }}</span>
      </div>

      <div class="match-center">
        <div class="match-score-row">
          <input
            type="text"
            inputmode="numeric"
            autocomplete="off"
            autocorrect="off"
            spellcheck="false"
            maxlength="2"
            class="form-control match-score-input"
            :value="golesLocal"
            :disabled="readonly || disabled"
            :aria-label="`Goles ${partido.equipo_local}`"
            placeholder="–"
            @input="onScoreInput('local', $event)"
          />
          <span class="match-separator">-</span>
          <input
            type="text"
            inputmode="numeric"
            autocomplete="off"
            autocorrect="off"
            spellcheck="false"
            maxlength="2"
            class="form-control match-score-input"
            :value="golesVisitante"
            :disabled="readonly || disabled"
            :aria-label="`Goles ${partido.equipo_visitante}`"
            placeholder="–"
            @input="onScoreInput('visitante', $event)"
          />
        </div>
      </div>

      <div class="match-side match-side--away">
        <span v-if="crests.visitante" class="match-crest-wrap">
          <img
            :src="crests.visitante"
            class="match-crest-img"
            :alt="partido.equipo_visitante"
            loading="lazy"
          />
        </span>
        <span v-else class="match-crest-wrap match-crest-wrap--placeholder" aria-hidden="true" />
        <span class="match-name">{{ partido.equipo_visitante }}</span>
      </div>
    </div>

    <PenalesGanadorPicker
      v-if="showPenales && esEmpate"
      v-model="ganadorPenales"
      :partido="partido"
      :crests="crests"
      :disabled="readonly || disabled"
    />

    <p v-if="faltaGanadorPenales" class="match-penales-hint">
      Elegí quién pasa por penales para completar la predicción.
    </p>

    <div v-if="tieneResultadoReal" class="match-resultado">
      <span class="match-resultado-real">
        Real: {{ resultado.goles_local }} – {{ resultado.goles_visitante }}
        <template v-if="resultado.definido_penales && resultado.ganador_penales">
          · P: {{ resultado.ganador_penales }}
        </template>
      </span>
      <span
        v-if="acierto"
        class="match-acierto-badge"
        :class="`match-acierto-badge--${acierto.tipo}`"
      >
        {{ acierto.label }} · {{ acierto.pts > 0 ? `+${acierto.pts} pts` : '0 pts' }}
      </span>
    </div>

    <div v-if="!readonly && status !== 'idle'" class="match-status">
      <small class="match-status--saving" v-if="status === 'saving'">Guardando…</small>
      <small class="match-status--saved" v-if="status === 'saved'">Guardado</small>
    </div>
  </div>
</template>
