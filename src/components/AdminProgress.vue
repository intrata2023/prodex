<script setup>
import { ref, computed } from 'vue'
import { supabase, supabaseConfigured } from '../lib/supabase.js'
import { fetchAllRows } from '../lib/fetchAll.js'
import {
  countCompletas,
  countGruposCompletas,
  progressPct,
  gruposPendientesPorParticipante,
  listPartidosPendientes,
  detectarDuplicados,
  mapPrediccionesACanonica,
  badgeGrupos,
  FASES_ELIM_PROGRESO,
  progresoPorFase,
  progresoGlobalFase,
  progresoGlobalCampeon,
  statusCampeon,
  listEliminatoriasDetalle,
  listEliminatoriasPendientes,
  agruparDetalleElimPorFase,
  partidosPredeciblesEliminatorias,
} from '../lib/participantProgress.js'

const filas = ref([])
const duplicadosDb = ref([])
const partidosE = ref([])
const participanteIds = ref([])
const ordenPor = ref('pendientes-elim')
const filtro = ref('pendientes-elim')
const faseVista = ref('todas')
const expandido = ref(null)
const avisoCopiado = ref('')

const fasesVisibles = computed(() => {
  if (faseVista.value === 'todas') return FASES_ELIM_PROGRESO
  return FASES_ELIM_PROGRESO.filter((f) => f.fase === faseVista.value)
})

const detallePorFaseFiltrado = (fila) => {
  if (faseVista.value === 'todas') return fila.detallePorFase
  return fila.detallePorFase.filter((g) => g.fase === faseVista.value)
}

const resumenGlobal = computed(() => {
  const ids = participanteIds.value
  const preds = filas.value.flatMap((f) => f.predsRaw || [])
  const fases = FASES_ELIM_PROGRESO.map((meta) => ({
    ...meta,
    ...progresoGlobalFase(partidosE.value, preds, ids, meta.fase),
  }))
  const campeones = filas.value.map((f) => f.campeonRaw).filter(Boolean)
  return {
    gruposPct:
      filas.value.length && filas.value[0].totalG
        ? Math.round(
            (filas.value.reduce((s, f) => s + f.doneG, 0) /
              (filas.value.length * filas.value[0].totalG)) *
              100
          )
        : 0,
    fases,
    campeon: progresoGlobalCampeon(campeones, ids),
  }
})

const listaApurar = computed(() =>
  filas.value
    .filter((f) => f.pendientesElim.length > 0 || !f.campeonStatus.completo)
    .map((f) => {
      const faltas = []
      if (f.pendientesElim.length) faltas.push(`${f.pendientesElim.length} elim.`)
      if (!f.campeonStatus.finalista1) faltas.push('finalista 1')
      if (!f.campeonStatus.finalista2) faltas.push('finalista 2')
      if (!f.campeonStatus.campeon) faltas.push('campeón')
      return { nombre: f.nombre, faltas: faltas.join(', '), pct16: f.fases.r32.pct }
    })
    .sort((a, b) => a.pct16 - b.pct16 || a.nombre.localeCompare(b.nombre, 'es'))
)

const textoListaApurar = computed(() => {
  if (!listaApurar.value.length) return 'Todos tienen eliminatorias y final/campeón completos.'
  return listaApurar.value.map((x) => `• ${x.nombre} — falta: ${x.faltas}`).join('\n')
})

async function copiarListaApurar() {
  try {
    await navigator.clipboard.writeText(textoListaApurar.value)
    avisoCopiado.value = 'Listado copiado.'
  } catch {
    avisoCopiado.value = 'No se pudo copiar (permiso del navegador).'
  }
  setTimeout(() => {
    avisoCopiado.value = ''
  }, 2500)
}

const filasFiltradas = computed(() => {
  let list = [...filasOrdenadas.value]
  if (filtro.value === 'pendientes-elim') {
    list = list.filter((f) => f.pendientesElim.length > 0 || !f.campeonStatus.completo)
  } else if (filtro.value === 'sin-campeon') {
    list = list.filter((f) => !f.campeonStatus.completo)
  }
  return list
})

const filasOrdenadas = computed(() => {
  const list = [...filas.value]
  const cmpNombre = (a, b) => a.nombre.localeCompare(b.nombre, 'es')

  switch (ordenPor.value) {
    case 'nombre':
      return list.sort(cmpNombre)
    case 'pctG-desc':
      return list.sort((a, b) => b.pctG - a.pctG || cmpNombre(a, b))
    case 'pctG-asc':
      return list.sort((a, b) => a.pctG - b.pctG || cmpNombre(a, b))
    case 'pct16-desc':
      return list.sort((a, b) => b.fases.r32.pct - a.fases.r32.pct || cmpNombre(a, b))
    case 'pct16-asc':
      return list.sort((a, b) => a.fases.r32.pct - b.fases.r32.pct || cmpNombre(a, b))
    case 'pendientes-elim':
      return list.sort(
        (a, b) => b.pendientesElim.length - a.pendientesElim.length || cmpNombre(a, b)
      )
    case 'pendientes':
    default:
      return list.sort((a, b) => {
        const aPend = a.empezadoGrupos && a.gruposPendientes.length
        const bPend = b.empezadoGrupos && b.gruposPendientes.length
        if (aPend !== bPend) return bPend - aPend
        if (a.gruposPendientes.length !== b.gruposPendientes.length) {
          return b.gruposPendientes.length - a.gruposPendientes.length
        }
        return cmpNombre(a, b)
      })
  }
})

function toggleExpand(id) {
  expandido.value = expandido.value === id ? null : id
}

function estadoPartido(item) {
  if (item.estado === 'incompleta') return `Incompleto (${item.detalle})`
  return 'Sin cargar'
}

function pctClass(pct) {
  if (pct >= 100) return 'progress-pct--ok'
  if (pct >= 50) return 'progress-pct--mid'
  return 'progress-pct--low'
}

function faseCellClass(faseStat) {
  if (!faseStat.activa) return 'progress-elim-fase--na'
  if (faseStat.pct >= 100) return 'progress-elim-fase--ok'
  if (faseStat.done > 0) return 'progress-elim-fase--mid'
  return 'progress-elim-fase--empty'
}

function faseCellDisplay(faseStat) {
  if (!faseStat.activa) return '—'
  return `${faseStat.done}/${faseStat.total}`
}

function equipoCellClass(cargado) {
  return cargado ? 'progress-elim-equipo--ok' : 'progress-elim-equipo--pend'
}

function barWidth(pct) {
  return `${Math.min(100, Math.max(0, pct))}%`
}

async function cargar() {
  if (!supabaseConfigured) return

  const { data: participantes } = await supabase
    .from('participantes_list')
    .select('id, nombre')
    .eq('activo', true)

  participanteIds.value = (participantes || []).map((p) => p.id)

  const { data: partidosG } = await supabase
    .from('partidos')
    .select('id, grupo, equipo_local, equipo_visitante, orden, external_id')
    .eq('fase', 'grupos')
    .order('orden')

  const { data: partidosElim } = await supabase
    .from('partidos')
    .select('id, fase, ronda, equipo_local, equipo_visitante, orden, external_id')
    .neq('fase', 'grupos')
    .order('orden')

  partidosE.value = partidosElim || []

  const preds = await fetchAllRows(
    supabase,
    'predicciones',
    'participante_id, partido_id, goles_local, goles_visitante, penales, ganador_penales'
  )

  const { data: campeones } = await supabase
    .from('prediccion_campeon')
    .select('participante_id, equipo, finalista_1, finalista_2')

  duplicadosDb.value = detectarDuplicados(partidosG)

  const predMapPorParticipante = {}
  for (const pr of preds) {
    if (!predMapPorParticipante[pr.participante_id]) predMapPorParticipante[pr.participante_id] = {}
    predMapPorParticipante[pr.participante_id][pr.partido_id] = pr
  }

  for (const p of participantes || []) {
    const predMap = predMapPorParticipante[p.id] || {}
    predMapPorParticipante[p.id] = mapPrediccionesACanonica(partidosG, predMap)
  }

  const predsReparadas = Object.entries(predMapPorParticipante).flatMap(([pid, map]) =>
    Object.values(map).map((pr) => ({ ...pr, participante_id: pid }))
  )

  const gruposStats = countGruposCompletas(partidosG, [])
  const totalG = gruposStats.total
  const predeciblesE = partidosPredeciblesEliminatorias(partidosE.value)
  const totalE = predeciblesE.length
  const idsE = new Set(predeciblesE.map((p) => p.id))

  filas.value = (participantes || []).map((p) => {
    const predsP = predsReparadas.filter((pr) => pr.participante_id === p.id)
    const { done: doneG } = countGruposCompletas(partidosG, predsP)
    const doneE = countCompletas(predsP, idsE)
    const camp = (campeones || []).find((c) => c.participante_id === p.id) || null
    const campeonStatus = statusCampeon(camp)
    const { empezadoGrupos, gruposPendientes } = gruposPendientesPorParticipante(partidosG, predsP)
    const partidosPendientes = listPartidosPendientes(partidosG, predsP)
    const pendientesElim = listEliminatoriasPendientes(partidosE.value, predsP)
    const detalleElim = listEliminatoriasDetalle(partidosE.value, predsP)
    const detallePorFase = agruparDetalleElimPorFase(detalleElim)

    const fases = {}
    for (const meta of FASES_ELIM_PROGRESO) {
      fases[meta.fase] = progresoPorFase(partidosE.value, predsP, meta.fase)
    }

    const pctG = progressPct(doneG, totalG)
    const pctE = progressPct(doneE, totalE)

    return {
      id: p.id,
      nombre: p.nombre,
      grupos: badgeGrupos(doneG, totalG),
      eliminatorias: doneE >= totalE && campeonStatus.completo ? 'Completo' : doneE ? 'En curso' : 'Sin empezar',
      pctG,
      pctE,
      doneG,
      totalG,
      doneE,
      totalE,
      empezadoGrupos,
      gruposPendientes,
      partidosPendientes,
      pendientesElim,
      detalleElim,
      detallePorFase,
      fases,
      campeonStatus,
      campeonRaw: camp,
      predsRaw: predsP,
    }
  })
}

defineExpose({ cargar })
</script>

<template>
  <div class="admin-progress">
    <div class="progress-header">
      <div>
        <h3 class="section-title">Progreso de participantes</h3>
        <p class="text-muted small mb-0">
          Carga de eliminatorias por fase, finalistas y campeón. Tocá «Actualizar» para cargar datos.
        </p>
      </div>
      <button type="button" class="admin-progress-toggle" @click="cargar">Actualizar</button>
    </div>

    <p v-if="!filas.length" class="text-muted small mb-3">
      Sin datos cargados. Tocá «Actualizar» para ver el progreso del grupo.
    </p>

    <div v-if="filas.length" class="progress-apurar mb-4">
      <div class="progress-apurar-head">
        <strong>Para apurar ({{ listaApurar.length }})</strong>
        <button
          type="button"
          class="admin-progress-toggle"
          :disabled="!listaApurar.length"
          @click="copiarListaApurar"
        >
          Copiar listado
        </button>
      </div>
      <p v-if="avisoCopiado" class="progress-apurar-aviso">{{ avisoCopiado }}</p>
      <ul v-if="listaApurar.length" class="progress-apurar-lista">
        <li v-for="p in listaApurar" :key="p.nombre">
          <span class="progress-apurar-nombre">{{ p.nombre }}</span>
          <span class="progress-apurar-faltas">{{ p.faltas }}</span>
          <span class="progress-apurar-pct">16av {{ p.pct16 }}%</span>
        </li>
      </ul>
      <p v-else class="progress-apurar-ok">Nadie pendiente en eliminatorias ni final/campeón.</p>
    </div>

    <div v-if="duplicadosDb.length" class="alert alert-warning py-2 mb-3">
      <strong>Partidos duplicados en la base ({{ duplicadosDb.length }}):</strong>
      revisá Admin → Partidos.
    </div>

    <div v-if="filas.length" class="progress-resumen-global mb-4">
      <div class="progress-resumen-title">Carga total del grupo</div>
      <p class="text-muted small mb-2">
        Los % de eliminatorias solo cuentan cruces con ambos equipos definidos.
      </p>
      <div class="progress-resumen-grid">
        <div class="progress-resumen-card">
          <span class="progress-resumen-label">Grupos</span>
          <strong :class="pctClass(resumenGlobal.gruposPct)">{{ resumenGlobal.gruposPct }}%</strong>
        </div>
        <div
          v-for="f in resumenGlobal.fases"
          :key="f.fase"
          class="progress-resumen-card"
          :class="{ 'progress-resumen-card--inactive': !f.activa }"
        >
          <span class="progress-resumen-label">{{ f.label }}</span>
          <strong v-if="f.activa" :class="pctClass(f.pct)">{{ f.pct }}%</strong>
          <strong v-else class="progress-resumen-na">—</strong>
          <span v-if="f.activa" class="progress-resumen-sub">{{ f.done }}/{{ f.total }} preds</span>
          <span v-else class="progress-resumen-sub">Sin cruces definidos</span>
        </div>
        <div class="progress-resumen-card progress-resumen-card--campeon">
          <span class="progress-resumen-label">Final / campeón</span>
          <strong :class="pctClass(resumenGlobal.campeon.pct)">{{ resumenGlobal.campeon.pct }}%</strong>
          <span class="progress-resumen-sub">
            F1 {{ resumenGlobal.campeon.finalista1 }}% · F2 {{ resumenGlobal.campeon.finalista2 }}% ·
            🏆 {{ resumenGlobal.campeon.campeon }}%
          </span>
        </div>
      </div>
    </div>

    <div class="progress-filters mb-3">
      <div class="progress-sort">
        <label class="progress-sort-label" for="progress-fase">Ver fase</label>
        <select id="progress-fase" v-model="faseVista" class="form-select">
          <option value="todas">Todas las fases</option>
          <option v-for="meta in FASES_ELIM_PROGRESO" :key="meta.fase" :value="meta.fase">
            {{ meta.label }}
          </option>
        </select>
      </div>
      <div class="progress-sort">
        <label class="progress-sort-label" for="progress-sort">Ordenar</label>
        <select id="progress-sort" v-model="ordenPor" class="form-select">
          <option value="pendientes-elim">Más eliminatorias pendientes</option>
          <option value="pendientes">Más grupos pendientes</option>
          <option value="pct16-desc">% 16avos (mayor → menor)</option>
          <option value="pct16-asc">% 16avos (menor → mayor)</option>
          <option value="nombre">Nombre (A → Z)</option>
          <option value="pctG-desc">% Grupos (mayor → menor)</option>
          <option value="pctG-asc">% Grupos (menor → mayor)</option>
        </select>
      </div>
      <div class="progress-sort">
        <label class="progress-sort-label" for="progress-filter">Filtrar</label>
        <select id="progress-filter" v-model="filtro" class="form-select">
          <option value="todos">Todos</option>
          <option value="pendientes-elim">Con eliminatorias o final pendiente</option>
          <option value="sin-campeon">Sin finalistas/campeón completo</option>
        </select>
      </div>
    </div>

    <div v-if="filasFiltradas.length" class="progress-elim-table-wrap">
      <table class="progress-elim-table">
        <thead>
          <tr>
            <th class="progress-elim-th-nombre">Participante</th>
            <th class="progress-elim-th-grupos" title="Grupos">G</th>
            <th
              v-for="meta in fasesVisibles"
              :key="meta.fase"
              class="progress-elim-th-fase"
              :title="meta.label"
            >
              {{ meta.short }}
            </th>
            <th class="progress-elim-th-equipo">Finalista 1</th>
            <th class="progress-elim-th-equipo">Finalista 2</th>
            <th class="progress-elim-th-equipo">Campeón</th>
            <th class="progress-elim-th-accion"></th>
          </tr>
        </thead>
        <tbody>
          <template v-for="f in filasFiltradas" :key="f.id">
            <tr
              class="progress-elim-row"
              :class="{ 'progress-elim-row--open': expandido === f.id }"
            >
              <td class="progress-elim-nombre">
                <strong>{{ f.nombre }}</strong>
                <span v-if="f.pendientesElim.length" class="progress-elim-pend-badge">
                  {{ f.pendientesElim.length }} pend.
                </span>
              </td>
              <td class="progress-elim-grupos" :title="`Grupos ${f.doneG}/${f.totalG}`">
                <span class="progress-pct" :class="pctClass(f.pctG)">{{ f.pctG }}%</span>
              </td>
              <td
                v-for="meta in fasesVisibles"
                :key="meta.fase"
                class="progress-elim-fase"
                :class="faseCellClass(f.fases[meta.fase])"
                :title="
                  f.fases[meta.fase].activa
                    ? `${meta.label}: ${f.fases[meta.fase].done}/${f.fases[meta.fase].total}`
                    : `${meta.label}: sin cruces definidos`
                "
              >
                <span class="progress-elim-fase-frac">
                  {{ faseCellDisplay(f.fases[meta.fase]) }}
                </span>
                <span v-if="f.fases[meta.fase].activa" class="progress-elim-bar">
                  <span
                    class="progress-elim-bar-fill"
                    :style="{ width: barWidth(f.fases[meta.fase].pct) }"
                  />
                </span>
              </td>
              <td
                class="progress-elim-equipo"
                :class="equipoCellClass(f.campeonStatus.finalista1)"
              >
                {{ f.campeonStatus.finalista1Nombre || '—' }}
              </td>
              <td
                class="progress-elim-equipo"
                :class="equipoCellClass(f.campeonStatus.finalista2)"
              >
                {{ f.campeonStatus.finalista2Nombre || '—' }}
              </td>
              <td
                class="progress-elim-equipo progress-elim-equipo--campeon"
                :class="equipoCellClass(f.campeonStatus.campeon)"
              >
                {{ f.campeonStatus.campeonNombre || '—' }}
              </td>
              <td class="progress-elim-accion">
                <button
                  type="button"
                  class="admin-progress-toggle"
                  @click="toggleExpand(f.id)"
                >
                  {{ expandido === f.id ? '▲' : '▼' }}
                </button>
              </td>
            </tr>

            <tr v-if="expandido === f.id" class="progress-elim-detail-row">
              <td :colspan="fasesVisibles.length + 6">
                <div class="progress-elim-detail">
                  <div class="progress-final-card">
                    <div class="progress-final-card-title">Final y campeón</div>
                    <div class="progress-final-grid">
                      <div
                        class="progress-final-slot"
                        :class="{ 'progress-final-slot--ok': f.campeonStatus.finalista1 }"
                      >
                        <span class="progress-final-slot-label">Finalista 1</span>
                        <span class="progress-final-slot-value">
                          {{ f.campeonStatus.finalista1Nombre || 'Sin cargar' }}
                        </span>
                      </div>
                      <div
                        class="progress-final-slot"
                        :class="{ 'progress-final-slot--ok': f.campeonStatus.finalista2 }"
                      >
                        <span class="progress-final-slot-label">Finalista 2</span>
                        <span class="progress-final-slot-value">
                          {{ f.campeonStatus.finalista2Nombre || 'Sin cargar' }}
                        </span>
                      </div>
                      <div
                        class="progress-final-slot progress-final-slot--campeon"
                        :class="{ 'progress-final-slot--ok': f.campeonStatus.campeon }"
                      >
                        <span class="progress-final-slot-label">Campeón</span>
                        <span class="progress-final-slot-value">
                          {{ f.campeonStatus.campeonNombre || 'Sin cargar' }}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div
                    v-for="grupo in detallePorFaseFiltrado(f)"
                    :key="grupo.fase"
                    class="progress-fase-block"
                  >
                    <div class="progress-fase-block-head">
                      <span class="progress-fase-block-title">{{ grupo.faseLabel }}</span>
                      <span
                        class="progress-fase-block-stat"
                        :class="pctClass(progressPct(grupo.done, grupo.total))"
                      >
                        {{ grupo.done }}/{{ grupo.total }}
                        <template v-if="grupo.total"> ({{ progressPct(grupo.done, grupo.total) }}%)</template>
                      </span>
                    </div>
                    <div class="progress-fase-matches">
                      <div
                        v-for="m in grupo.items"
                        :key="m.partido_id"
                        class="progress-fase-match"
                        :class="{ 'progress-fase-match--pend': !m.completa }"
                      >
                        <div class="progress-fase-match-main">
                          <span class="progress-fase-match-ronda">{{ m.ronda || '—' }}</span>
                          <span class="progress-fase-match-teams">
                            {{ m.equipo_local }} vs {{ m.equipo_visitante }}
                          </span>
                        </div>
                        <div class="progress-fase-match-pred">
                          <span v-if="m.completa" class="progress-detalle-ok">{{ m.resumen }}</span>
                          <span v-else-if="m.empezada" class="progress-detalle-warn">Incompleto</span>
                          <span v-else class="progress-detalle-pend">Sin cargar</span>
                          <span
                            v-if="m.completa && m.penales"
                            class="progress-detalle-pen"
                          >
                            pen.
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div v-if="f.partidosPendientes.length" class="progress-partidos-pendientes">
                    <span class="progress-grupos-label">
                      Grupos pendientes ({{ f.partidosPendientes.length }})
                    </span>
                    <div
                      v-for="m in f.partidosPendientes"
                      :key="m.partido_id"
                      class="progress-partido-item"
                    >
                      <span class="progress-partido-grupo">{{ m.grupo }}</span>
                      <span class="progress-partido-teams">
                        {{ m.equipo_local }} vs {{ m.equipo_visitante }}
                      </span>
                      <span class="progress-partido-estado">{{ estadoPartido(m) }}</span>
                    </div>
                  </div>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>

    <p v-else-if="filas.length" class="text-muted small">
      Ningún participante coincide con el filtro actual.
    </p>
  </div>
</template>
