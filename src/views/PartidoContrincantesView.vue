<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppLayout from '../components/AppLayout.vue'
import { useSession } from '../composables/useSession.js'
import { useTeamCrests } from '../composables/useTeamCrests.js'
import { supabase, supabaseConfigured } from '../lib/supabase.js'
import { aciertoPrediccion } from '../lib/scoring.js'
import {
  fetchAllPartidos,
  fetchAllParticipantesPublic,
  fetchAllPredicciones,
  fetchAllResultados,
  mapResultadosPorPartido,
} from '../lib/dataLoaders.js'
import {
  formatHoraArgentina,
  formatoPrediccionDisplay,
  formatoResultadoDisplay,
  idsPartidoRelacionados,
  prediccionEnPartido,
} from '../lib/misPredicciones.js'

const route = useRoute()
const { participanteId } = useSession()
const { load, crestsForPartido, crestsLoaded } = useTeamCrests()

const partido = ref(null)
const participantes = ref([])
const predsPorParticipante = ref({})
const resultado = ref(null)
const loading = ref(true)
const error = ref('')

const partidoId = computed(() => route.params.id)

const crests = computed(() => {
  crestsLoaded.value
  return partido.value ? crestsForPartido(partido.value) : { local: null, visitante: null }
})

const filas = computed(() => {
  if (!partido.value) return []
  const ids = idsPartidoRelacionados(
    partido.value._todosPartidos || [],
    partido.value.id
  )

  return participantes.value.map((p, i) => {
    const pred = prediccionEnPartido(predsPorParticipante.value[p.id], ids)
    const acierto = pred ? aciertoPrediccion(pred, resultado.value, partido.value) : null
    const predFmt = pred ? formatoPrediccionDisplay(pred, partido.value) : null
    return {
      id: p.id,
      puesto: i + 1,
      nombre: p.nombre,
      esYo: p.id === participanteId.value,
      pred,
      predFmt,
      acierto,
      estado: acierto?.tipo ?? (pred ? 'pendiente' : 'sin'),
    }
  })
})

const conPrediccion = computed(() => filas.value.filter((f) => f.pred).length)

const tieneReal = computed(
  () => resultado.value?.goles_local != null && resultado.value?.goles_visitante != null
)

const realDisplay = computed(() =>
  partido.value ? formatoResultadoDisplay(resultado.value, partido.value) : null
)

const esEliminatoria = computed(() => partido.value?.fase !== 'grupos')

watch(partidoId, cargar)

onMounted(() => {
  load()
  cargar()
})

async function cargar() {
  loading.value = true
  error.value = ''
  if (!supabaseConfigured || !partidoId.value) {
    loading.value = false
    return
  }

  try {
    const [pts, parts, preds, res] = await Promise.all([
      fetchAllPartidos(supabase),
      fetchAllParticipantesPublic(supabase),
      fetchAllPredicciones(supabase),
      fetchAllResultados(supabase),
    ])

    const p = pts.find((x) => x.id === partidoId.value)
    if (!p) {
      error.value = 'No encontramos ese partido.'
      loading.value = false
      return
    }

    partido.value = { ...p, _todosPartidos: pts }
    participantes.value = parts
    resultado.value = mapResultadosPorPartido(res)[p.id] ?? null

    const porParticipante = {}
    for (const pr of preds) {
      if (!porParticipante[pr.participante_id]) porParticipante[pr.participante_id] = []
      porParticipante[pr.participante_id].push(pr)
    }
    predsPorParticipante.value = porParticipante
  } catch (e) {
    console.error(e)
    error.value = 'No se pudieron cargar las predicciones. Probá de nuevo.'
  } finally {
    loading.value = false
  }
}

function initial(nombre) {
  return (nombre || '?').charAt(0).toUpperCase()
}
</script>

<template>
  <AppLayout title="">
    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border text-primary" role="status" />
    </div>

    <p v-else-if="error" class="home-hoy-empty">
      {{ error }}
      <button type="button" class="home-hoy-retry" @click="cargar">Reintentar</button>
    </p>

    <div v-else-if="partido" class="pc">
      <router-link to="/dashboard" class="rd-back">← Inicio</router-link>

      <header class="pc-partido">
        <p v-if="partido.fecha" class="pc-hora">
          {{ formatHoraArgentina(partido.fecha) }} ART
          <span v-if="partido.grupo"> · Grupo {{ partido.grupo }}</span>
          <span v-else-if="partido.ronda"> · {{ partido.ronda }}</span>
        </p>
        <div class="pc-equipos">
          <div class="pc-equipo">
            <img
              v-if="crests.local"
              :src="crests.local"
              class="pc-crest"
              :alt="partido.equipo_local"
            />
            <span class="pc-nombre">{{ partido.equipo_local }}</span>
          </div>
          <div class="pc-marcador">
            <template v-if="tieneReal">
              <span class="pc-real">{{ realDisplay?.score }}</span>
              <span v-if="esEliminatoria && realDisplay?.penales" class="pc-pen-real">
                P {{ realDisplay.penales }}
              </span>
            </template>
            <span v-else class="pc-vs">vs</span>
          </div>
          <div class="pc-equipo pc-equipo--away">
            <span class="pc-nombre">{{ partido.equipo_visitante }}</span>
            <img
              v-if="crests.visitante"
              :src="crests.visitante"
              class="pc-crest"
              :alt="partido.equipo_visitante"
            />
          </div>
        </div>
      </header>

      <p class="pc-sub">
        {{ conPrediccion }} de {{ participantes.length }} cargaron · orden por ranking
      </p>

      <div class="pc-lista">
        <div
          v-for="f in filas"
          :key="f.id"
          class="pc-fila"
          :class="[
            `pc-fila--${f.estado}`,
            { 'pc-fila--yo': f.esYo },
          ]"
        >
          <span class="rivales-pos" :class="{ 'rivales-pos--podium': f.puesto <= 3 }">
            {{ f.puesto }}
          </span>
          <span class="rd-avatar">{{ initial(f.nombre) }}</span>
          <span class="pc-nombre-user">
            {{ f.nombre }}
            <span v-if="f.esYo" class="pc-yo">vos</span>
          </span>
          <span v-if="f.predFmt" class="pc-pred-col">
            <span class="pc-pred">{{ f.predFmt.score }}</span>
            <span
              v-if="esEliminatoria && f.predFmt.penales"
              class="pc-pen"
              :title="`Pasa por penales: ${f.predFmt.penales}`"
            >
              P {{ f.predFmt.penales }}
            </span>
          </span>
          <span v-else class="pc-pred pc-pred--sin">—</span>
          <span
            v-if="f.acierto"
            class="mp-pts"
            :class="`mp-pts--${f.estado}`"
          >
            {{ f.acierto.pts > 0 ? `+${f.acierto.pts}` : '0' }}
          </span>
          <span v-else-if="f.pred" class="mp-pts mp-pts--pendiente">—</span>
          <span v-else class="mp-pts mp-pts--sin"> </span>
        </div>
      </div>
    </div>
  </AppLayout>
</template>
