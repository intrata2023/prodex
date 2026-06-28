<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { RouterLink } from 'vue-router'
import MisPrediccionRow from './MisPrediccionRow.vue'
import { useSession } from '../composables/useSession.js'
import { useConfig } from '../composables/useConfig.js'
import { usePrediccionContrincanteVisibilidad } from '../composables/usePrediccionContrincanteVisibilidad.js'
import { supabase, supabaseConfigured } from '../lib/supabase.js'
import {
  linkVerTodosContrincantes,
  campeonEdicionCerrada,
} from '../lib/eliminatorias.js'
import { mapPrediccionesACanonica, statusCampeon } from '../lib/participantProgress.js'
import {
  fetchAllPartidos,
  fetchAllParticipantesPublic,
  fetchAllPredicciones,
  fetchAllResultados,
  fetchPrediccionesParticipante,
  mapResultadosPorPartido,
} from '../lib/dataLoaders.js'
import {
  claveArgentinaOffset,
  formatFechaDiaTitulo,
  labelDiaRelativo,
  partidosConPrediccion,
  partidosDelDia,
  partidosListadoPredicciones,
  resumenCargaDia,
  resumenPuntosDia,
  etiquetaPartidoPendiente,
} from '../lib/misPredicciones.js'

const { participanteId } = useSession()
const { config, loadConfig } = useConfig()
const {
  iniciar: iniciarVisibilidad,
  detener: detenerVisibilidad,
  mensajePrediccionOculta,
  filtrarPrediccionesVisibles,
} = usePrediccionContrincanteVisibilidad()

const partidos = ref([])
const predicciones = ref({})
const resultados = ref({})
const rivales = ref([])
const prediccionesPorRival = ref({})
const campeonPred = ref(null)
const loading = ref(true)
const error = ref('')
const offsetDias = ref(0)
const expandido = ref(null)
const ahora = ref(Date.now())
let relojTimer = null

const claveDia = computed(() => claveArgentinaOffset(offsetDias.value))
const etiquetaCorta = computed(() => labelDiaRelativo(offsetDias.value))
const tituloDia = computed(() =>
  formatFechaDiaTitulo(claveDia.value, { fecha: `${claveDia.value}T12:00:00` })
)

const partidosLista = computed(() => partidosListadoPredicciones(partidos.value))

const partidosDelDiaTodos = computed(() =>
  partidosDelDia(partidosLista.value, claveDia.value)
)

const partidosDelDiaActivo = computed(() =>
  partidosDelDia(partidosConPrediccion(partidosLista.value, predicciones.value), claveDia.value)
)

const cargaDia = computed(() =>
  resumenCargaDia(partidosDelDiaTodos.value, predicciones.value, {
    gruposAbiertos: config.value.grupos_abiertos,
    eliminatoriasAbiertos: config.value.eliminatorias_abiertos,
    ahora: ahora.value,
  })
)

const campeonStatus = computed(() => statusCampeon(campeonPred.value))

const campeonBloqueado = computed(
  () =>
    !config.value.eliminatorias_abiertos ||
    campeonEdicionCerrada(partidos.value, ahora.value)
)

const etiquetaDiaCarga = computed(() => {
  const rel = labelDiaRelativo(offsetDias.value)
  if (rel) return rel.toLowerCase()
  return 'este día'
})

const linkCargaPendiente = computed(() => {
  const pend = cargaDia.value.partidosPendientes
  if (!pend.length) return null
  const tieneGrupos = pend.some((p) => p.fase === 'grupos')
  const tieneElim = pend.some((p) => p.fase !== 'grupos')
  if (tieneGrupos && !tieneElim) return { to: '/grupos', label: 'Ir a grupos' }
  if (tieneElim && !tieneGrupos) return { to: '/eliminatorias', label: 'Ir a eliminatorias' }
  return { to: '/grupos', label: 'Ir a cargar predicciones' }
})

const resumenDia = computed(() =>
  resumenPuntosDia(partidosDelDiaActivo.value, predicciones.value, resultados.value)
)

function etiquetaPartido(partido) {
  return etiquetaPartidoPendiente(partido, predicciones.value)
}

function linkContrincantes(partido) {
  return linkVerTodosContrincantes(partido)
}

function initial(nombre) {
  return (nombre || '?').charAt(0).toUpperCase()
}

function prediccionesRival(id) {
  return prediccionesPorRival.value[id] || {}
}

function partidosDelRival(id) {
  return partidosDelDia(
    partidosConPrediccion(partidosLista.value, prediccionesRival(id)),
    claveDia.value
  )
}

function resumenRivalDia(id) {
  const lista = partidosDelRival(id)
  const preds = filtrarPrediccionesVisibles(lista, prediccionesRival(id))
  const resumen = resumenPuntosDia(lista, preds, resultados.value)
  const ocultas = lista.filter(
    (p) => p.fase !== 'grupos' && prediccionesRival(id)[p.id] && mensajePrediccionOculta(p)
  ).length
  return { ...resumen, ocultas }
}

function resumenDiaTexto(resumen) {
  if (!resumen.total) return 'Sin predicciones este día'
  const ocultasTxt =
    resumen.ocultas > 0
      ? ` · ${resumen.ocultas} oculta${resumen.ocultas === 1 ? '' : 's'}`
      : ''
  if (!resumen.conResultado) {
    return `${resumen.total} ${resumen.total === 1 ? 'partido' : 'partidos'}${ocultasTxt}`
  }
  const partes = [`${resumen.pts} pts`]
  if (resumen.exacto) partes.push(`${resumen.exacto} exacto${resumen.exacto === 1 ? '' : 's'}`)
  if (resumen.parcial) partes.push(`${resumen.parcial} parcial${resumen.parcial === 1 ? '' : 'es'}`)
  return partes.join(' · ') + ocultasTxt
}

function toggleRival(id) {
  expandido.value = expandido.value === id ? null : id
}

function diaAnterior() {
  offsetDias.value -= 1
}

function diaSiguiente() {
  offsetDias.value += 1
}

function irAHoy() {
  offsetDias.value = 0
}

onMounted(async () => {
  await Promise.all([loadConfig(), iniciarVisibilidad()])
  cargar()
  relojTimer = setInterval(() => {
    ahora.value = Date.now()
  }, 30_000)
})

onUnmounted(() => {
  detenerVisibilidad()
  clearInterval(relojTimer)
})

async function cargar() {
  loading.value = true
  error.value = ''
  if (!supabaseConfigured) {
    loading.value = false
    return
  }

  try {
    const [pts, preds, res, participantes, todasPreds, campRes] = await Promise.all([
      fetchAllPartidos(supabase),
      fetchPrediccionesParticipante(supabase, participanteId.value),
      fetchAllResultados(supabase),
      fetchAllParticipantesPublic(supabase),
      fetchAllPredicciones(supabase),
      supabase
        .from('prediccion_campeon')
        .select('*')
        .eq('participante_id', participanteId.value)
        .maybeSingle(),
    ])

    campeonPred.value = campRes.data || null

    partidos.value = pts
    const predMap = Object.fromEntries(preds.map((p) => [p.partido_id, p]))
    const grupos = partidos.value.filter((p) => p.fase === 'grupos')
    predicciones.value = {
      ...predMap,
      ...mapPrediccionesACanonica(grupos, predMap),
    }
    resultados.value = mapResultadosPorPartido(res)

    const porParticipante = {}
    for (const p of todasPreds) {
      if (!porParticipante[p.participante_id]) porParticipante[p.participante_id] = []
      porParticipante[p.participante_id].push(p)
    }
    const mapa = {}
    for (const [id, lista] of Object.entries(porParticipante)) {
      const rivalMap = Object.fromEntries(lista.map((p) => [p.partido_id, p]))
      mapa[id] = { ...rivalMap, ...mapPrediccionesACanonica(grupos, rivalMap) }
    }
    prediccionesPorRival.value = mapa

    rivales.value = participantes
      .map((p, i) => ({ ...p, puesto: i + 1 }))
      .filter((p) => p.id !== participanteId.value)
  } catch (e) {
    console.error(e)
    error.value = 'No se pudieron cargar los partidos. Probá de nuevo.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <section class="home-hoy">
    <nav class="home-hoy-links-bar" aria-label="Predicciones">
      <RouterLink to="/rivales/detalle" class="home-hoy-link home-hoy-link--cta">
        Ver detalle completo
      </RouterLink>
      <div v-if="participanteId" class="home-hoy-links-row">
        <RouterLink
          :to="`/rivales/detalle/${participanteId}`"
          class="home-hoy-link home-hoy-link--pill"
        >
          Mis predicciones
        </RouterLink>
        <RouterLink
          to="/eliminatorias#finalistas-campeon"
          class="home-hoy-link home-hoy-link--pill"
          :class="{
            'home-hoy-link--pill-warn': !campeonBloqueado && !campeonStatus.completo,
            'home-hoy-link--pill-ok': !campeonBloqueado && campeonStatus.completo,
            'home-hoy-link--pill-locked': campeonBloqueado,
          }"
        >
          Finalistas y campeón
          <span
            class="home-hoy-pill-tag"
            :class="{
              'home-hoy-pill-tag--ok': !campeonBloqueado && campeonStatus.completo,
              'home-hoy-pill-tag--warn': !campeonBloqueado && !campeonStatus.completo,
              'home-hoy-pill-tag--muted': campeonBloqueado,
            }"
          >
            ({{ campeonStatus.completo ? 'completado' : 'incompleto' }})
          </span>
        </RouterLink>
      </div>
    </nav>

    <div class="home-hoy-head">
      <h2 class="home-hoy-title">Mis partidos</h2>
    </div>

    <div class="home-hoy-nav">
      <button
        type="button"
        class="home-hoy-arrow"
        aria-label="Día anterior"
        @click="diaAnterior"
      >
        ‹
      </button>

      <button type="button" class="home-hoy-dia" @click="irAHoy">
        <span class="home-hoy-dia-label">{{ etiquetaCorta || tituloDia }}</span>
        <span v-if="etiquetaCorta" class="home-hoy-dia-fecha">{{ tituloDia }}</span>
        <span v-if="offsetDias !== 0" class="home-hoy-dia-hint">Tocá para volver a hoy</span>
      </button>

      <button
        type="button"
        class="home-hoy-arrow"
        aria-label="Día siguiente"
        @click="diaSiguiente"
      >
        ›
      </button>
    </div>

    <div
      v-if="!loading && !error && supabaseConfigured && cargaDia.total > 0"
      class="home-hoy-alerta"
      :class="cargaDia.pendientes > 0 ? 'home-hoy-alerta--warn' : 'home-hoy-alerta--ok'"
      role="status"
    >
      <template v-if="cargaDia.pendientes > 0">
        <strong>
          {{
            cargaDia.pendientes === 1
              ? 'Partido del día sin cargar:'
              : 'Partidos del día sin cargar:'
          }}
        </strong>
        {{ cargaDia.partidosPendientes.map(etiquetaPartido).join(' · ') }}
        <RouterLink v-if="linkCargaPendiente" :to="linkCargaPendiente.to" class="home-hoy-alerta-link">
          {{ linkCargaPendiente.label }}
        </RouterLink>
      </template>
      <template v-else>
        {{ cargaDia.cargados === 1 ? 'Partido del día cargado' : 'Partidos del día cargados' }}
      </template>
    </div>

    <div v-if="loading" class="home-hoy-loading">
      <div class="spinner-border spinner-border-sm text-secondary" role="status" />
    </div>

    <p v-else-if="error" class="home-hoy-empty">
      {{ error }}
      <button type="button" class="home-hoy-retry" @click="cargar">Reintentar</button>
    </p>

    <p v-else-if="!supabaseConfigured" class="home-hoy-empty">
      Configurá Supabase para ver el resumen.
    </p>

    <template v-else>
      <p v-if="partidosDelDiaActivo.length === 0 && cargaDia.total === 0" class="home-hoy-empty">
        No hay partidos programados para este día.
      </p>

      <p
        v-else-if="partidosDelDiaActivo.length === 0 && cargaDia.pendientes > 0"
        class="home-hoy-empty"
      >
        Todavía no cargaste predicciones para {{ etiquetaDiaCarga }}.
      </p>

      <template v-else-if="partidosDelDiaActivo.length > 0">
        <div class="home-hoy-stats">
          <span>{{ resumenDia.total }} {{ resumenDia.total === 1 ? 'partido' : 'partidos' }}</span>
          <template v-if="resumenDia.conResultado">
            <span class="home-hoy-stat-sep">·</span>
            <span>{{ resumenDia.pts }} pts</span>
            <span v-if="resumenDia.exacto" class="home-hoy-stat home-hoy-stat--exacto">
              {{ resumenDia.exacto }} exacto{{ resumenDia.exacto === 1 ? '' : 's' }}
            </span>
            <span v-if="resumenDia.parcial" class="home-hoy-stat home-hoy-stat--parcial">
              {{ resumenDia.parcial }} parcial{{ resumenDia.parcial === 1 ? '' : 'es' }}
            </span>
          </template>
        </div>

        <div class="home-hoy-lista">
          <MisPrediccionRow
            v-for="p in partidosDelDiaActivo"
            :key="p.id"
            :partido="p"
            :prediccion="predicciones[p.id]"
            :resultado="resultados[p.id]"
            :show-contrincantes-link="linkContrincantes(p)"
          />
        </div>
      </template>

      <section v-if="rivales.length" class="home-contrincantes">
        <div class="home-hoy-head home-contrincantes-head">
          <h2 class="home-hoy-title">Contrincantes</h2>
          <RouterLink to="/rivales" class="home-hoy-link">Ver página</RouterLink>
        </div>

        <p class="home-contrincantes-hint">
          Grupos: predicciones visibles siempre. Eliminatorias: se revelan
          <strong>1 h antes del partido</strong>, cuando cierra la carga de ese cruce.
        </p>

        <div class="rivales-lista">
          <div
            v-for="rival in rivales"
            :key="rival.id"
            class="rivales-item"
            :class="{ 'rivales-item--open': expandido === rival.id }"
          >
            <button
              type="button"
              class="rivales-trigger"
              :aria-expanded="expandido === rival.id"
              @click="toggleRival(rival.id)"
            >
              <span class="rivales-pos" :class="{ 'rivales-pos--podium': rival.puesto <= 3 }">
                {{ rival.puesto }}
              </span>
              <span class="rivales-avatar">{{ initial(rival.nombre) }}</span>
              <span class="rivales-info">
                <span class="rivales-nombre">{{ rival.nombre }}</span>
                <span class="rivales-dia-resumen">
                  {{ resumenDiaTexto(resumenRivalDia(rival.id)) }}
                </span>
              </span>
              <span class="rivales-pts">{{ rival.puntos_total }} pts</span>
              <span class="rivales-chevron" aria-hidden="true">
                {{ expandido === rival.id ? '▾' : '▸' }}
              </span>
            </button>

            <div v-if="expandido === rival.id" class="rivales-detalle">
              <p v-if="partidosDelRival(rival.id).length === 0" class="home-hoy-empty">
                No cargó predicciones para este día.
              </p>

              <div v-else class="home-hoy-lista">
                <MisPrediccionRow
                  v-for="p in partidosDelRival(rival.id)"
                  :key="p.id"
                  :partido="p"
                  :prediccion="prediccionesRival(rival.id)[p.id]"
                  :resultado="resultados[p.id]"
                  :mensaje-prediccion-oculta="mensajePrediccionOculta(p)"
                  :show-contrincantes-link="linkContrincantes(p)"
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    </template>
  </section>
</template>
