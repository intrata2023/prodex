<script setup>
import { ref, onMounted } from 'vue'
import { supabase, supabaseConfigured } from '../lib/supabase.js'
import { fetchWorldCupMatches, mapApiMatchToResult, matchPartidoLocal } from '../lib/syncResults.js'
import { calcularTodosLosPuntos } from '../lib/scoring.js'

const partidos = ref([])
const resultados = ref({})
const mensaje = ref('')
const loading = ref(false)

async function cargar() {
  if (!supabaseConfigured) return
  const { data: pts } = await supabase.from('partidos').select('*').order('orden')
  partidos.value = pts || []
  const { data: res } = await supabase.from('resultados_reales').select('*')
  resultados.value = Object.fromEntries((res || []).map((r) => [r.partido_id, r]))
}

async function guardarResultado(partidoId, field, value) {
  const actual = resultados.value[partidoId] || { partido_id: partidoId }
  const updated = { ...actual, [field]: value }
  if (field === 'goles_local' || field === 'goles_visitante') {
    updated[field] = value === '' ? null : Number(value)
  }
  resultados.value[partidoId] = updated

  await supabase.from('resultados_reales').upsert({
    partido_id: partidoId,
    goles_local: updated.goles_local,
    goles_visitante: updated.goles_visitante,
    definido_penales: updated.definido_penales ?? false,
    ganador_penales: updated.ganador_penales || null,
  })
}

async function syncApi() {
  const token = import.meta.env.VITE_FOOTBALL_DATA_TOKEN
  if (!token) {
    mensaje.value = 'Falta VITE_FOOTBALL_DATA_TOKEN en .env'
    return
  }
  loading.value = true
  mensaje.value = ''
  try {
    const matches = await fetchWorldCupMatches(token)
    let ok = 0
    let fail = 0
    for (const m of matches) {
      const apiRes = mapApiMatchToResult(m)
      if (!apiRes) continue
      const partido = partidos.value.find((p) => matchPartidoLocal(p, apiRes))
      if (!partido) {
        fail++
        continue
      }
      await supabase.from('resultados_reales').upsert({
        partido_id: partido.id,
        goles_local: apiRes.goles_local,
        goles_visitante: apiRes.goles_visitante,
        definido_penales: apiRes.definido_penales,
        ganador_penales: apiRes.ganador_penales,
      })
      if (partido.fase === 'final') {
        const campeon =
          apiRes.goles_local > apiRes.goles_visitante
            ? partido.equipo_local
            : partido.equipo_visitante
        await supabase.from('config').update({ campeon_real: campeon }).eq('id', 1)
      }
      ok++
    }
    mensaje.value = `API: ${ok} actualizados, ${fail} sin mapear`
    await cargar()
    await recalcular()
  } catch (e) {
    mensaje.value = e.message
  }
  loading.value = false
}

async function recalcular() {
  if (!supabaseConfigured) return
  loading.value = true

  const { data: participantes } = await supabase.from('participantes').select('*').eq('activo', true)
  const { data: pts } = await supabase.from('partidos').select('*')
  const { data: preds } = await supabase.from('predicciones').select('*')
  const { data: res } = await supabase.from('resultados_reales').select('*')
  const { data: campeones } = await supabase.from('prediccion_campeon').select('*')
  const { data: cfg } = await supabase.from('config').select('campeon_real').eq('id', 1).single()

  const partidoFinal = (pts || []).find((p) => p.fase === 'final')
  const finalistasReales = partidoFinal
    ? [partidoFinal.equipo_local, partidoFinal.equipo_visitante]
    : []

  const resultadosConGanador = (res || []).map((r) => {
    const partido = pts.find((p) => p.id === r.partido_id)
    return { ...r, ...partido }
  })

  const updates = calcularTodosLosPuntos(
    participantes,
    pts,
    preds,
    resultadosConGanador,
    campeones,
    cfg?.campeon_real,
    finalistasReales
  )

  for (const u of updates) {
    await supabase
      .from('participantes')
      .update({ puntos_total: u.puntos_total, desglose: u.desglose })
      .eq('id', u.id)
  }

  mensaje.value = `Puntos recalculados para ${updates.length} participantes`
  loading.value = false
}

onMounted(cargar)
defineExpose({ cargar, recalcular })
</script>

<template>
  <div>
    <h3 class="h5 mb-3">Resultados reales</h3>
    <div class="d-flex flex-wrap gap-2 mb-3">
      <button class="btn btn-primary" :disabled="loading" @click="syncApi">
        Actualizar desde API
      </button>
      <button class="btn btn-warning" :disabled="loading" @click="recalcular">
        Recalcular puntos
      </button>
    </div>
    <div v-if="mensaje" class="alert alert-info py-2">{{ mensaje }}</div>

    <div class="table-responsive" style="max-height: 450px; overflow-y: auto">
      <table class="table table-sm">
        <thead class="sticky-top bg-light">
          <tr>
            <th>Partido</th>
            <th>Local</th>
            <th>Visit.</th>
            <th>P</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in partidos" :key="p.id">
            <td>
              <small>{{ p.fase }}</small><br />
              <span class="text-truncate d-inline-block" style="max-width: 140px">
                {{ p.equipo_local }} vs {{ p.equipo_visitante }}
              </span>
            </td>
            <td>
              <input
                type="number"
                min="0"
                class="form-control form-control-sm"
                style="width: 3.5rem"
                :value="resultados[p.id]?.goles_local ?? ''"
                @change="(e) => guardarResultado(p.id, 'goles_local', e.target.value)"
              />
            </td>
            <td>
              <input
                type="number"
                min="0"
                class="form-control form-control-sm"
                style="width: 3.5rem"
                :value="resultados[p.id]?.goles_visitante ?? ''"
                @change="(e) => guardarResultado(p.id, 'goles_visitante', e.target.value)"
              />
            </td>
            <td>
              <input
                type="checkbox"
                :checked="resultados[p.id]?.definido_penales"
                @change="(e) => guardarResultado(p.id, 'definido_penales', e.target.checked)"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
