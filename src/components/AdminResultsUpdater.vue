<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase, supabaseConfigured } from '../lib/supabase.js'
import {
  fetchAllPartidos,
  fetchAllPredicciones,
  fetchAllResultados,
  mapResultadosPorPartido,
} from '../lib/dataLoaders.js'
import { calcularTodosLosPuntos, ganadorRealPartido } from '../lib/scoring.js'
import { listarCorreccionesNombresEquipos } from '../lib/normalizarEquipos.js'
import { resolverEquipoEnPartido, resolverEquipoEnLista } from '../lib/teamCrestAliases.js'
import {
  listarAvancesCuadro,
  calcularAvanceCuadro,
  resultadoCompleto,
} from '../lib/bracketAdvancement.js'
import { useAdminPin } from '../composables/useAdminPin.js'
import { FASES_ELIM_PROGRESO } from '../lib/participantProgress.js'
import { cruceEliminatoriaCompleto, isPlaceholderEquipo } from '../lib/eliminatorias.js'
import { sortPartidosCuadro } from '../lib/fifaBracket2026.js'
import PenalesGanadorPicker from './PenalesGanadorPicker.vue'

const FASES_FILTRO = [
  { value: 'todas', label: 'Todas', short: 'All' },
  { value: 'grupos', label: 'Grupos', short: 'G' },
  ...FASES_ELIM_PROGRESO.map((f) => ({ value: f.fase, label: f.label, short: f.short })),
]

const { requireAdminPin } = useAdminPin()
const partidos = ref([])
const resultados = ref({})
const mensaje = ref('')
const error = ref('')
const loading = ref(false)
const cargado = ref(false)
const faseFiltro = ref('r32')

const FASE_ORDEN = { grupos: 0, r32: 1, r16: 2, qf: 3, sf: 4, final: 5 }

function esTercerPuesto(partido) {
  return partido?.ronda?.toLowerCase().includes('tercer')
}

function partidosEnFase(fase) {
  let lista = partidos.value.filter((p) => {
    if (esTercerPuesto(p)) return false
    if (fase === 'todas') return true
    return p.fase === fase
  })

  if (fase !== 'grupos' && fase !== 'todas') {
    lista = sortPartidosCuadro(lista, fase)
  } else {
    lista = [...lista].sort(
      (a, b) =>
        (FASE_ORDEN[a.fase] ?? 99) - (FASE_ORDEN[b.fase] ?? 99) ||
        (a.orden ?? 0) - (b.orden ?? 0)
    )
  }
  return lista
}

function puedeCargarResultado(partido) {
  return cruceEliminatoriaCompleto(partido)
}

const partidosVisibles = computed(() => partidosEnFase(faseFiltro.value))

const resumenPorFase = computed(() => {
  const map = {}
  for (const opt of FASES_FILTRO) {
    const todos = partidosEnFase(opt.value)
    const cargables = todos.filter((p) => puedeCargarResultado(p))
    const ok = cargables.filter((p) => resultadoCompleto(p, resultados.value[p.id])).length
    const pend = cargables.length - ok
    map[opt.value] = {
      pend,
      ok,
      total: todos.length,
      cargables: cargables.length,
      activa: todos.length > 0,
    }
  }
  return map
})

const resumenFaseActual = computed(
  () => resumenPorFase.value[faseFiltro.value] || { pend: 0, ok: 0, total: 0, cargables: 0 }
)

function estadoCruce(partido) {
  if (!puedeCargarResultado(partido)) return 'espera'
  if (resultadoCompleto(partido, resultados.value[partido.id])) return 'ok'
  return 'pendiente'
}

function hintCruce(partido) {
  if (puedeCargarResultado(partido)) return ''
  const faltan = []
  if (isPlaceholderEquipo(partido.equipo_local)) faltan.push('local')
  if (isPlaceholderEquipo(partido.equipo_visitante)) faltan.push('visitante')
  return faltan.length
    ? `Esperando ${faltan.join(' y ')} (ganadores de la ronda anterior)`
    : 'Cruce incompleto'
}

function etiquetaFase(fase) {
  const map = {
    grupos: 'Grupos',
    r32: '16avos',
    r16: 'Octavos',
    qf: 'Cuartos',
    sf: 'Semis',
    final: 'Final',
  }
  return map[fase] || fase
}

async function cargar() {
  if (!supabaseConfigured) {
    error.value = 'Supabase no configurado.'
    return
  }
  loading.value = true
  error.value = ''
  mensaje.value = ''
  try {
    const [pts, res] = await Promise.all([
      fetchAllPartidos(supabase),
      fetchAllResultados(supabase),
    ])
    partidos.value = pts
    resultados.value = mapResultadosPorPartido(res)
    cargado.value = true
    const n = await sincronizarCuadroDesdeResultados({ silencioso: true })
    if (n > 0) {
      mensaje.value = `${n} cruce${n === 1 ? '' : 's'} del cuadro actualizado${n === 1 ? '' : 's'} según resultados ya cargados`
    }
  } catch (e) {
    error.value = e.message || 'No se pudieron cargar los partidos.'
  } finally {
    loading.value = false
  }
}

async function sincronizarCuadroDesdeResultados({ silencioso = false } = {}) {
  const avances = listarAvancesCuadro(partidos.value, resultados.value)
  if (!avances.length) {
    if (!silencioso) {
      mensaje.value = 'No hay avances pendientes según los resultados cargados'
    }
    return 0
  }

  const pin = requireAdminPin()
  for (const av of avances) {
    await supabase.rpc('admin_update_partido', {
      p_admin_pin: pin,
      p_partido_id: av.partidoId,
      p_payload: { [av.field]: av.equipo },
    })
    const dest = partidos.value.find((p) => p.id === av.partidoId)
    if (dest) dest[av.field] = av.equipo
  }

  if (!silencioso) {
    mensaje.value = `Cuadro actualizado: ${avances.length} equipo${avances.length === 1 ? '' : 's'} en la fase siguiente`
  }
  return avances.length
}

async function guardarResultado(partidoId, field, value) {
  const actual = resultados.value[partidoId] || { partido_id: partidoId }
  const updated = { ...actual, [field]: value }
  if (field === 'goles_local' || field === 'goles_visitante') {
    updated[field] = value === '' ? null : Number(value)
    const gl = updated.goles_local
    const gv = updated.goles_visitante
    if (gl == null || gv == null || gl !== gv) {
      updated.definido_penales = false
      updated.ganador_penales = null
    }
  }
  resultados.value[partidoId] = updated
  await persistirResultado(updated)
}

async function setGanadorPenales(partidoId, equipo) {
  const partido = partidos.value.find((p) => p.id === partidoId)
  const actual = resultados.value[partidoId] || { partido_id: partidoId }
  const updated = {
    ...actual,
    definido_penales: true,
    ganador_penales: partido ? resolverEquipoEnPartido(equipo, partido) : equipo,
  }
  resultados.value[partidoId] = updated
  await persistirResultado(updated)
}

async function persistirResultado(updated) {
  const pin = requireAdminPin()
  const partido = partidos.value.find((p) => p.id === updated.partido_id)
  const payload = { ...updated }
  if (payload.ganador_penales && partido) {
    payload.ganador_penales = resolverEquipoEnPartido(payload.ganador_penales, partido)
  }
  await supabase.rpc('admin_upsert_resultado', {
    p_admin_pin: pin,
    p_partido_id: payload.partido_id,
    p_goles_local: payload.goles_local,
    p_goles_visitante: payload.goles_visitante,
    p_definido_penales: payload.definido_penales ?? false,
    p_ganador_penales: payload.ganador_penales || null,
  })

  if (partido && resultadoCompleto(partido, payload)) {
    const avance = calcularAvanceCuadro(partido, payload, partidos.value)
    if (avance) {
      await supabase.rpc('admin_update_partido', {
        p_admin_pin: pin,
        p_partido_id: avance.partidoId,
        p_payload: { [avance.field]: avance.equipo },
      })
      const dest = partidos.value.find((p) => p.id === avance.partidoId)
      if (dest) dest[avance.field] = avance.equipo
      mensaje.value = `${avance.equipo} avanza a ${etiquetaFase(dest?.fase || '')}`
    }

    if (partido.fase === 'final') {
      const campeonRaw = ganadorRealPartido(partido, payload)
      const campeon = campeonRaw ? resolverEquipoEnPartido(campeonRaw, partido) : null
      if (campeon) {
        await supabase.rpc('admin_update_config', {
          p_admin_pin: pin,
          p_grupos_abiertos: null,
          p_eliminatorias_abiertos: null,
          p_monto_por_persona: null,
          p_campeon_real: campeon,
        })
        if (!avance) mensaje.value = `Campeón registrado: ${campeon}`
      }
    }
  }
  resultados.value[payload.partido_id] = payload
}

function esEmpate(partidoId) {
  const r = resultados.value[partidoId]
  return (
    r?.goles_local != null && r?.goles_visitante != null && r.goles_local === r.goles_visitante
  )
}

async function recalcular() {
  if (!supabaseConfigured) return
  loading.value = true
  mensaje.value = ''
  error.value = ''
  const pin = requireAdminPin()

  try {
    const [{ data: participantes }, pts, preds, res, { data: campeones }, { data: cfg }] =
      await Promise.all([
        supabase.from('participantes_list').select('*').eq('activo', true),
        fetchAllPartidos(supabase),
        fetchAllPredicciones(supabase),
        fetchAllResultados(supabase),
        supabase.from('prediccion_campeon').select('*'),
        supabase.from('config_public').select('campeon_real').eq('id', 1).single(),
      ])

    const partidoFinal = pts.find((p) => p.fase === 'final')
    const finalistasReales = partidoFinal
      ? [partidoFinal.equipo_local, partidoFinal.equipo_visitante]
      : []

    const { predFixes, resFixes } = listarCorreccionesNombresEquipos(pts, preds, res)
    for (const fix of predFixes) {
      await supabase.rpc('upsert_prediccion', {
        p_participante_id: fix.participante_id,
        p_partido_id: fix.partido_id,
        p_goles_local: fix.goles_local,
        p_goles_visitante: fix.goles_visitante,
        p_penales: fix.penales ?? false,
        p_ganador_penales: fix.ganador_penales,
      })
    }
    for (const fix of resFixes) {
      await supabase.rpc('admin_upsert_resultado', {
        p_admin_pin: pin,
        p_partido_id: fix.partido_id,
        p_goles_local: fix.goles_local,
        p_goles_visitante: fix.goles_visitante,
        p_definido_penales: fix.definido_penales ?? false,
        p_ganador_penales: fix.ganador_penales,
      })
      resultados.value[fix.partido_id] = fix
    }

    const predsNorm = preds.map((p) => {
      const fix = predFixes.find(
        (f) => f.participante_id === p.participante_id && f.partido_id === p.partido_id
      )
      return fix || p
    })
    const resNorm = res.map((r) => {
      const fix = resFixes.find((f) => f.partido_id === r.partido_id)
      return fix || r
    })

    const campeonRealNorm = cfg?.campeon_real
      ? resolverEquipoEnLista(cfg.campeon_real, finalistasReales) || cfg.campeon_real
      : null

    const resultadosConGanador = resNorm.map((r) => {
      const partido = pts.find((p) => p.id === r.partido_id)
      return { ...r, ...partido }
    })

    const updates = calcularTodosLosPuntos(
      participantes,
      pts,
      predsNorm,
      resultadosConGanador,
      campeones,
      campeonRealNorm,
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

    mensaje.value = `Puntos recalculados para ${updates.length} participantes${
      predFixes.length + resFixes.length
        ? ` (${predFixes.length + resFixes.length} nombres de equipos corregidos)`
        : ''
    }`
  } catch (e) {
    error.value = e.message || 'Error al recalcular puntos.'
  } finally {
    loading.value = false
  }
}

onMounted(cargar)
defineExpose({ cargar, recalcular })
</script>

<template>
  <div>
    <h3 class="section-title">Resultados reales</h3>
    <p class="text-muted small mb-3">
      Cada fase muestra todos sus cruces: los que ya se jugaron, los que podés cargar ahora y los
      que esperan ganadores. Al guardar un resultado, el ganador pasa solo a la fase siguiente.
    </p>

    <div class="stack-form mb-3">
      <button type="button" class="btn btn-outline-secondary w-100" :disabled="loading" @click="cargar">
        {{ loading && !cargado ? 'Cargando…' : 'Actualizar lista' }}
      </button>
      <button
        type="button"
        class="btn btn-outline-primary w-100"
        :disabled="loading || !partidos.length"
        @click="sincronizarCuadroDesdeResultados()"
      >
        Actualizar cuadro desde resultados
      </button>
      <button class="btn btn-warning w-100" :disabled="loading" @click="recalcular">
        Recalcular puntos
      </button>
    </div>

    <div v-if="error" class="alert alert-danger py-2">{{ error }}</div>
    <div v-if="mensaje" class="alert alert-info py-2">{{ mensaje }}</div>

    <div v-if="loading && !cargado" class="text-center py-4">
      <div class="spinner-border spinner-border-sm text-secondary" role="status" />
    </div>

    <template v-else-if="cargado">
      <div v-if="!partidos.length" class="alert alert-warning py-2">
        No hay partidos en la base. Andá a <strong>Partidos</strong> e importá el fixture o cargá
        cruces manualmente.
      </div>

      <template v-else>
        <div class="admin-results-resumen mb-3">
          <span>
            <strong>{{ resumenFaseActual.total }}</strong>
            {{ resumenFaseActual.total === 1 ? 'cruce' : 'cruces' }}
            en {{ FASES_FILTRO.find((f) => f.value === faseFiltro)?.label || 'esta fase' }}
            <span class="text-muted">
              · {{ resumenFaseActual.ok }}/{{ resumenFaseActual.cargables }} con resultado
              <template v-if="resumenFaseActual.pend">
                · {{ resumenFaseActual.pend }} pendiente{{ resumenFaseActual.pend === 1 ? '' : 's' }}
              </template>
            </span>
          </span>
        </div>

        <div class="admin-results-fases mb-3">
          <span class="admin-results-fases-label">Fase</span>
          <div class="admin-preds-fases-chips">
            <button
              v-for="opt in FASES_FILTRO"
              :key="opt.value"
              type="button"
              class="admin-preds-fase-chip"
              :class="{
                'admin-preds-fase-chip--active': faseFiltro === opt.value,
                'admin-preds-fase-chip--na': !resumenPorFase[opt.value]?.activa,
              }"
              @click="faseFiltro = opt.value"
            >
              <span>{{ opt.label }}</span>
              <span v-if="resumenPorFase[opt.value]?.pend" class="admin-preds-fase-chip-pend">
                {{ resumenPorFase[opt.value].pend }}
              </span>
            </button>
          </div>
        </div>

        <p v-if="!partidosVisibles.length" class="text-muted small">
          No hay partidos de esta fase en la base. Importá el fixture en <strong>Partidos</strong>.
        </p>

        <div v-else class="admin-list admin-list--scroll">
          <div
            v-for="p in partidosVisibles"
            :key="p.id"
            class="admin-list-item"
            :class="{
              'admin-list-item--espera': estadoCruce(p) === 'espera',
              'admin-list-item--ok': estadoCruce(p) === 'ok',
            }"
          >
            <div class="admin-list-item-top mb-1">
              <div class="text-muted small">
                <span v-if="faseFiltro === 'todas'">{{ etiquetaFase(p.fase) }}</span>
                <span v-if="p.grupo">Grupo {{ p.grupo }}</span>
                <span v-if="estadoCruce(p) === 'ok'" class="admin-res-badge admin-res-badge--ok">
                  Resultado cargado
                </span>
                <span
                  v-else-if="estadoCruce(p) === 'pendiente'"
                  class="admin-res-badge admin-res-badge--pend"
                >
                  Sin resultado
                </span>
              </div>
            </div>
            <div class="match-team mb-2">{{ p.equipo_local }} vs {{ p.equipo_visitante }}</div>
            <p v-if="estadoCruce(p) === 'espera'" class="admin-res-hint">{{ hintCruce(p) }}</p>
            <template v-else>
              <p v-if="p.fase !== 'grupos'" class="admin-res-hint admin-res-hint--120">
                Marcador a los 120 min (incluye alargue). Si empatan a los 120, elegí ganador por
                penales.
              </p>
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
              <PenalesGanadorPicker
                v-if="p.fase !== 'grupos' && esEmpate(p.id)"
                :model-value="resultados[p.id]?.ganador_penales || ''"
                :partido="p"
                @update:model-value="(equipo) => setGanadorPenales(p.id, equipo)"
              />
              <p
                v-if="p.fase !== 'grupos' && esEmpate(p.id) && !resultados[p.id]?.ganador_penales"
                class="admin-res-hint admin-res-hint--warn"
              >
                Elegí quién pasa por penales para confirmar el resultado y avanzar el cuadro.
              </p>
            </template>
          </div>
        </div>
      </template>
    </template>
  </div>
</template>
