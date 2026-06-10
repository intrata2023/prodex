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
  badgeEliminatorias,
} from '../lib/participantProgress.js'

const filas = ref([])
const duplicadosDb = ref([])
const ordenPor = ref('pendientes')

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
    case 'pctE-desc':
      return list.sort((a, b) => b.pctE - a.pctE || cmpNombre(a, b))
    case 'pctE-asc':
      return list.sort((a, b) => a.pctE - b.pctE || cmpNombre(a, b))
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

async function cargar() {
  if (!supabaseConfigured) return

  const { data: participantes } = await supabase
    .from('participantes_list')
    .select('id, nombre')
    .eq('activo', true)

  const { data: partidosG } = await supabase
    .from('partidos')
    .select('id, grupo, equipo_local, equipo_visitante, orden, external_id')
    .eq('fase', 'grupos')
    .order('orden')
  const { data: partidosE } = await supabase.from('partidos').select('id').neq('fase', 'grupos')
  const preds = await fetchAllRows(
    supabase,
    'predicciones',
    'participante_id, partido_id, goles_local, goles_visitante, penales'
  )
  const { data: campeones } = await supabase.from('prediccion_campeon').select('participante_id, equipo')

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
      })
      predMap[fix.partido_id] = { ...fix, participante_id: p.id, partido_id: fix.partido_id }
    }
    predMapPorParticipante[p.id] = predMap
  }

  const predsReparadas = Object.values(predMapPorParticipante).flatMap((map) => Object.values(map))

  const gruposStats = countGruposCompletas(partidosG, [])
  const totalG = gruposStats.total
  const totalE = partidosE?.length || 0
  const idsE = new Set((partidosE || []).map((p) => p.id))

  filas.value = (participantes || []).map((p) => {
    const predsP = predsReparadas.filter((pr) => pr.participante_id === p.id)
    const { done: doneG } = countGruposCompletas(partidosG, predsP)
    const doneE = countCompletas(predsP, idsE)
    const camp = (campeones || []).find((c) => c.participante_id === p.id)
    const { empezadoGrupos, gruposPendientes } = gruposPendientesPorParticipante(partidosG, predsP)
    const partidosPendientes = listPartidosPendientes(partidosG, predsP)

    const pctG = progressPct(doneG, totalG)
    const pctE = progressPct(doneE, totalE)

    return {
      nombre: p.nombre,
      grupos: badgeGrupos(doneG, totalG),
      eliminatorias: badgeEliminatorias(doneE, totalE, camp),
      pctG,
      pctE,
      doneG,
      totalG,
      doneE,
      totalE,
      empezadoGrupos,
      gruposPendientes,
      partidosPendientes,
    }
  })
}

function estadoPartido(item) {
  if (item.estado === 'incompleta') return `Incompleto (${item.detalle})`
  return 'Sin cargar'
}

onMounted(cargar)
defineExpose({ cargar })
</script>

<template>
  <div>
    <h3 class="section-title">Progreso de participantes</h3>
    <p class="text-muted small mb-3">
      El conteo de grupos usa cruces únicos (local vs visitante). Si hay duplicados en la base,
      no penaliza a quien ya cargó ese partido.
    </p>
    <div v-if="duplicadosDb.length" class="alert alert-warning py-2 mb-3">
      <strong>Partidos duplicados en la base ({{ duplicadosDb.length }}):</strong>
      revisá Admin → Partidos y eliminá el sobrante.
      <ul class="progress-duplicados-list mb-0 mt-2">
        <li v-for="d in duplicadosDb" :key="d.partido_ids.join('-')">
          Grupo {{ d.grupo }}: {{ d.equipo_local }} vs {{ d.equipo_visitante }}
          ({{ d.cantidad }} filas)
        </li>
      </ul>
    </div>
    <div class="progress-sort mb-3">
      <label class="progress-sort-label" for="progress-sort">Ordenar por</label>
      <select id="progress-sort" v-model="ordenPor" class="form-select">
        <option value="pendientes">Más grupos pendientes</option>
        <option value="nombre">Nombre (A → Z)</option>
        <option value="pctG-desc">% Grupos (mayor a menor)</option>
        <option value="pctG-asc">% Grupos (menor a mayor)</option>
        <option value="pctE-desc">% Eliminatorias (mayor a menor)</option>
        <option value="pctE-asc">% Eliminatorias (menor a mayor)</option>
      </select>
    </div>
    <div class="admin-list">
      <div v-for="f in filasOrdenadas" :key="f.nombre" class="admin-list-item">
        <div class="admin-list-item-top">
          <strong>{{ f.nombre }}</strong>
        </div>
        <div class="progress-row">
          <div class="progress-chip">
            <span class="progress-label">Grupos</span>
            <span class="badge bg-primary">{{ f.grupos }}</span>
            <span class="progress-pct">{{ f.pctG }}%</span>
            <span class="progress-fraction">{{ f.doneG }}/{{ f.totalG }}</span>
          </div>
          <div class="progress-chip">
            <span class="progress-label">Elim.</span>
            <span class="badge bg-warning">{{ f.eliminatorias }}</span>
            <span class="progress-pct">{{ f.pctE }}%</span>
            <span class="progress-fraction">{{ f.doneE }}/{{ f.totalE }}</span>
          </div>
        </div>
        <div v-if="f.partidosPendientes.length" class="progress-partidos-pendientes">
          <span class="progress-grupos-label">Partidos pendientes ({{ f.partidosPendientes.length }})</span>
          <div
            v-for="m in f.partidosPendientes"
            :key="m.partido_id"
            class="progress-partido-item"
          >
            <span class="progress-partido-grupo">{{ m.grupo }}</span>
            <span class="progress-partido-teams">{{ m.equipo_local }} vs {{ m.equipo_visitante }}</span>
            <span class="progress-partido-estado">{{ estadoPartido(m) }}</span>
            <span v-if="m.duplicadoEnDb" class="progress-partido-warn">Duplicado en DB</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
