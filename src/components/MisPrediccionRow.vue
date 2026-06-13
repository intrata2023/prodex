<script setup>
import { computed, onMounted } from 'vue'
import { useTeamCrests } from '../composables/useTeamCrests.js'
import { aciertoPrediccion } from '../lib/scoring.js'
import { formatHoraArgentina } from '../lib/misPredicciones.js'

const props = defineProps({
  partido: { type: Object, required: true },
  prediccion: { type: Object, default: null },
  resultado: { type: Object, default: null },
})

const { load, crestsForPartido, crestsLoaded } = useTeamCrests()

const crests = computed(() => {
  crestsLoaded.value
  return crestsForPartido(props.partido)
})

const acierto = computed(() =>
  aciertoPrediccion(props.prediccion, props.resultado, props.partido)
)

const tieneReal = computed(
  () =>
    props.resultado?.goles_local != null && props.resultado?.goles_visitante != null
)

const meta = computed(() => {
  if (props.partido.grupo) return `G.${props.partido.grupo}`
  const r = props.partido.ronda || ''
  if (r.includes('Octavos')) return '8vos'
  if (r.includes('Cuartos')) return '4tos'
  if (r.includes('Semi')) return 'Semi'
  if (r.includes('Final')) return 'Final'
  if (r.includes('16avos')) return '16av'
  return r.slice(0, 5)
})

const estado = computed(() => acierto.value?.tipo ?? 'pendiente')

const hora = computed(() => formatHoraArgentina(props.partido.fecha))

onMounted(load)
</script>

<template>
  <div class="mp-row" :class="`mp-row--${estado}`">
    <div class="mp-slot">
      <span class="mp-hora" :title="hora ? 'Hora Argentina (ART)' : undefined">
        {{ hora || '—' }}
      </span>
      <span v-if="meta" class="mp-meta" :title="partido.ronda || `Grupo ${partido.grupo}`">
        {{ meta }}
      </span>
    </div>

    <div class="mp-side mp-side--local">
      <img
        v-if="crests.local"
        :src="crests.local"
        class="mp-crest"
        :alt="partido.equipo_local"
        loading="lazy"
      />
      <span v-else class="mp-crest mp-crest--empty" aria-hidden="true" />
      <span class="mp-team" :title="partido.equipo_local">{{ partido.equipo_local }}</span>
    </div>

    <div class="mp-center">
      <span class="mp-pred">
        {{ prediccion.goles_local }}–{{ prediccion.goles_visitante }}
      </span>
      <span v-if="tieneReal" class="mp-real">
        R {{ resultado.goles_local }}–{{ resultado.goles_visitante }}
      </span>
    </div>

    <div class="mp-side mp-side--away">
      <span class="mp-team" :title="partido.equipo_visitante">{{ partido.equipo_visitante }}</span>
      <img
        v-if="crests.visitante"
        :src="crests.visitante"
        class="mp-crest"
        :alt="partido.equipo_visitante"
        loading="lazy"
      />
      <span v-else class="mp-crest mp-crest--empty" aria-hidden="true" />
    </div>

    <span v-if="acierto" class="mp-pts" :class="`mp-pts--${estado}`">
      {{ acierto.pts > 0 ? `+${acierto.pts}` : '0' }}
    </span>
    <span v-else class="mp-pts mp-pts--pendiente">—</span>
  </div>
</template>
