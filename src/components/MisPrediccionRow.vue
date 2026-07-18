<script setup>
import { computed, onMounted } from 'vue'
import { useTeamCrests } from '../composables/useTeamCrests.js'
import { aciertoPrediccion } from '../lib/scoring.js'
import { formatHoraArgentina, formatoPrediccionDisplay, formatoResultadoDisplay } from '../lib/misPredicciones.js'
import PartidoRivalesLink from './PartidoRivalesLink.vue'

const props = defineProps({
  partido: { type: Object, required: true },
  prediccion: { type: Object, default: null },
  resultado: { type: Object, default: null },
  showContrincantesLink: { type: Boolean, default: false },
  mensajePrediccionOculta: { type: String, default: '' },
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
  if (r.includes('3er') || r.toLowerCase().includes('tercer')) return '3er'
  if (r.includes('Final')) return 'Final'
  if (r.includes('16avos')) return '16av'
  return r.slice(0, 5)
})

const estado = computed(() => acierto.value?.tipo ?? 'pendiente')

const hora = computed(() => formatHoraArgentina(props.partido.fecha))

const predDisplay = computed(() => formatoPrediccionDisplay(props.prediccion, props.partido))

const realDisplay = computed(() => formatoResultadoDisplay(props.resultado, props.partido))

const esEliminatoria = computed(() => props.partido.fase !== 'grupos')

const prediccionOculta = computed(
  () => Boolean(props.mensajePrediccionOculta && props.prediccion)
)

onMounted(load)
</script>

<template>
  <div class="mp-wrap">
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
      <span v-if="prediccionOculta" class="mp-pred-oculta">{{ mensajePrediccionOculta }}</span>
      <template v-else>
        <span v-if="predDisplay" class="mp-pred">{{ predDisplay.score }}</span>
        <span v-else class="mp-pred mp-pred--sin">Sin cargar</span>
        <span
          v-if="esEliminatoria && predDisplay?.penales"
          class="mp-pen"
          :title="`Pasa por penales: ${predDisplay.penales}`"
        >
          P {{ predDisplay.penales }}
        </span>
        <span v-if="tieneReal" class="mp-real">
          R {{ realDisplay?.score ?? `${resultado.goles_local}–${resultado.goles_visitante}` }}
          <template v-if="realDisplay?.penales">
            · P {{ realDisplay.penales }}
          </template>
        </span>
      </template>
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

    <span v-if="prediccionOculta" class="mp-pts mp-pts--pendiente">—</span>
    <span v-else-if="acierto" class="mp-pts" :class="`mp-pts--${estado}`">
      {{ acierto.pts > 0 ? `+${acierto.pts}` : '0' }}
    </span>
    <span v-else class="mp-pts mp-pts--pendiente">—</span>
    </div>
    <PartidoRivalesLink
      v-if="showContrincantesLink"
      :partido-id="partido.id"
      class="mp-contrincantes-link"
    />
  </div>
</template>
