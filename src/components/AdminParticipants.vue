<script setup>
import { ref } from 'vue'
import { supabase, supabaseConfigured } from '../lib/supabase.js'
import { useAdminPin } from '../composables/useAdminPin.js'

const { requireAdminPin } = useAdminPin()
const participantes = ref([])
const nuevo = ref({ usuario: '', nombre: '', pin: '' })
const editando = ref(null)
const mensaje = ref('')

async function cargar() {
  if (!supabaseConfigured) return
  const { data } = await supabase
    .from('participantes_list')
    .select('id, usuario, nombre, activo, puntos_total')
    .order('nombre')
  participantes.value = data || []
}

async function crear() {
  if (!nuevo.value.usuario || !nuevo.value.nombre || nuevo.value.pin.length !== 4) {
    mensaje.value = 'Usuario, nombre y PIN de 4 dígitos requeridos'
    return
  }
  const { error } = await supabase.rpc('admin_insert_participante', {
    p_admin_pin: requireAdminPin(),
    p_usuario: nuevo.value.usuario,
    p_nombre: nuevo.value.nombre,
    p_pin: nuevo.value.pin,
  })
  mensaje.value = error ? error.message : 'Participante creado'
  nuevo.value = { usuario: '', nombre: '', pin: '' }
  await cargar()
}

async function toggleActivo(p) {
  await supabase.rpc('admin_set_participante_activo', {
    p_admin_pin: requireAdminPin(),
    p_participante_id: p.id,
    p_activo: !p.activo,
  })
  await cargar()
}

async function cambiarPin(p, pin) {
  if (pin.length !== 4) return
  const { error } = await supabase.rpc('admin_set_participante_pin', {
    p_admin_pin: requireAdminPin(),
    p_participante_id: p.id,
    p_pin: pin,
  })
  editando.value = null
  mensaje.value = error ? error.message : 'PIN actualizado'
}

defineExpose({ cargar })
</script>

<template>
  <div>
    <h3 class="section-title">Participantes</h3>
    <div class="mb-3">
      <button type="button" class="btn btn-outline-secondary w-100" @click="cargar">
        Actualizar lista
      </button>
    </div>
    <div v-if="mensaje" class="alert alert-secondary py-2">{{ mensaje }}</div>

    <form class="stack-form mb-4" @submit.prevent="crear">
      <input v-model="nuevo.usuario" class="form-control" placeholder="Usuario (login)" required />
      <input v-model="nuevo.nombre" class="form-control" placeholder="Nombre (saludo)" required />
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
            <span class="text-muted small ms-2">@{{ p.usuario }}</span>
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