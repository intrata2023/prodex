<script setup>
import { ref, onMounted } from 'vue'
import { supabase, supabaseConfigured } from '../lib/supabase.js'
import { fetchAllRows } from '../lib/fetchAll.js'
import { fetchWorldCupMatches, mapApiMatchToResult, matchPartidoLocal } from '../lib/syncResults.js'
import { calcularTodosLosPuntos } from '../lib/scoring.js'
import { useAdminPin } from '../composables/useAdminPin.js'

const { requireAdminPin } = useAdminPin()
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

  await supabase.rpc('admin_upsert_resultado', {
    p_admin_pin: requireAdminPin(),
    p_partido_id: partidoId,
    p_goles_local: updated.goles_local,
    p_goles_visitante: updated.goles_visitante,
    p_definido_penales: updated.definido_penales ?? false,
    p_ganador_penales: updated.ganador_penales || null,
  })
}

async function syncApi() {
  loading.value = true
  mensaje.value = ''
  const pin = requireAdminPin()
  try {
    const matches = await fetchWorldCupMatches()
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
      await supabase.rpc('admin_upsert_resultado', {
        p_admin_pin: pin,
        p_partido_id: partido.id,
        p_goles_local: apiRes.goles_local,
        p_goles_visitante: apiRes.goles_visitante,
        p_definido_penales: apiRes.definido_penales,
        p_ganador_penales: apiRes.ganador_penales,
      })
      if (partido.fase === 'final') {
        const campeon =
          apiRes.goles_local > apiRes.goles_visitante
            ? partido.equipo_local
            : partido.equipo_visitante
        await supabase.rpc('admin_update_config', {
          p_admin_pin: pin,
          p_grupos_abiertos: null,
          p_eliminatorias_abiertos: null,
          p_monto_por_persona: null,
          p_campeon_real: campeon,
        })
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
  const pin = requireAdminPin()

  const { data: participantes } = await supabase
    .from('participantes_list')
    .select('*')
    .eq('activo', true)
  const { data: pts } = await supabase.from('partidos').select('*')
  const preds = await fetchAllRows(supabase, 'predicciones', '*')
  const { data: res } = await supabase.from('resultados_reales').select('*')
  const { data: campeones } = await supabase.from('prediccion_campeon').select('*')
  const { data: cfg } = await supabase.from('config_public').select('campeon_real').eq('id', 1).single()

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
    await supabase.rpc('admin_update_puntos', {
      p_admin_pin: pin,
      p_participante_id: u.id,
      p_puntos_total: u.puntos_total,
      p_desglose: u.desglose,
    })
  }

  mensaje.value = `Puntos recalculados para ${updates.length} participantes`
  loading.value = false
}

onMounted(cargar)
defineExpose({ cargar, recalcular })
</script>

<template>
  <div>
    <h3 class="section-title">Resultados reales</h3>
    <div class="stack-form mb-3">
      <button class="btn btn-primary w-100" :disabled="loading" @click="syncApi">
        Actualizar desde API
      </button>
      <button class="btn btn-warning w-100" :disabled="loading" @click="recalcular">
        Recalcular puntos
      </button>
    </div>
    <div v-if="mensaje" class="alert alert-info py-2">{{ mensaje }}</div>

    <div class="admin-list admin-list--scroll">
      <div v-for="p in partidos" :key="p.id" class="admin-list-item">
        <div class="text-muted small mb-1">{{ p.fase }}</div>
        <div class="match-team mb-2">{{ p.equipo_local }} vs {{ p.equipo_visitante }}</div>
        <div class="match-score-row">
          <input
            type="number"
            min="0"
            inputmode="numeric"
            class="form-control match-score-input"
            :value="resultados[p.id]?.goles_local ?? ''"
            @change="(e) => guardarResultado(p.id, 'goles_local', e.target.value)"
            aria-label="Goles local"
          />
          <span class="match-separator">-</span>
          <input
            type="number"
            min="0"
            inputmode="numeric"
            class="form-control match-score-input"
            :value="resultados[p.id]?.goles_visitante ?? ''"
            @change="(e) => guardarResultado(p.id, 'goles_visitante', e.target.value)"
            aria-label="Goles visitante"
          />
        </div>
        <label class="match-penales-label mt-2">
          <input
            type="checkbox"
            :checked="resultados[p.id]?.definido_penales"
            @change="(e) => guardarResultado(p.id, 'definido_penales', e.target.checked)"
          />
          Definido por penales
        </label>
      </div>
    </div>
  </div>
</template>
