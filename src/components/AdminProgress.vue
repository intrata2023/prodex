<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase, supabaseConfigured } from '../lib/supabase.js'
import {
  countCompletas,
  progressPct,
  gruposPendientesPorParticipante,
  badgeGrupos,
  badgeEliminatorias,
} from '../lib/participantProgress.js'

const filas = ref([])
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
    .select('id, grupo')
    .eq('fase', 'grupos')
  const { data: partidosE } = await supabase.from('partidos').select('id').neq('fase', 'grupos')
  const { data: preds } = await supabase
    .from('predicciones')
    .select('participante_id, partido_id, goles_local, goles_visitante')
  const { data: campeones } = await supabase.from('prediccion_campeon').select('participante_id, equipo')

  const totalG = partidosG?.length || 0
  const totalE = partidosE?.length || 0
  const idsG = new Set((partidosG || []).map((p) => p.id))
  const idsE = new Set((partidosE || []).map((p) => p.id))

  filas.value = (participantes || []).map((p) => {
    const predsP = (preds || []).filter((pr) => pr.participante_id === p.id)
    const doneG = countCompletas(predsP, idsG)
    const doneE = countCompletas(predsP, idsE)
    const camp = (campeones || []).find((c) => c.participante_id === p.id)
    const { empezadoGrupos, gruposPendientes } = gruposPendientesPorParticipante(partidosG, predsP)

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
    }
  })
}

onMounted(cargar)
defineExpose({ cargar })
</script>

<template>
  <div>
    <h3 class="section-title">Progreso de participantes</h3>
    <p class="text-muted small mb-3">
      Quienes ya empezaron grupos muestran en qué letras les falta completar todos los partidos.
    </p>
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
        <div
          v-if="f.empezadoGrupos && f.gruposPendientes.length"
          class="progress-grupos-pendientes"
        >
          <span class="progress-grupos-label">Falta completar:</span>
          <span
            v-for="g in f.gruposPendientes"
            :key="g"
            class="progress-grupo-badge"
          >{{ g }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
