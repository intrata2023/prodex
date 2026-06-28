<script setup>
import { computed, onMounted } from 'vue'
import { useTeamCrests } from '../composables/useTeamCrests.js'
import { sortPartidosCuadro } from '../lib/fifaBracket2026.js'
import { isPlaceholderEquipo } from '../lib/eliminatorias.js'

const RONDAS = [
  { fase: 'r32', label: '16avos', slots: 16 },
  { fase: 'r16', label: 'Octavos', slots: 8 },
  { fase: 'qf', label: 'Cuartos', slots: 4 },
  { fase: 'sf', label: 'Semis', slots: 2 },
  { fase: 'final', label: 'Final', slots: 1 },
]

const COL_W = 106
const GAP_W = 30
const SLOT_H = 48
const SPACING = SLOT_H + 8
const TITLE_H = 26
const PAD = 10

const props = defineProps({
  partidos: { type: Array, default: () => [] },
  resultados: { type: Object, default: () => ({}) },
})

const { load, crestsForPartido, crestsLoaded } = useTeamCrests()

onMounted(load)

const tercerPuesto = computed(() =>
  props.partidos.find((p) => p.ronda?.toLowerCase().includes('tercer'))
)

function placeholderPartido(fase, idx) {
  return {
    id: `ph-${fase}-${idx}`,
    fase,
    equipo_local: 'Por definir',
    equipo_visitante: 'Por definir',
    orden: idx,
  }
}

function centerY(roundIdx, matchIdx) {
  const roundSpan = Math.pow(2, roundIdx) * SPACING
  const roundOffset = ((Math.pow(2, roundIdx) - 1) * SPACING) / 2
  return TITLE_H + PAD + SLOT_H / 2 + matchIdx * roundSpan + roundOffset
}

function slotTop(roundIdx, matchIdx) {
  return centerY(roundIdx, matchIdx) - SLOT_H / 2
}

function slotLeft(roundIdx) {
  return PAD + roundIdx * (COL_W + GAP_W)
}

const columnas = computed(() => {
  crestsLoaded.value
  return RONDAS.map((r, roundIdx) => {
    const realMatches = sortPartidosCuadro(
      props.partidos.filter(
        (p) => p.fase === r.fase && !p.ronda?.toLowerCase().includes('tercer')
      ),
      r.fase
    )

    const matches = Array.from({ length: r.slots }, (_, matchIdx) => {
      const partido = realMatches[matchIdx] || placeholderPartido(r.fase, matchIdx)
      return {
        partido,
        crests: crestsForPartido(partido),
        resultado: props.resultados[partido.id] ?? null,
        matchIdx,
        roundIdx,
        isPlaceholder: !realMatches[matchIdx],
        top: slotTop(roundIdx, matchIdx),
        left: slotLeft(roundIdx),
      }
    })

    return { ...r, matches, roundIdx }
  })
})

const boardSize = computed(() => {
  const w = PAD * 2 + RONDAS.length * COL_W + (RONDAS.length - 1) * GAP_W
  const h = centerY(0, 15) + SLOT_H / 2 + PAD
  return { w, h }
})

const connectorPaths = computed(() => {
  const paths = []
  for (let r = 0; r < RONDAS.length - 1; r++) {
    const slots = RONDAS[r].slots
    const xOut = slotLeft(r) + COL_W
    const xMid = xOut + GAP_W / 2
    const xNext = slotLeft(r + 1)

    for (let i = 0; i < slots; i += 2) {
      const y1 = centerY(r, i)
      const y2 = centerY(r, i + 1)
      const yTarget = centerY(r + 1, i / 2)

      paths.push(`M ${xOut} ${y1} H ${xMid}`)
      paths.push(`M ${xOut} ${y2} H ${xMid}`)
      paths.push(`M ${xMid} ${y1} V ${y2}`)
      paths.push(`M ${xMid} ${yTarget} H ${xNext}`)
    }
  }
  return paths
})

function realScore(resultado, side) {
  if (!resultado) return null
  const v = side === 'local' ? resultado.goles_local : resultado.goles_visitante
  return v != null ? v : null
}

function pasaPorPenales(resultado, partido, side) {
  if (!resultado?.definido_penales || !resultado.ganador_penales) return false
  const equipo = side === 'local' ? partido.equipo_local : partido.equipo_visitante
  return resultado.ganador_penales === equipo
}

function isPlaceholder(name) {
  return isPlaceholderEquipo(name)
}

function shortName(name) {
  if (!name) return '—'
  if (isPlaceholder(name)) return 'TBD'
  if (name.length <= 12) return name
  return name.slice(0, 10) + '…'
}
</script>

<template>
  <div class="bracket-wrap">
    <p class="bracket-hint">Deslizá horizontal y vertical para ver todo el cuadro</p>

    <div class="bracket-scroll">
      <div
        class="bracket-canvas"
        :style="{ width: `${boardSize.w}px`, height: `${boardSize.h}px` }"
      >
        <svg
          class="bracket-svg"
          :width="boardSize.w"
          :height="boardSize.h"
          aria-hidden="true"
        >
          <path
            v-for="(d, i) in connectorPaths"
            :key="i"
            :d="d"
            class="bracket-path"
          />
        </svg>

        <div
          v-for="col in columnas"
          :key="`title-${col.fase}`"
          class="bracket-round-label"
          :class="{ 'bracket-round-label--final': col.fase === 'final' }"
          :style="{ left: `${slotLeft(col.roundIdx)}px`, width: `${COL_W}px` }"
        >
          <span v-if="col.fase === 'final'" class="bracket-trophy">🏆</span>
          {{ col.label }}
        </div>

        <div
          v-for="col in columnas"
          :key="col.fase"
        >
          <article
            v-for="item in col.matches"
            :key="item.partido.id"
            class="bracket-match"
            :class="{
              'bracket-match--empty': item.isPlaceholder,
              'bracket-match--final': col.fase === 'final',
            }"
            :style="{ top: `${item.top}px`, left: `${item.left}px`, width: `${COL_W}px`, height: `${SLOT_H}px` }"
          >
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
              <span v-if="realScore(item.resultado, 'local') != null" class="bracket-score">
                {{ realScore(item.resultado, 'local') }}
              </span>
              <span
                v-if="pasaPorPenales(item.resultado, item.partido, 'local')"
                class="bracket-pen"
                title="Pasa por penales"
              >
                P
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
              <span v-if="realScore(item.resultado, 'visitante') != null" class="bracket-score">
                {{ realScore(item.resultado, 'visitante') }}
              </span>
              <span
                v-if="pasaPorPenales(item.resultado, item.partido, 'visitante')"
                class="bracket-pen"
                title="Pasa por penales"
              >
                P
              </span>
            </div>
          </article>
        </div>
      </div>
    </div>

    <div class="bracket-third">
      <span class="bracket-third-label">3er puesto</span>
      <span v-if="tercerPuesto" class="bracket-third-match">
        {{ shortName(tercerPuesto.equipo_local) }} vs
        {{ shortName(tercerPuesto.equipo_visitante) }}
      </span>
      <span v-else class="bracket-third-match bracket-third-match--tbd">Por definir</span>
    </div>
  </div>
</template>
