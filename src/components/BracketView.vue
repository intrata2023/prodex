<script setup>
import { computed, onMounted } from 'vue'
import { useTeamCrests } from '../composables/useTeamCrests.js'

const RONDAS = [
  { fase: 'r32', label: '16avos', short: 'R32' },
  { fase: 'r16', label: 'Octavos', short: 'R16' },
  { fase: 'qf', label: 'Cuartos', short: 'QF' },
  { fase: 'sf', label: 'Semis', short: 'SF' },
  { fase: 'final', label: 'Final', short: 'F' },
]

const props = defineProps({
  partidos: { type: Array, default: () => [] },
  predicciones: { type: Object, default: () => ({}) },
})

const { load, crestsForPartido, crestsLoaded } = useTeamCrests()

onMounted(load)

const tercerPuesto = computed(() =>
  props.partidos.find((p) => p.ronda?.includes('Tercer'))
)

const columnas = computed(() => {
  crestsLoaded.value
  return RONDAS.map((r, roundIdx) => {
    const matches = props.partidos
      .filter((p) => p.fase === r.fase && !p.ronda?.includes('Tercer'))
      .sort((a, b) => a.orden - b.orden)
      .map((partido, matchIdx) => ({
        partido,
        crests: crestsForPartido(partido),
        pred: props.predicciones[partido.id],
        marginTop: slotMargin(roundIdx, matchIdx),
      }))
    return { ...r, matches, roundIdx }
  }).filter((c) => c.matches.length > 0)
})

function slotMargin(roundIdx, matchIdx) {
  const unit = Math.pow(2, roundIdx) * 2.75
  if (matchIdx === 0) return `${unit * 0.35}rem`
  return `${unit}rem`
}

function score(pred, side) {
  if (!pred) return null
  const v = side === 'local' ? pred.goles_local : pred.goles_visitante
  return v != null ? v : null
}

function isPlaceholder(name) {
  return name?.includes('Por definir') || name?.includes('Local') || name?.includes('Visitante')
}

function shortName(name) {
  if (!name) return '—'
  if (isPlaceholder(name)) return 'TBD'
  if (name.length <= 14) return name
  return name.slice(0, 12) + '…'
}
</script>

<template>
  <div class="bracket-wrap">
    <p class="bracket-hint">Deslizá horizontalmente para ver el cuadro completo.</p>

    <div v-if="columnas.length === 0" class="empty-state">
      Todavía no hay partidos de eliminatorias cargados.
    </div>

    <div v-else class="bracket-scroll">
      <div class="bracket-board">
        <div
          v-for="col in columnas"
          :key="col.fase"
          class="bracket-column"
          :data-round="col.roundIdx"
        >
          <div class="bracket-col-title">{{ col.label }}</div>
          <div
            v-for="item in col.matches"
            :key="item.partido.id"
            class="bracket-slot"
            :style="{ marginTop: item.marginTop }"
          >
            <div class="bracket-node">
              <div
                class="bracket-team"
                :class="{ 'bracket-team--tbd': isPlaceholder(item.partido.equipo_local) }"
              >
                <img
                  v-if="item.crests.local"
                  :src="item.crests.local"
                  class="bracket-crest"
                  alt=""
                />
                <span v-else class="bracket-crest bracket-crest--ph" />
                <span class="bracket-team-name">{{ shortName(item.partido.equipo_local) }}</span>
                <span v-if="score(item.pred, 'local') != null" class="bracket-score">
                  {{ score(item.pred, 'local') }}
                </span>
              </div>
              <div
                class="bracket-team"
                :class="{ 'bracket-team--tbd': isPlaceholder(item.partido.equipo_visitante) }"
              >
                <img
                  v-if="item.crests.visitante"
                  :src="item.crests.visitante"
                  class="bracket-crest"
                  alt=""
                />
                <span v-else class="bracket-crest bracket-crest--ph" />
                <span class="bracket-team-name">{{
                  shortName(item.partido.equipo_visitante)
                }}</span>
                <span v-if="score(item.pred, 'visitante') != null" class="bracket-score">
                  {{ score(item.pred, 'visitante') }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="tercerPuesto" class="bracket-third">
      <span class="bracket-third-label">3er puesto</span>
      <span class="bracket-third-match">
        {{ shortName(tercerPuesto.equipo_local) }} vs
        {{ shortName(tercerPuesto.equipo_visitante) }}
      </span>
    </div>
  </div>
</template>
