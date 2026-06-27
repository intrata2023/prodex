<script setup>
import { ref, computed, reactive } from 'vue'
import { supabase } from '../lib/supabase.js'
import { useAdminPin } from '../composables/useAdminPin.js'
import {
  FASES_ELIM_ADMIN,
  cuadroR32Completo,
  equiposDisponiblesAdmin,
  equiposOpcionesCruceAdmin,
  isPlaceholderEquipo,
} from '../lib/eliminatorias.js'
import {
  sortPartidosCuadro,
  etiquetaPartidoFifa,
  fifaMatchNo,
  FIFA_SLOT_LABELS,
  BRACKET_POSITION_BY_FIFA,
  ladoCuadro,
} from '../lib/fifaBracket2026.js'

const props = defineProps({
  partidos: { type: Array, default: () => [] },
})

const emit = defineEmits(['updated'])

const { requireAdminPin } = useAdminPin()

const fase = ref('r32')
const guardando = ref(null)
const aviso = ref('')
const editando = reactive({})

const equipos = computed(() => equiposDisponiblesAdmin(props.partidos))

const partidosFase = computed(() =>
  sortPartidosCuadro(
    props.partidos.filter((p) => p.fase === fase.value),
    fase.value
  )
)

const r32Completo = computed(() => cuadroR32Completo(props.partidos))

function equiposParaPartido(p, lado) {
  return equiposOpcionesCruceAdmin(props.partidos, p, lado, equipos.value)
}

function ladoConfirmado(nombre) {
  return !isPlaceholderEquipo(nombre)
}

function editKey(partidoId, lado) {
  return `${partidoId}-${lado}`
}

function mostrarSelect(partido, lado) {
  const nombre = lado === 'local' ? partido.equipo_local : partido.equipo_visitante
  if (!ladoConfirmado(nombre)) return true
  return !!editando[editKey(partido.id, lado)]
}

function etiquetaPartido(p) {
  return etiquetaPartidoFifa(p) || p.ronda || 'Partido'
}

function slotEsperado(p, lado) {
  const no = fifaMatchNo(p)
  const slot = no ? FIFA_SLOT_LABELS[no] : null
  if (!slot) return null
  return lado === 'local' ? slot.local : slot.visitante
}

function mitadPartido(p, idx) {
  const total = Object.keys(BRACKET_POSITION_BY_FIFA[fase.value] || {}).length
  const pos = p.bracket_pos ?? idx + 1
  const lado = ladoCuadro(fase.value, pos, total)
  if (lado === 'izq') return 'Mitad izquierda'
  if (lado === 'der') return 'Mitad derecha'
  return null
}

async function cambiarEquipo(partido, lado, raw) {
  if (!raw) return
  const field = lado === 'local' ? 'equipo_local' : 'equipo_visitante'
  guardando.value = partido.id
  aviso.value = ''
  const { error } = await supabase.rpc('admin_update_partido', {
    p_admin_pin: requireAdminPin(),
    p_partido_id: partido.id,
    p_payload: { [field]: raw },
  })
  guardando.value = null
  if (error) {
    aviso.value = error.message.includes('admin_update_partido')
      ? 'Falta ejecutar supabase/admin_update_partido.sql en Supabase.'
      : error.message
    return
  }
  editando[editKey(partido.id, lado)] = false
  aviso.value = 'Cruce actualizado.'
  emit('updated')
}
</script>

<template>
  <div class="admin-cruces panel-card">
    <div class="panel-card-header">Armar cruces a mano</div>
    <div class="panel-card-body">
      <p class="admin-cruces-intro">
        Orden igual al cuadro de Promiedos (M73–M104). Cada fila muestra el slot FIFA
        (ej. <strong>2A vs 2B</strong>) aunque falten equipos. Completá solo los lados
        pendientes; los confirmados se ven en verde («Cambiar» para editar).
      </p>

      <label class="form-label">Fase</label>
      <select v-model="fase" class="form-select mb-3">
        <option v-for="f in FASES_ELIM_ADMIN" :key="f.value" :value="f.value">
          {{ f.label }}
        </option>
      </select>

      <p v-if="partidosFase.length === 0" class="text-muted small">
        No hay partidos de esta fase. Usá «Traer cuadros» primero para crear los cruces vacíos.
      </p>

      <template v-else>
        <p v-if="equipos.length === 0" class="admin-cruces-warn">
          No hay equipos de grupos en la base. Podés ver los ya definidos abajo; para completar
          rivales importá el fixture o cargá la fase de grupos.
        </p>

        <p v-if="fase === 'r32' && r32Completo" class="admin-cruces-ok">
          Los 16 cruces de 16avos están completos. Los participantes ya pueden elegir finalistas.
        </p>

        <div class="admin-cruces-lista">
          <div v-for="(p, idx) in partidosFase" :key="p.id" class="admin-cruces-item">
            <div class="admin-cruces-meta">
              <span class="admin-cruces-idx">#{{ idx + 1 }}</span>
              <span class="admin-cruces-ronda">{{ etiquetaPartido(p) }}</span>
              <span v-if="mitadPartido(p, idx)" class="admin-cruces-mitad">
                {{ mitadPartido(p, idx) }}
              </span>
              <span v-if="p.fecha" class="admin-cruces-fecha">
                {{ p.fecha.slice(0, 16).replace('T', ' ') }}
              </span>
            </div>

            <div class="admin-cruces-fila">
              <!-- Local -->
              <div class="admin-cruces-lado">
                <span v-if="slotEsperado(p, 'local')" class="admin-cruces-slot">
                  Slot: {{ slotEsperado(p, 'local') }}
                </span>
                <template v-if="!mostrarSelect(p, 'local')">
                  <span class="admin-cruces-badge">{{ p.equipo_local }}</span>
                  <button
                    type="button"
                    class="admin-cruces-cambiar"
                    :disabled="guardando === p.id"
                    @click="editando[editKey(p.id, 'local')] = true"
                  >
                    Cambiar
                  </button>
                </template>
                <select
                  v-else
                  class="form-select form-select-sm"
                  :value="ladoConfirmado(p.equipo_local) ? p.equipo_local : ''"
                  :disabled="guardando === p.id"
                  @change="cambiarEquipo(p, 'local', $event.target.value)"
                >
                  <option value="" disabled>Elegir local…</option>
                  <option v-for="e in equiposParaPartido(p, 'local')" :key="'l-' + p.id + e" :value="e">
                    {{ e }}
                  </option>
                </select>
              </div>

              <span class="admin-cruces-vs">vs</span>

              <!-- Visitante -->
              <div class="admin-cruces-lado">
                <span v-if="slotEsperado(p, 'visitante')" class="admin-cruces-slot">
                  Slot: {{ slotEsperado(p, 'visitante') }}
                </span>
                <template v-if="!mostrarSelect(p, 'visitante')">
                  <span class="admin-cruces-badge">{{ p.equipo_visitante }}</span>
                  <button
                    type="button"
                    class="admin-cruces-cambiar"
                    :disabled="guardando === p.id"
                    @click="editando[editKey(p.id, 'visitante')] = true"
                  >
                    Cambiar
                  </button>
                </template>
                <select
                  v-else
                  class="form-select form-select-sm"
                  :value="ladoConfirmado(p.equipo_visitante) ? p.equipo_visitante : ''"
                  :disabled="guardando === p.id"
                  @change="cambiarEquipo(p, 'visitante', $event.target.value)"
                >
                  <option value="" disabled>Elegir visitante…</option>
                  <option v-for="e in equiposParaPartido(p, 'visitante')" :key="'v-' + p.id + e" :value="e">
                    {{ e }}
                  </option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </template>

      <p v-if="aviso" class="admin-cruces-aviso">{{ aviso }}</p>
    </div>
  </div>
</template>
