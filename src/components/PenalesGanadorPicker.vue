<script setup>
import { equiposEquivalentes } from '../lib/teamCrestAliases.js'

defineProps({
  partido: { type: Object, required: true },
  modelValue: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  crests: { type: Object, default: () => ({ local: null, visitante: null }) },
})

const emit = defineEmits(['update:modelValue'])

function elegir(equipo) {
  emit('update:modelValue', equipo)
}
</script>

<template>
  <div class="penales-picker">
    <p class="penales-picker-title">Empate a los 120 min — ¿quién pasa por penales?</p>
    <div class="penales-picker-options">
      <button
        type="button"
        class="penales-picker-btn"
        :class="{ 'penales-picker-btn--active': equiposEquivalentes(modelValue, partido.equipo_local) }"
        :disabled="disabled"
        @click="elegir(partido.equipo_local)"
      >
        <img
          v-if="crests.local"
          :src="crests.local"
          class="penales-picker-crest"
          :alt="partido.equipo_local"
        />
        <span class="penales-picker-team">{{ partido.equipo_local }}</span>
        <span v-if="equiposEquivalentes(modelValue, partido.equipo_local)" class="penales-picker-p">P</span>
      </button>

      <button
        type="button"
        class="penales-picker-btn"
        :class="{ 'penales-picker-btn--active': equiposEquivalentes(modelValue, partido.equipo_visitante) }"
        :disabled="disabled"
        @click="elegir(partido.equipo_visitante)"
      >
        <img
          v-if="crests.visitante"
          :src="crests.visitante"
          class="penales-picker-crest"
          :alt="partido.equipo_visitante"
        />
        <span class="penales-picker-team">{{ partido.equipo_visitante }}</span>
        <span v-if="equiposEquivalentes(modelValue, partido.equipo_visitante)" class="penales-picker-p">P</span>
      </button>
    </div>
  </div>
</template>
