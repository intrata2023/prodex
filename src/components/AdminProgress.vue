<script setup>
import { ref, onMounted } from 'vue'
import { supabase, supabaseConfigured } from '../lib/supabase.js'

const filas = ref([])

async function cargar() {
  if (!supabaseConfigured) return

  const { data: participantes } = await supabase
    .from('participantes')
    .select('id, nombre')
    .eq('activo', true)

  const { data: partidosG } = await supabase.from('partidos').select('id').eq('fase', 'grupos')
  const { data: partidosE } = await supabase.from('partidos').select('id').neq('fase', 'grupos')
  const { data: preds } = await supabase.from('predicciones').select('participante_id, partido_id, goles_local, goles_visitante')
  const { data: campeones } = await supabase.from('prediccion_campeon').select('participante_id, equipo')

  const totalG = partidosG?.length || 0
  const totalE = partidosE?.length || 0
  const idsG = new Set((partidosG || []).map((p) => p.id))
  const idsE = new Set((partidosE || []).map((p) => p.id))

  filas.value = (participantes || []).map((p) => {
    const predsP = (preds || []).filter((pr) => pr.participante_id === p.id)
    const completos = predsP.filter((pr) => pr.goles_local != null && pr.goles_visitante != null)
    const doneG = completos.filter((pr) => idsG.has(pr.partido_id)).length
    const doneE = completos.filter((pr) => idsE.has(pr.partido_id)).length
    const camp = (campeones || []).find((c) => c.participante_id === p.id)

    const pctG = totalG ? Math.round((doneG / totalG) * 100) : 0
    const pctE = totalE ? Math.round((doneE / totalE) * 100) : 0

    return {
      nombre: p.nombre,
      grupos: badge(pctG),
      eliminatorias: badge(pctE, camp?.equipo),
      pctG,
      pctE,
    }
  })
}

function badge(pct, campeon = null) {
  if (pct === 100 && (campeon !== undefined ? campeon : true)) return 'Completo'
  if (pct === 0) return 'Sin empezar'
  return 'En curso'
}

onMounted(cargar)
defineExpose({ cargar })
</script>

<template>
  <div>
    <h3 class="h5 mb-3">Progreso de participantes</h3>
    <table class="table table-sm table-striped">
      <thead>
        <tr>
          <th>Participante</th>
          <th>Grupos</th>
          <th>%</th>
          <th>Eliminatorias</th>
          <th>%</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="f in filas" :key="f.nombre">
          <td>{{ f.nombre }}</td>
          <td><span class="badge bg-primary">{{ f.grupos }}</span></td>
          <td>{{ f.pctG }}%</td>
          <td><span class="badge bg-warning text-dark">{{ f.eliminatorias }}</span></td>
          <td>{{ f.pctE }}%</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
