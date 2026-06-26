<script setup>
import { computed, watch } from 'vue'

const props = defineProps({
  modelValue: { type: Object, required: true },
  equiposIzq: { type: Array, default: () => [] },
  equiposDer: { type: Array, default: () => [] },
  disabled: { type: Boolean, default: false },
  cuadroListo: { type: Boolean, default: false },
  cerrado: { type: Boolean, default: false },
  cierreLabel: { type: String, default: '' },
})

const emit = defineEmits(['update:modelValue', 'save'])

const campeon = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const opcionesCampeon = computed(() => {
  const opts = []
  if (campeon.value.finalista_1) opts.push(campeon.value.finalista_1)
  if (campeon.value.finalista_2 && campeon.value.finalista_2 !== campeon.value.finalista_1) {
    opts.push(campeon.value.finalista_2)
  }
  return opts
})

const bloqueado = computed(() => props.disabled || !props.cuadroListo || props.cerrado)

watch(
  () => [campeon.value.finalista_1, campeon.value.finalista_2],
  () => {
    const { equipo, finalista_1, finalista_2 } = campeon.value
    if (!equipo) return
    if (equipo !== finalista_1 && equipo !== finalista_2) {
      campeon.value = { ...campeon.value, equipo: '' }
      emit('save')
    }
  }
)

function onChange() {
  emit('save')
}
</script>

<template>
  <div id="finalistas-campeon" class="panel-card panel-card--highlight finalistas-panel">
    <div class="panel-card-header">Finalistas y campeón</div>
    <div class="panel-card-body">
      <p v-if="!cuadroListo" class="finalistas-aviso">
        Se habilita cuando los 16 cruces de 16avos tengan equipos definidos.
      </p>
      <p v-else-if="cerrado" class="finalistas-aviso finalistas-aviso--cerrado">
        Carga cerrada: faltaba menos de 1 hora para el primer partido de eliminatorias
        <template v-if="cierreLabel"> ({{ cierreLabel }})</template>.
      </p>
      <p v-else class="finalistas-aviso finalistas-aviso--ok">
        Elegí un finalista de cada mitad del cuadro y el campeón. Las listas muestran solo los
        equipos de esa mitad en los 16avos (8 partidos por lado), según el cuadro cargado.
        Se bloquea 1 h antes del primer cruce.
      </p>

      <div class="stack-form">
        <div>
          <label class="form-label">Finalista 1 — mitad izquierda</label>
          <select
            v-model="campeon.finalista_1"
            class="form-select"
            :disabled="bloqueado"
            @change="onChange"
          >
            <option value="">Elegir...</option>
            <option v-for="e in equiposIzq" :key="e" :value="e">{{ e }}</option>
          </select>
        </div>
        <div>
          <label class="form-label">Finalista 2 — mitad derecha</label>
          <select
            v-model="campeon.finalista_2"
            class="form-select"
            :disabled="bloqueado"
            @change="onChange"
          >
            <option value="">Elegir...</option>
            <option v-for="e in equiposDer" :key="e" :value="e">{{ e }}</option>
          </select>
        </div>
        <div>
          <label class="form-label">Campeón</label>
          <select
            v-model="campeon.equipo"
            class="form-select"
            :disabled="bloqueado || opcionesCampeon.length === 0"
            @change="onChange"
          >
            <option value="">Elegir...</option>
            <option v-for="e in opcionesCampeon" :key="e" :value="e">{{ e }}</option>
          </select>
          <p v-if="cuadroListo && !cerrado && opcionesCampeon.length === 0" class="finalistas-hint">
            Primero elegí los dos finalistas.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
