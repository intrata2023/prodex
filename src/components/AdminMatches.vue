<script setup>
import { ref, computed } from 'vue'
import { supabase, supabaseConfigured } from '../lib/supabase.js'
import { fetchAllPartidos } from '../lib/dataLoaders.js'
import { importWorldCupFixture, importWorldCupEliminatorias } from '../lib/syncResults.js'
import { useAdminPin } from '../composables/useAdminPin.js'
import AdminCrucesManual from './AdminCrucesManual.vue'

const { requireAdminPin } = useAdminPin()
const partidos = ref([])
const nuevo = ref({
  fase: 'r32',
  ronda: '16avos',
  grupo: '',
  equipo_local: '',
  equipo_visitante: '',
  external_id: '',
  orden: 0,
})
const mensaje = ref('')
const mensajeOk = ref(true)
const importando = ref(false)
const importandoCuadros = ref(false)

const eliminatoriasCount = computed(
  () => partidos.value.filter((p) => p.fase !== 'grupos').length
)

const fases = [
  { value: 'grupos', label: 'Grupos' },
  { value: 'r32', label: '16avos' },
  { value: 'r16', label: 'Octavos' },
  { value: 'qf', label: 'Cuartos' },
  { value: 'sf', label: 'Semifinal' },
  { value: '3p', label: '3er puesto' },
  { value: 'final', label: 'Final' },
]

async function cargar() {
  if (!supabaseConfigured) return
  partidos.value = await fetchAllPartidos(supabase)
}

async function crear() {
  const payload = {
    fase: nuevo.value.fase,
    ronda: nuevo.value.ronda,
    grupo: nuevo.value.fase === 'grupos' ? nuevo.value.grupo : null,
    equipo_local: nuevo.value.equipo_local,
    equipo_visitante: nuevo.value.equipo_visitante,
    external_id: nuevo.value.external_id ? Number(nuevo.value.external_id) : null,
    orden: Number(nuevo.value.orden) || partidos.value.length + 1,
  }
  const { error } = await supabase.rpc('admin_insert_partido', {
    p_admin_pin: requireAdminPin(),
    p_payload: payload,
  })
  mensajeOk.value = !error
  mensaje.value = error ? error.message : 'Partido creado'
  nuevo.value = { ...nuevo.value, equipo_local: '', equipo_visitante: '', external_id: '', grupo: '' }
  await cargar()
}

async function eliminar(id) {
  if (!confirm('¿Eliminar partido?')) return
  await supabase.rpc('admin_delete_partido', {
    p_admin_pin: requireAdminPin(),
    p_partido_id: id,
  })
  await cargar()
}

async function importarFixture() {
  if (
    !confirm(
      'Esto reemplaza todos los partidos actuales (incluye predicciones y resultados asociados). ¿Continuar?'
    )
  ) {
    return
  }

  importando.value = true
  mensaje.value = ''
  try {
    const stats = await importWorldCupFixture(supabase, requireAdminPin())
    mensajeOk.value = true
    mensaje.value = `Fixture importado: ${stats.total} partidos (${stats.grupos} grupos, ${stats.eliminatorias} eliminatorias)`
    await cargar()
  } catch (e) {
    mensajeOk.value = false
    mensaje.value = e.message
  }
  importando.value = false
}

async function importarCuadros() {
  if (importandoCuadros.value) return
  const ok = confirm(
    'Trae 16avos, octavos, cuartos, semifinal y final desde la API.\n\n' +
      'No modifica la fase de grupos. Solo actualiza equipos y fechas de cruces existentes.\n\n¿Continuar?'
  )
  if (!ok) return

  importandoCuadros.value = true
  mensaje.value = ''
  mensajeOk.value = true
  try {
    const stats = await importWorldCupEliminatorias(supabase, requireAdminPin())
    mensajeOk.value = true
    mensaje.value =
      `Cuadros actualizados: ${stats.total} partidos (${stats.updated} actualizados, ${stats.inserted} nuevos). ` +
      `${stats.conEquipos} cruces completos.`
    await cargar()
  } catch (e) {
    mensajeOk.value = false
    mensaje.value = e.message
  }
  importandoCuadros.value = false
}

defineExpose({ cargar })
</script>

<template>
  <div>
    <h3 class="section-title">Partidos</h3>
    <p class="text-muted small mb-3">
      Nada se actualiza solo. Usá los botones para traer datos o cargá cruces y partidos a mano.
    </p>

    <div class="stack-form mb-3">
      <button type="button" class="btn btn-outline-secondary w-100" @click="cargar">
        Actualizar lista
      </button>
      <button
        type="button"
        class="btn btn-outline-primary w-100"
        :disabled="importandoCuadros"
        @click="importarCuadros"
      >
        {{ importandoCuadros ? 'Trayendo cuadros…' : 'Traer cuadros (eliminatorias)' }}
      </button>
    </div>

    <div
      v-if="mensaje"
      class="alert py-2"
      :class="mensajeOk ? 'alert-success' : 'alert-danger'"
    >
      {{ mensaje }}
    </div>

    <AdminCrucesManual :partidos="partidos" @updated="cargar" />

    <p v-if="eliminatoriasCount" class="text-muted small mb-3">
      {{ eliminatoriasCount }} partidos de eliminatorias en la base (16avos → final).
    </p>

    <button
      class="btn btn-primary w-100 mb-3"
      :disabled="importando"
      @click="importarFixture"
    >
      {{ importando ? 'Importando…' : 'Importar fixture completo' }}
    </button>
    <p class="text-muted small mb-3">
      Reemplaza todos los partidos (grupos + eliminatorias). Usalo solo la primera vez o si
      querés resetear todo el fixture.
    </p>

    <form class="stack-form panel-form" @submit.prevent="crear">
      <select v-model="nuevo.fase" class="form-select">
        <option v-for="f in fases" :key="f.value" :value="f.value">{{ f.label }}</option>
      </select>
      <input v-model="nuevo.ronda" class="form-control" placeholder="Ronda" />
      <input
        v-if="nuevo.fase === 'grupos'"
        v-model="nuevo.grupo"
        class="form-control"
        placeholder="Grupo (letra)"
        maxlength="1"
      />
      <input v-model="nuevo.equipo_local" class="form-control" placeholder="Equipo local" required />
      <input
        v-model="nuevo.equipo_visitante"
        class="form-control"
        placeholder="Equipo visitante"
        required
      />
      <input v-model="nuevo.external_id" class="form-control" placeholder="API id (opcional)" />
      <button type="submit" class="btn btn-success w-100">Agregar partido manual</button>
    </form>

    <p class="text-muted small mb-2">{{ partidos.length }} partidos cargados</p>

    <div class="admin-list admin-list--scroll">
      <div v-for="p in partidos" :key="p.id" class="admin-list-item">
        <div class="admin-list-item-top">
          <div>
            <strong>{{ p.equipo_local }}</strong>
            <span class="text-muted"> vs </span>
            <strong>{{ p.equipo_visitante }}</strong>
            <div class="text-muted small">
              {{ p.fase }}<span v-if="p.grupo"> · Grupo {{ p.grupo }}</span> · {{ p.ronda }}
            </div>
          </div>
          <button class="btn btn-outline-danger btn-icon" @click="eliminar(p.id)">✕</button>
        </div>
      </div>
    </div>
  </div>
</template>
