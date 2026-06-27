<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase, supabaseConfigured } from '../lib/supabase.js'
import { fetchAllRows } from '../lib/fetchAll.js'
import {
  countCompletas,
  countGruposCompletas,
  progressPct,
  gruposPendientesPorParticipante,
  listPartidosPendientes,
  detectarDuplicados,
  reparacionesPredicciones,
  badgeGrupos,
  FASES_ELIM_PROGRESO,
  progresoPorFase,
  progresoGlobalFase,
  progresoGlobalCampeon,
  statusCampeon,
  listEliminatoriasDetalle,
  listEliminatoriasPendientes,
} from '../lib/participantProgress.js'

const filas = ref([])
const duplicadosDb = ref([])
const partidosE = ref([])
const participanteIds = ref([])
const ordenPor = ref('pendientes')
const filtro = ref('todos')
const expandido = ref(null)

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

function toggleExpand(nombre) {
  expandido.value = expandido.value === nombre ? null : nombre
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
    const fixes = reparacionesPredicciones(partidosG, predMap)
    for (const fix of fixes) {
      await supabase.rpc('upsert_prediccion', {
        p_participante_id: p.id,
        p_partido_id: fix.partido_id,
        p_goles_local: fix.goles_local,
        p_goles_visitante: fix.goles_visitante,
        p_penales: fix.penales ?? false,
        p_ganador_penales: fix.ganador_penales ?? null,
      })
      predMap[fix.partido_id] = { ...fix, participante_id: p.id, partido_id: fix.partido_id }
    }
    predMapPorParticipante[p.id] = predMap
  }

  const predsReparadas = Object.entries(predMapPorParticipante).flatMap(([pid, map]) =>
    Object.values(map).map((pr) => ({ ...pr, participante_id: pid }))
  )

  const gruposStats = countGruposCompletas(partidosG, [])
  const totalG = gruposStats.total
  const totalE = partidosE.value.length
  const idsE = new Set(partidosE.value.map((p) => p.id))

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
      fases,
      campeonStatus,
      campeonRaw: camp,
      predsRaw: predsP,
      finalistasTxt: camp
        ? [camp.finalista_1, camp.finalista_2].filter(Boolean).join(' · ') || '—'
        : '—',
      campeonTxt: camp?.equipo || '—',
    }
  })
}

onMounted(cargar)
defineExpose({ cargar })
</script>

<template>
  <div class="admin-progress">
    <h3 class="section-title">Progreso de participantes</h3>
    <p class="text-muted small mb-3">
      Porcentaje de carga por fase. Expandí un participante para ver resultado, penales y pendientes.
    </p>

    <div v-if="duplicadosDb.length" class="alert alert-warning py-2 mb-3">
      <strong>Partidos duplicados en la base ({{ duplicadosDb.length }}):</strong>
      revisá Admin → Partidos.
    </div>

    <!-- Resumen global -->
    <div v-if="filas.length" class="progress-resumen-global mb-4">
      <div class="progress-resumen-title">Carga total del grupo</div>
      <div class="progress-resumen-grid">
        <div class="progress-resumen-card">
          <span class="progress-resumen-label">Grupos</span>
          <strong :class="pctClass(resumenGlobal.gruposPct)">{{ resumenGlobal.gruposPct }}%</strong>
        </div>
        <div
          v-for="f in resumenGlobal.fases"
          :key="f.fase"
          class="progress-resumen-card"
        >
          <span class="progress-resumen-label">{{ f.label }}</span>
          <strong :class="pctClass(f.pct)">{{ f.pct }}%</strong>
          <span class="progress-resumen-sub">{{ f.done }}/{{ f.total }} preds</span>
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
        <label class="progress-sort-label" for="progress-sort">Ordenar</label>
        <select id="progress-sort" v-model="ordenPor" class="form-select">
          <option value="pendientes">Más grupos pendientes</option>
          <option value="pendientes-elim">Más eliminatorias pendientes</option>
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

    <div class="admin-list">
      <div v-for="f in filasFiltradas" :key="f.id" class="admin-list-item admin-progress-item">
        <div class="admin-list-item-top admin-progress-head">
          <strong>{{ f.nombre }}</strong>
          <button
            type="button"
            class="admin-progress-toggle"
            @click="toggleExpand(f.nombre)"
          >
            {{ expandido === f.nombre ? 'Ocultar' : 'Ver detalle' }}
          </button>
        </div>

        <div class="progress-row progress-row--grupos">
          <div class="progress-chip">
            <span class="progress-label">Grupos</span>
            <span class="badge bg-primary">{{ f.grupos }}</span>
            <span class="progress-pct" :class="pctClass(f.pctG)">{{ f.pctG }}%</span>
            <span class="progress-fraction">{{ f.doneG }}/{{ f.totalG }}</span>
          </div>
        </div>

        <div class="progress-fases-row">
          <div
            v-for="meta in FASES_ELIM_PROGRESO"
            :key="meta.fase"
            class="progress-fase-chip"
            :title="`${meta.label}: ${f.fases[meta.fase].done}/${f.fases[meta.fase].total}`"
          >
            <span class="progress-fase-name">{{ meta.short }}</span>
            <span class="progress-pct" :class="pctClass(f.fases[meta.fase].pct)">
              {{ f.fases[meta.fase].pct }}%
            </span>
          </div>
        </div>

        <div class="progress-campeon-row">
          <span
            class="progress-campeon-badge"
            :class="{ 'progress-campeon-badge--ok': f.campeonStatus.finalista1 }"
          >
            F1 {{ f.campeonStatus.finalista1 ? '✓' : '—' }}
          </span>
          <span
            class="progress-campeon-badge"
            :class="{ 'progress-campeon-badge--ok': f.campeonStatus.finalista2 }"
          >
            F2 {{ f.campeonStatus.finalista2 ? '✓' : '—' }}
          </span>
          <span
            class="progress-campeon-badge"
            :class="{ 'progress-campeon-badge--ok': f.campeonStatus.campeon }"
          >
            🏆 {{ f.campeonStatus.campeon ? '✓' : '—' }}
          </span>
          <span v-if="f.campeonStatus.completo" class="progress-campeon-txt">
            {{ f.finalistasTxt }} → {{ f.campeonTxt }}
          </span>
          <span v-else class="progress-campeon-txt progress-campeon-txt--pend">
            {{ f.pendientesElim.length }} elim. pendiente{{ f.pendientesElim.length === 1 ? '' : 's' }}
          </span>
        </div>

        <!-- Detalle expandible -->
        <div v-if="expandido === f.nombre" class="progress-detalle">
          <div v-if="f.campeonRaw" class="progress-detalle-campeon">
            <strong>Final:</strong>
            {{ f.finalistasTxt }}
            <span v-if="f.campeonTxt !== '—'">— Campeón: {{ f.campeonTxt }}</span>
          </div>
          <div v-else class="progress-detalle-campeon progress-detalle-campeon--empty">
            Sin finalistas ni campeón cargado
          </div>

          <div class="progress-detalle-table-wrap">
            <table class="progress-detalle-table">
              <thead>
                <tr>
                  <th>Fase</th>
                  <th>Partido</th>
                  <th>Predicción</th>
                  <th>Penales</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="m in f.detalleElim"
                  :key="m.partido_id"
                  :class="{ 'progress-detalle-row--pend': !m.completa }"
                >
                  <td>{{ m.faseLabel }}</td>
                  <td class="progress-detalle-partido">
                    <span class="progress-detalle-ronda">{{ m.ronda || '—' }}</span>
                    {{ m.equipo_local }} vs {{ m.equipo_visitante }}
                  </td>
                  <td>
                    <span v-if="m.completa" class="progress-detalle-ok">{{ m.resumen }}</span>
                    <span v-else-if="m.empezada" class="progress-detalle-warn">Incompleto</span>
                    <span v-else class="progress-detalle-pend">—</span>
                  </td>
                  <td>
                    <span v-if="m.completa && m.penales" class="progress-detalle-pen">Sí</span>
                    <span v-else-if="m.completa">No</span>
                    <span v-else>—</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div v-if="f.partidosPendientes.length" class="progress-partidos-pendientes mt-3">
            <span class="progress-grupos-label">Grupos pendientes ({{ f.partidosPendientes.length }})</span>
            <div
              v-for="m in f.partidosPendientes"
              :key="m.partido_id"
              class="progress-partido-item"
            >
              <span class="progress-partido-grupo">{{ m.grupo }}</span>
              <span class="progress-partido-teams">{{ m.equipo_local }} vs {{ m.equipo_visitante }}</span>
              <span class="progress-partido-estado">{{ estadoPartido(m) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
