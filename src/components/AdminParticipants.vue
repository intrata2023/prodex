<script setup>
import { ref, onMounted } from 'vue'
import { supabase, supabaseConfigured } from '../lib/supabase.js'

const participantes = ref([])
const nuevo = ref({ nombre: '', pin: '' })
const editando = ref(null)
const mensaje = ref('')

async function cargar() {
  if (!supabaseConfigured) return
  const { data } = await supabase
    .from('participantes')
    .select('id, nombre, activo, puntos_total')
    .order('nombre')
  participantes.value = data || []
}

async function crear() {
  if (!nuevo.value.nombre || nuevo.value.pin.length !== 4) {
    mensaje.value = 'Nombre y PIN de 4 dígitos requeridos'
    return
  }
  const enc = new TextEncoder()
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(nuevo.value.pin))
  const pinHash = Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  const { error } = await supabase.from('participantes').insert({
    nombre: nuevo.value.nombre,
    pin_hash: pinHash,
  })
  mensaje.value = error ? error.message : 'Participante creado'
  nuevo.value = { nombre: '', pin: '' }
  await cargar()
}

async function toggleActivo(p) {
  await supabase.from('participantes').update({ activo: !p.activo }).eq('id', p.id)
  await cargar()
}

async function cambiarPin(p, pin) {
  if (pin.length !== 4) return
  const enc = new TextEncoder()
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(pin))
  const pinHash = Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  await supabase.from('participantes').update({ pin_hash: pinHash }).eq('id', p.id)
  editando.value = null
  mensaje.value = 'PIN actualizado'
}

onMounted(cargar)
defineExpose({ cargar })
</script>

<template>
  <div>
    <h3 class="h5 mb-3">Participantes</h3>
    <div v-if="mensaje" class="alert alert-secondary py-2">{{ mensaje }}</div>

    <form class="row g-2 mb-4" @submit.prevent="crear">
      <div class="col-md-4">
        <input v-model="nuevo.nombre" class="form-control" placeholder="Nombre" required />
      </div>
      <div class="col-md-3">
        <input
          v-model="nuevo.pin"
          class="form-control"
          placeholder="PIN 4 dígitos"
          maxlength="4"
          pattern="[0-9]{4}"
          required
        />
      </div>
      <div class="col-md-2">
        <button type="submit" class="btn btn-success w-100">Crear</button>
      </div>
    </form>

    <table class="table table-sm">
      <thead>
        <tr>
          <th>Nombre</th>
          <th>Puntos</th>
          <th>Estado</th>
          <th>PIN</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="p in participantes" :key="p.id">
          <td>{{ p.nombre }}</td>
          <td>{{ p.puntos_total }}</td>
          <td>
            <span :class="p.activo ? 'badge bg-success' : 'badge bg-secondary'">
              {{ p.activo ? 'Activo' : 'Inactivo' }}
            </span>
          </td>
          <td>
            <div v-if="editando === p.id" class="d-flex gap-1">
              <input
                class="form-control form-control-sm"
                style="width: 5rem"
                maxlength="4"
                @keyup.enter="(e) => cambiarPin(p, e.target.value)"
              />
              <button class="btn btn-sm btn-outline-secondary" @click="editando = null">✕</button>
            </div>
            <button v-else class="btn btn-sm btn-outline-primary" @click="editando = p.id">
              Cambiar PIN
            </button>
          </td>
          <td>
            <button class="btn btn-sm btn-outline-warning" @click="toggleActivo(p)">
              {{ p.activo ? 'Desactivar' : 'Activar' }}
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
