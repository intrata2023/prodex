<script setup>
import { ref, computed } from 'vue'
import { supabase, supabaseConfigured } from '../lib/supabase.js'
import {
  FASES_ELIM_PROGRESO,
  countGruposCompletas,
  progresoPorFase,
  prediccionCompleta,
  prediccionEmpezada,
  formatPredResumen,
  statusCampeon,
  progressPct,
} from '../lib/participantProgress.js'
import { cruceEliminatoriaCompleto } from '../lib/eliminatorias.js'

const participantes = ref([])
const seleccionado = ref('')
const partidos = ref([])
const predicciones = ref({})
const campeon = ref(null)
const faseFiltro = ref('r32')

const fasesOpciones = [
  { value: 'grupos', label: 'Grupos' },
  ...FASES_ELIM_PROGRESO.map((f) => ({ value: f.fase, label: f.label })),
  { value: 'final_campeon', label: 'Finalistas / campeón' },
]

const partidosElim = computed(() => partidos.value.filter((p) => p.fase !== 'grupos'))

const partidosGrupos = computed(() =>
  partidos.value.filter((p) => p.fase === 'grupos').sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
)

const progresoGrupos = computed(() => {
  if (!seleccionado.value) return null
  const preds = Object.values(predicciones.value)
  const { done, total } = countGruposCompletas(partidosGrupos.value, preds)
  return { done, total, pct: progressPct(done, total), activa: total > 0 }
})

const progresoPorFaseElim = computed(() => {
  if (!seleccionado.value) return {}
  const preds = Object.values(predicciones.value)
  const map = {}
  for (const meta of FASES_ELIM_PROGRESO) {
    map[meta.fase] = { ...meta, ...progresoPorFase(partidosElim.value, preds, meta.fase) }
  }
  return map
})

const progresoFaseActual = computed(() => {
  if (faseFiltro.value === 'grupos') return progresoGrupos.value
  if (faseFiltro.value === 'final_campeon') {
    const st = statusCampeon(campeon.value)
    return { done: st.completo ? 3 : 0, total: 3, pct: st.pct, activa: true, ...st }
  }
  return progresoPorFaseElim.value[faseFiltro.value] || null
})

const partidosFaseActual = computed(() => {
  if (faseFiltro.value === 'grupos') return partidosGrupos.value
  if (faseFiltro.value === 'final_campeon') return []
  return partidosElim.value
    .filter((p) => p.fase === faseFiltro.value && cruceEliminatoriaCompleto(p))
    .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
})

async function cargarParticipantes() {
  const { data } = await supabase
    .from('participantes_list')
    .select('id, nombre')
    .eq('activo', true)
    .order('nombre')
  participantes.value = data || []
}

async function verPredicciones() {
  if (!seleccionado.value || !supabaseConfigured) return
  const { data: pts } = await supabase.from('partidos').select('*').order('orden')
  partidos.value = pts || []
  const { data: preds } = await supabase
    .from('predicciones')
    .select('*')
    .eq('participante_id', seleccionado.value)
  predicciones.value = Object.fromEntries((preds || []).map((p) => [p.partido_id, p]))
  const { data: camp } = await supabase
    .from('prediccion_campeon')
    .select('*')
    .eq('participante_id', seleccionado.value)
    .maybeSingle()
  campeon.value = camp
}

function pctClass(pct) {
  if (pct >= 100) return 'progress-pct--ok'
  if (pct >= 50) return 'progress-pct--mid'
  return 'progress-pct--low'
}

defineExpose({ cargarParticipantes, verPredicciones })
</script>

<template>
  <div class="admin-preds">
    <h3 class="section-title">Predicciones de eliminatorias</h3>
    <p class="text-muted small mb-3">
      Nada se carga solo. Actualizá participantes, elegí uno y fase para ver qué cargó.
    </p>

    <div class="progress-filters mb-3">
      <button type="button" class="btn btn-outline-secondary" @click="cargarParticipantes">
        Actualizar participantes
      </button>
    </div>

    <div class="progress-filters mb-3">
      <div class="progress-sort">
        <label class="progress-sort-label" for="admin-pred-part">Participante</label>
        <select id="admin-pred-part" v-model="seleccionado" class="form-select" @change="verPredicciones">
          <option value="">Elegir participante…</option>
          <option v-for="p in participantes" :key="p.id" :value="p.id">{{ p.nombre }}</option>
        </select>
      </div>
      <div class="progress-sort">
        <label class="progress-sort-label" for="admin-pred-fase">Fase</label>
        <select id="admin-pred-fase" v-model="faseFiltro" class="form-select">
          <option v-for="f in fasesOpciones" :key="f.value" :value="f.value">{{ f.label }}</option>
        </select>
      </div>
    </div>

    <template v-if="seleccionado">
      <div v-if="progresoFaseActual" class="admin-preds-resumen mb-3">
        <div class="admin-preds-resumen-stat">
          <span class="admin-preds-resumen-label">Carga en esta fase</span>
          <strong :class="pctClass(progresoFaseActual.pct)">
            <template v-if="faseFiltro === 'final_campeon'">
              {{ progresoFaseActual.pct }}%
            </template>
            <template v-else-if="progresoFaseActual.activa">
              {{ progresoFaseActual.done }}/{{ progresoFaseActual.total }}
              ({{ progresoFaseActual.pct }}%)
            </template>
            <template v-else>—</template>
          </strong>
        </div>
        <div v-if="faseFiltro !== 'grupos' && faseFiltro !== 'final_campeon'" class="admin-preds-fases-chips">
          <button
            v-for="meta in FASES_ELIM_PROGRESO"
            :key="meta.fase"
            type="button"
            class="admin-preds-fase-chip"
            :class="{
              'admin-preds-fase-chip--active': faseFiltro === meta.fase,
              'admin-preds-fase-chip--na': !progresoPorFaseElim[meta.fase]?.activa,
            }"
            @click="faseFiltro = meta.fase"
          >
            <span>{{ meta.short }}</span>
            <span v-if="progresoPorFaseElim[meta.fase]?.activa" class="admin-preds-fase-chip-pct">
              {{ progresoPorFaseElim[meta.fase].pct }}%
            </span>
            <span v-else class="admin-preds-fase-chip-pct">—</span>
          </button>
        </div>
      </div>

      <div v-if="faseFiltro === 'final_campeon'" class="progress-final-card mb-3">
        <div class="progress-final-card-title">Final y campeón</div>
        <div class="progress-final-grid">
          <div
            class="progress-final-slot"
            :class="{ 'progress-final-slot--ok': campeon?.finalista_1 }"
          >
            <span class="progress-final-slot-label">Finalista 1</span>
            <span class="progress-final-slot-value">{{ campeon?.finalista_1 || 'Sin cargar' }}</span>
          </div>
          <div
            class="progress-final-slot"
            :class="{ 'progress-final-slot--ok': campeon?.finalista_2 }"
          >
            <span class="progress-final-slot-label">Finalista 2</span>
            <span class="progress-final-slot-value">{{ campeon?.finalista_2 || 'Sin cargar' }}</span>
          </div>
          <div
            class="progress-final-slot progress-final-slot--campeon"
            :class="{ 'progress-final-slot--ok': campeon?.equipo }"
          >
            <span class="progress-final-slot-label">Campeón</span>
            <span class="progress-final-slot-value">{{ campeon?.equipo || 'Sin cargar' }}</span>
          </div>
        </div>
      </div>

      <div v-else-if="faseFiltro === 'grupos'" class="admin-preds-lista">
        <p v-if="!partidosGrupos.length" class="text-muted small">No hay partidos de grupos.</p>
        <div
          v-for="p in partidosGrupos"
          :key="p.id"
          class="admin-preds-partido"
          :class="{ 'admin-preds-partido--pend': !prediccionCompleta(predicciones[p.id]) }"
        >
          <div class="admin-preds-partido-main">
            <span class="admin-preds-partido-meta">G.{{ p.grupo }}</span>
            <span class="admin-preds-partido-teams">{{ p.equipo_local }} vs {{ p.equipo_visitante }}</span>
          </div>
          <div class="admin-preds-partido-pred">
            <span v-if="prediccionCompleta(predicciones[p.id])" class="progress-detalle-ok">
              {{ formatPredResumen(predicciones[p.id]) }}
            </span>
            <span v-else-if="prediccionEmpezada(predicciones[p.id])" class="progress-detalle-warn">
              Incompleto
            </span>
            <span v-else class="progress-detalle-pend">Sin cargar</span>
          </div>
        </div>
      </div>

      <div v-else-if="!progresoFaseActual?.activa" class="alert alert-secondary py-2">
        Todavía no hay cruces definidos en {{ fasesOpciones.find((f) => f.value === faseFiltro)?.label }}.
        Completá los equipos en Partidos → Armar cruces a mano.
      </div>

      <div v-else class="admin-preds-lista">
        <div
          v-for="p in partidosFaseActual"
          :key="p.id"
          class="admin-preds-partido"
          :class="{ 'admin-preds-partido--pend': !prediccionCompleta(predicciones[p.id]) }"
        >
          <div class="admin-preds-partido-main">
            <span class="admin-preds-partido-meta">{{ p.ronda || p.fase }}</span>
            <span class="admin-preds-partido-teams">{{ p.equipo_local }} vs {{ p.equipo_visitante }}</span>
          </div>
          <div class="admin-preds-partido-pred">
            <span v-if="prediccionCompleta(predicciones[p.id])" class="progress-detalle-ok">
              {{ formatPredResumen(predicciones[p.id]) }}
            </span>
            <span v-else-if="prediccionEmpezada(predicciones[p.id])" class="progress-detalle-warn">
              Incompleto
            </span>
            <span v-else class="progress-detalle-pend">Sin cargar</span>
            <span
              v-if="prediccionCompleta(predicciones[p.id]) && predicciones[p.id]?.penales"
              class="progress-detalle-pen"
            >
              pen.
            </span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
