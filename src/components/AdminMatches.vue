<script setup>
import { ref, onMounted } from 'vue'
import { supabase, supabaseConfigured } from '../lib/supabase.js'

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

const fases = [
  { value: 'grupos', label: 'Grupos' },
  { value: 'r32', label: '16avos' },
  { value: 'r16', label: 'Octavos' },
  { value: 'qf', label: 'Cuartos' },
  { value: 'sf', label: 'Semifinal' },
  { value: 'final', label: 'Final' },
]

async function cargar() {
  if (!supabaseConfigured) return
  const { data } = await supabase.from('partidos').select('*').order('orden')
  partidos.value = data || []
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
  const { error } = await supabase.from('partidos').insert(payload)
  mensaje.value = error ? error.message : 'Partido creado'
  await cargar()
}

async function eliminar(id) {
  if (!confirm('¿Eliminar partido?')) return
  await supabase.from('partidos').delete().eq('id', id)
  await cargar()
}

onMounted(cargar)
defineExpose({ cargar })
</script>

<template>
  <div>
    <h3 class="h5 mb-3">Partidos</h3>
    <div v-if="mensaje" class="alert alert-secondary py-2">{{ mensaje }}</div>

    <form class="row g-2 mb-4 border rounded p-3 bg-white" @submit.prevent="crear">
      <div class="col-md-2">
        <select v-model="nuevo.fase" class="form-select form-select-sm">
          <option v-for="f in fases" :key="f.value" :value="f.value">{{ f.label }}</option>
        </select>
      </div>
      <div class="col-md-2">
        <input v-model="nuevo.ronda" class="form-control form-control-sm" placeholder="Ronda" />
      </div>
      <div class="col-md-1" v-if="nuevo.fase === 'grupos'">
        <input v-model="nuevo.grupo" class="form-control form-control-sm" placeholder="Grupo" maxlength="1" />
      </div>
      <div class="col-md-3">
        <input v-model="nuevo.equipo_local" class="form-control form-control-sm" placeholder="Local" required />
      </div>
      <div class="col-md-3">
        <input v-model="nuevo.equipo_visitante" class="form-control form-control-sm" placeholder="Visitante" required />
      </div>
      <div class="col-md-1">
        <input v-model="nuevo.external_id" class="form-control form-control-sm" placeholder="API id" />
      </div>
      <div class="col-md-1">
        <button type="submit" class="btn btn-sm btn-success w-100">+</button>
      </div>
    </form>

    <div class="table-responsive" style="max-height: 400px; overflow-y: auto">
      <table class="table table-sm table-hover">
        <thead class="sticky-top bg-light">
          <tr>
            <th>Fase</th>
            <th>Local</th>
            <th>Visitante</th>
            <th>Grupo</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in partidos" :key="p.id">
            <td><small>{{ p.fase }} / {{ p.ronda }}</small></td>
            <td>{{ p.equipo_local }}</td>
            <td>{{ p.equipo_visitante }}</td>
            <td>{{ p.grupo || '-' }}</td>
            <td>
              <button class="btn btn-sm btn-outline-danger" @click="eliminar(p.id)">✕</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
