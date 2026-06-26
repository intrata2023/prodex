<script setup>
import { ref, computed, reactive } from 'vue'
import { supabase } from '../lib/supabase.js'
import { useAdminPin } from '../composables/useAdminPin.js'
import {
  FASES_ELIM_ADMIN,
  cuadroR32Completo,
  equiposDisponiblesAdmin,
  isPlaceholderEquipo,
} from '../lib/eliminatorias.js'

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
  props.partidos
    .filter((p) => p.fase === fase.value)
    .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
)

const r32Completo = computed(() => cuadroR32Completo(props.partidos))

function equiposParaPartido(p) {
  const base = equipos.value
  const extra = []
  if (!isPlaceholderEquipo(p.equipo_local)) extra.push(p.equipo_local)
  if (!isPlaceholderEquipo(p.equipo_visitante)) extra.push(p.equipo_visitante)
  return [...new Set([...base, ...extra])].sort((a, b) => a.localeCompare(b, 'es'))
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

function etiquetaPartido(p, idx) {
  if (p.ronda) return p.ronda
  return `Partido ${idx + 1}`
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
        Los equipos ya definidos (API o carga previa) aparecen en verde. Completá solo el rival
        que falte con el desplegable.
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
              <span class="admin-cruces-ronda">{{ etiquetaPartido(p, idx) }}</span>
              <span v-if="p.fecha" class="admin-cruces-fecha">
                {{ p.fecha.slice(0, 16).replace('T', ' ') }}
              </span>
            </div>

            <div class="admin-cruces-fila">
              <!-- Local -->
              <div class="admin-cruces-lado">
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
                  <option v-for="e in equiposParaPartido(p)" :key="'l-' + p.id + e" :value="e">
                    {{ e }}
                  </option>
                </select>
              </div>

              <span class="admin-cruces-vs">vs</span>

              <!-- Visitante -->
              <div class="admin-cruces-lado">
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
                  <option v-for="e in equiposParaPartido(p)" :key="'v-' + p.id + e" :value="e">
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
