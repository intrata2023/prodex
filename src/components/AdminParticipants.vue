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
    <h3 class="section-title">Participantes</h3>
    <div v-if="mensaje" class="alert alert-secondary py-2">{{ mensaje }}</div>

    <form class="stack-form mb-4" @submit.prevent="crear">
      <input v-model="nuevo.nombre" class="form-control" placeholder="Nombre" required />
      <input
        v-model="nuevo.pin"
        class="form-control"
        placeholder="PIN 4 dígitos"
        maxlength="4"
        inputmode="numeric"
        pattern="[0-9]{4}"
        required
      />
      <button type="submit" class="btn btn-success w-100">Crear participante</button>
    </form>

    <div class="admin-list">
      <div v-for="p in participantes" :key="p.id" class="admin-list-item">
        <div class="admin-list-item-top">
          <div>
            <strong>{{ p.nombre }}</strong>
            <span class="text-muted ms-2">{{ p.puntos_total }} pts</span>
          </div>
          <span :class="p.activo ? 'badge bg-success' : 'badge bg-secondary'">
            {{ p.activo ? 'Activo' : 'Inactivo' }}
          </span>
        </div>
        <div class="admin-list-item-actions">
          <div v-if="editando === p.id" class="admin-pin-edit">
            <input
              class="form-control"
              maxlength="4"
              inputmode="numeric"
              placeholder="Nuevo PIN"
              @keyup.enter="(e) => cambiarPin(p, e.target.value)"
            />
            <button class="btn btn-outline-secondary" @click="editando = null">✕</button>
          </div>
          <button v-else class="btn btn-outline-primary flex-fill" @click="editando = p.id">
            Cambiar PIN
          </button>
          <button class="btn btn-outline-warning flex-fill" @click="toggleActivo(p)">
            {{ p.activo ? 'Desactivar' : 'Activar' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
