<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { supabase, supabaseConfigured } from '../lib/supabase.js'
import { fetchAllRows } from '../lib/fetchAll.js'
import { cruceEliminatoriaCompleto } from '../lib/eliminatorias.js'
import {
  detectarDuplicados,
  mapPrediccionesACanonica,
  prediccionCompletaCruce,
  statusCampeon,
} from '../lib/participantProgress.js'
import {
  claveArgentinaOffset,
  formatHoraArgentina,
  partidosDelDia,
  partidosListadoPredicciones,
} from '../lib/misPredicciones.js'

const REFRESH_MS = 25_000

const filas = ref([])
const duplicadosDb = ref([])
const partidosG = ref([])
const partidosE = ref([])
const partidosHoy = ref([])
const filtroHoy = ref('todos')
const filtroFinalistas = ref('todos')
const loading = ref(true)
const ultimaActualizacion = ref(null)
const avisoCopiado = ref('')
let refreshTimer = null
let avisoTimer = null

const opcionesFiltroHoy = [
  { value: 'todos', label: 'Todos' },
  { value: 'cargado', label: 'Cargado' },
  { value: 'sin-cargar', label: 'Falta cargar' },
]

const opcionesFiltroFinalistas = [
  { value: 'todos', label: 'Todos' },
  { value: 'completo', label: 'Completo' },
  { value: 'sin-cargar', label: 'Falta cargar' },
]

const hayPartidoHoy = computed(() => partidosHoy.value.length > 0)

const tituloHoy = computed(() => {
  if (!partidosHoy.value.length) return 'Hoy no hay partidos programados'
  const eq = partidosHoy.value
    .map((p) => `${p.equipo_local} vs ${p.equipo_visitante}`)
    .join(' · ')
  return partidosHoy.value.length === 1
    ? `Partido del día: ${eq}`
    : `Partidos del día (${partidosHoy.value.length}): ${eq}`
})

const resumenHoy = computed(() => {
  if (!hayPartidoHoy.value) return null
  const cargados = filas.value.filter((f) => f.hoyStatus.cargado === true).length
  const faltan = filas.value.filter((f) => f.hoyStatus.cargado === false).length
  return { cargados, faltan, total: filas.value.length }
})

const resumenFinalistas = computed(() => {
  const completos = filas.value.filter((f) => f.campeonStatus.completo).length
  const faltan = filas.value.length - completos
  return { completos, faltan, total: filas.value.length }
})

const filtroActivoLabel = computed(() => {
  const partes = []
  if (filtroHoy.value === 'cargado') partes.push('partido del día cargado')
  if (filtroHoy.value === 'sin-cargar') partes.push('falta partido del día')
  if (filtroFinalistas.value === 'completo') partes.push('finalistas y campeón completo')
  if (filtroFinalistas.value === 'sin-cargar') partes.push('falta finalistas y campeón')
  return partes.length ? partes.join(' · ') : 'todos los participantes'
})

const filasVisibles = computed(() => {
  let list = [...filas.value]

  if (filtroHoy.value === 'cargado') {
    list = list.filter((f) => f.hoyStatus.cargado === true)
  } else if (filtroHoy.value === 'sin-cargar') {
    list = list.filter((f) => f.hoyStatus.cargado === false)
  }

  if (filtroFinalistas.value === 'completo') {
    list = list.filter((f) => f.campeonStatus.completo)
  } else if (filtroFinalistas.value === 'sin-cargar') {
    list = list.filter((f) => !f.campeonStatus.completo)
  }

  return list.sort((a, b) => {
    const aPend =
      a.hoyStatus.cargado === false || !a.campeonStatus.completo ? 1 : 0
    const bPend =
      b.hoyStatus.cargado === false || !b.campeonStatus.completo ? 1 : 0
    if (aPend !== bPend) return bPend - aPend
    return a.nombre.localeCompare(b.nombre, 'es')
  })
})

const textoCopiarFiltrado = computed(() => {
  const lineas = filasVisibles.value.map((f) => {
    const hoy =
      f.hoyStatus.cargado === true
        ? 'Partido del día: cargado ✓'
        : f.hoyStatus.cargado === false
          ? 'Partido del día: sin cargar ✗'
          : 'Partido del día: —'
    const fin = estadoFinalistas(f).texto
    return `• ${f.nombre} — ${hoy} · ${fin}`
  })

  const header = [
    hayPartidoHoy.value ? tituloHoy.value : 'Progreso PRODEX',
    `Filtro: ${filtroActivoLabel.value}`,
    `${filasVisibles.value.length} participante${filasVisibles.value.length === 1 ? '' : 's'}`,
  ].join('\n')

  if (!lineas.length) return `${header}\n\n(nadie coincide con el filtro)`
  return [header, '', ...lineas].join('\n')
})

function detalleFinalistas(fila) {
  const faltan = []
  if (!fila.campeonStatus.finalista1) faltan.push('finalista 1')
  if (!fila.campeonStatus.finalista2) faltan.push('finalista 2')
  if (!fila.campeonStatus.campeon) faltan.push('campeón')
  return faltan
}

function estadoFinalistas(fila) {
  const s = fila.campeonStatus
  if (s.completo) {
    return { texto: 'Completo ✓', tipo: 'ok' }
  }
  return { texto: `Falta: ${detalleFinalistas(fila).join(', ')}`, tipo: 'pend' }
}

function calcularHoyStatus(predsP) {
  if (!partidosHoy.value.length) {
    return {
      texto: 'Sin partido',
      tipo: 'na',
      cargado: null,
      title: 'No hay partidos programados para hoy',
    }
  }

  const predMap = Object.fromEntries(predsP.map((pr) => [pr.partido_id, pr]))
  const cargados = partidosHoy.value.filter((p) =>
    prediccionCompletaCruce(predMap[p.id], p)
  ).length
  const total = partidosHoy.value.length
  const partidoTxt = partidosHoy.value
    .map((p) => `${p.equipo_local} vs ${p.equipo_visitante}`)
    .join(' · ')

  if (cargados >= total) {
    return {
      texto: 'Cargado ✓',
      tipo: 'ok',
      cargado: true,
      title: `Partido del día cargado: ${partidoTxt}`,
    }
  }
  if (cargados === 0) {
    return {
      texto: 'Sin cargar ✗',
      tipo: 'pend',
      cargado: false,
      title: `Falta cargar: ${partidoTxt}`,
    }
  }
  return {
    texto: `Parcial ${cargados}/${total}`,
    tipo: 'pend',
    cargado: false,
    title: `Faltan partidos de hoy: ${partidoTxt}`,
  }
}

function estadoClass(tipo) {
  if (tipo === 'ok') return 'admin-prog-estado--ok'
  if (tipo === 'pend') return 'admin-prog-estado--pend'
  return 'admin-prog-estado--na'
}

async function copiarTexto(texto) {
  try {
    await navigator.clipboard.writeText(texto)
    avisoCopiado.value = 'Listado copiado al portapapeles.'
  } catch {
    avisoCopiado.value = 'No se pudo copiar (permiso del navegador).'
  }
  clearTimeout(avisoTimer)
  avisoTimer = setTimeout(() => {
    avisoCopiado.value = ''
  }, 2500)
}

function actualizarPartidosHoy() {
  const todos = partidosListadoPredicciones([...partidosG.value, ...partidosE.value])
  const claveHoy = claveArgentinaOffset(0)
  partidosHoy.value = partidosDelDia(todos, claveHoy).filter(
    (p) => p.fase === 'grupos' || cruceEliminatoriaCompleto(p)
  )
}

function onVisibilidad() {
  if (document.visibilityState === 'visible') cargar()
}

async function cargar() {
  if (!supabaseConfigured) {
    loading.value = false
    return
  }

  try {
    const { data: participantes } = await supabase
      .from('participantes_list')
      .select('id, nombre')
      .eq('activo', true)

    const { data: ptsG } = await supabase
      .from('partidos')
      .select('id, grupo, equipo_local, equipo_visitante, orden, external_id, fecha, fase')
      .eq('fase', 'grupos')
      .order('orden')

    const { data: ptsE } = await supabase
      .from('partidos')
      .select('id, fase, ronda, equipo_local, equipo_visitante, orden, external_id, fecha')
      .neq('fase', 'grupos')
      .order('orden')

    partidosG.value = ptsG || []
    partidosE.value = ptsE || []
    actualizarPartidosHoy()

    const preds = await fetchAllRows(
      supabase,
      'predicciones',
      'participante_id, partido_id, goles_local, goles_visitante, penales, ganador_penales'
    )

    const { data: campeones } = await supabase
      .from('prediccion_campeon')
      .select('participante_id, equipo, finalista_1, finalista_2')

    duplicadosDb.value = detectarDuplicados(partidosG.value)

    const predMapPorParticipante = {}
    for (const pr of preds) {
      if (!predMapPorParticipante[pr.participante_id]) {
        predMapPorParticipante[pr.participante_id] = {}
      }
      predMapPorParticipante[pr.participante_id][pr.partido_id] = pr
    }

    for (const p of participantes || []) {
      const predMap = predMapPorParticipante[p.id] || {}
      predMapPorParticipante[p.id] = mapPrediccionesACanonica(partidosG.value, predMap)
    }

    const predsReparadas = Object.entries(predMapPorParticipante).flatMap(([pid, map]) =>
      Object.values(map).map((pr) => ({ ...pr, participante_id: pid }))
    )

    filas.value = (participantes || []).map((p) => {
      const predsP = predsReparadas.filter((pr) => pr.participante_id === p.id)
      const camp = (campeones || []).find((c) => c.participante_id === p.id) || null
      const campeonStatus = statusCampeon(camp)

      return {
        id: p.id,
        nombre: p.nombre,
        campeonStatus,
        hoyStatus: calcularHoyStatus(predsP),
      }
    })

    ultimaActualizacion.value = Date.now()
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  cargar()
  refreshTimer = setInterval(cargar, REFRESH_MS)
  document.addEventListener('visibilitychange', onVisibilidad)
})

onUnmounted(() => {
  clearInterval(refreshTimer)
  clearTimeout(avisoTimer)
  document.removeEventListener('visibilitychange', onVisibilidad)
})
</script>

<template>
  <div class="admin-progress">
    <div class="progress-header">
      <div>
        <h3 class="section-title">Progreso de participantes</h3>
        <p class="text-muted small mb-0">
          Se actualiza solo cada {{ REFRESH_MS / 1000 }} s.
          <template v-if="ultimaActualizacion">
            Última sync {{ formatHoraArgentina(new Date(ultimaActualizacion).toISOString()) }} ART.
          </template>
        </p>
      </div>
    </div>

    <div class="admin-prog-resumenes mb-3">
      <div
        v-if="hayPartidoHoy"
        class="admin-prog-hoy-banner"
        :class="resumenHoy?.faltan ? 'admin-prog-hoy-banner--warn' : 'admin-prog-hoy-banner--ok'"
      >
        <div class="admin-prog-hoy-banner-main">
          <strong>{{ tituloHoy }}</strong>
          <span v-if="resumenHoy">
            {{ resumenHoy.cargados }} cargaron · {{ resumenHoy.faltan }} faltan
          </span>
        </div>
      </div>
      <p v-else class="admin-prog-hoy-resumen admin-prog-hoy-resumen--muted small mb-0">
        {{ tituloHoy }}
      </p>

      <div
        class="admin-prog-hoy-banner"
        :class="resumenFinalistas.faltan ? 'admin-prog-hoy-banner--warn' : 'admin-prog-hoy-banner--ok'"
      >
        <div class="admin-prog-hoy-banner-main">
          <strong>Finalistas y campeón</strong>
          <span>
            {{ resumenFinalistas.completos }} completos · {{ resumenFinalistas.faltan }} faltan
          </span>
        </div>
      </div>
    </div>

    <p v-if="avisoCopiado" class="progress-apurar-aviso">{{ avisoCopiado }}</p>

    <div v-if="loading && !filas.length" class="text-center py-4">
      <div class="spinner-border spinner-border-sm text-secondary" role="status" />
    </div>

    <div v-if="duplicadosDb.length" class="alert alert-warning py-2 mb-3">
      <strong>Partidos duplicados en la base ({{ duplicadosDb.length }}):</strong>
      revisá Admin → Partidos.
    </div>

    <div v-if="filas.length" class="admin-prog-toolbar mb-3">
      <div class="admin-prog-filter">
        <label class="progress-sort-label" for="admin-prog-hoy">Partido del día</label>
        <select
          id="admin-prog-hoy"
          v-model="filtroHoy"
          class="form-select"
          :disabled="!hayPartidoHoy"
        >
          <option
            v-for="op in opcionesFiltroHoy"
            :key="op.value"
            :value="op.value"
            :disabled="op.value !== 'todos' && !hayPartidoHoy"
          >
            {{ op.label }}
          </option>
        </select>
      </div>
      <div class="admin-prog-filter">
        <label class="progress-sort-label" for="admin-prog-final">Finalistas y campeón</label>
        <select id="admin-prog-final" v-model="filtroFinalistas" class="form-select">
          <option v-for="op in opcionesFiltroFinalistas" :key="op.value" :value="op.value">
            {{ op.label }}
          </option>
        </select>
      </div>
      <button
        type="button"
        class="admin-progress-toggle admin-progress-toggle--primary"
        :disabled="!filasVisibles.length"
        @click="copiarTexto(textoCopiarFiltrado)"
      >
        Copiar listado filtrado ({{ filasVisibles.length }})
      </button>
    </div>

    <ul v-if="filasVisibles.length" class="admin-prog-lista">
      <li class="admin-prog-item admin-prog-item--head admin-prog-item--simple" aria-hidden="true">
        <span class="admin-prog-nombre">Participante</span>
        <span class="admin-prog-hoy">Partido del día</span>
        <span class="admin-prog-final">Finalistas y campeón</span>
      </li>
      <li v-for="f in filasVisibles" :key="f.id" class="admin-prog-item admin-prog-item--simple">
        <span class="admin-prog-nombre">{{ f.nombre }}</span>
        <span
          class="admin-prog-hoy"
          :class="estadoClass(f.hoyStatus.tipo)"
          :title="f.hoyStatus.title"
        >
          {{ f.hoyStatus.texto }}
        </span>
        <span
          class="admin-prog-final"
          :class="estadoClass(estadoFinalistas(f).tipo)"
          :title="estadoFinalistas(f).texto"
        >
          {{ estadoFinalistas(f).texto }}
        </span>
      </li>
    </ul>

    <p v-else-if="filas.length" class="text-muted small">
      Ningún participante coincide con el filtro actual.
    </p>
  </div>
</template>
