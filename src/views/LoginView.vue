<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase, supabaseConfigured } from '../lib/supabase.js'
import { useSession } from '../composables/useSession.js'

const router = useRouter()
const { setParticipant, setAdmin } = useSession()

const tab = ref('participante')
const participantes = ref([])
const participanteId = ref('')
const pin = ref('')
const adminPin = ref('')
const error = ref('')
const loading = ref(false)

const mockParticipantes = [
  { id: 'mock-1', nombre: 'Federico' },
  { id: 'mock-2', nombre: 'María' },
]
const demoAdminPin = import.meta.env.VITE_ADMIN_PIN || '000000'

onMounted(async () => {
  if (!supabaseConfigured) {
    participantes.value = mockParticipantes
    return
  }
  const { data, error: err } = await supabase.rpc('get_participantes_login')
  if (!err && data) participantes.value = data
})

async function loginParticipante() {
  error.value = ''
  if (!participanteId.value || pin.value.length !== 4) {
    error.value = 'Elegí participante e ingresá PIN de 4 dígitos'
    return
  }
  loading.value = true
  const selected = participantes.value.find((p) => p.id === participanteId.value)

  if (!supabaseConfigured) {
    if (pin.value === '1234') {
      setParticipant({ id: participanteId.value, nombre: selected?.nombre || 'Demo' })
      router.push('/dashboard')
    } else {
      error.value = 'PIN incorrecto (demo: 1234)'
    }
    loading.value = false
    return
  }

  const { data, error: err } = await supabase.rpc('login_participante', {
    p_nombre: selected.nombre,
    p_pin: pin.value,
  })

  loading.value = false
  if (err || !data?.length) {
    error.value = 'Nombre o PIN incorrectos'
    return
  }
  setParticipant({ id: data[0].id, nombre: data[0].nombre })
  router.push('/dashboard')
}

async function loginAdmin() {
  error.value = ''
  loading.value = true

  if (!supabaseConfigured) {
    const envPin = import.meta.env.VITE_ADMIN_PIN || '000000'
    if (adminPin.value === envPin) {
      setAdmin()
      router.push('/admin')
    } else {
      error.value = 'PIN admin incorrecto'
    }
    loading.value = false
    return
  }

  const { data, error: err } = await supabase.rpc('login_admin', { p_pin: adminPin.value })
  loading.value = false
  if (err || !data) {
    error.value = 'PIN admin incorrecto'
    return
  }
  setAdmin()
  router.push('/admin')
}
</script>

<template>
  <div class="min-vh-100 d-flex align-items-center bg-primary bg-gradient">
    <div class="container">
      <div class="row justify-content-center">
        <div class="col-md-5">
          <div class="card shadow-lg border-0">
            <div class="card-body p-4">
              <h1 class="h3 text-center mb-1">Prode Mundial 2026</h1>
              <p class="text-center text-muted mb-4">Oficina</p>

              <ul class="nav nav-tabs mb-4">
                <li class="nav-item">
                  <button
                    class="nav-link"
                    :class="{ active: tab === 'participante' }"
                    @click="tab = 'participante'"
                  >
                    Participante
                  </button>
                </li>
                <li class="nav-item">
                  <button
                    class="nav-link"
                    :class="{ active: tab === 'admin' }"
                    @click="tab = 'admin'"
                  >
                    Admin
                  </button>
                </li>
              </ul>

              <div v-if="!supabaseConfigured" class="alert alert-warning small">
                Sin Supabase configurado. Modo demo: PIN <strong>1234</strong>, admin
                <strong>{{ demoAdminPin }}</strong>
              </div>

              <form v-if="tab === 'participante'" @submit.prevent="loginParticipante">
                <div class="mb-3">
                  <label class="form-label">Participante</label>
                  <select v-model="participanteId" class="form-select" required>
                    <option value="">Elegir...</option>
                    <option v-for="p in participantes" :key="p.id" :value="p.id">
                      {{ p.nombre }}
                    </option>
                  </select>
                </div>
                <div class="mb-3">
                  <label class="form-label">PIN (4 dígitos)</label>
                  <input
                    v-model="pin"
                    type="password"
                    class="form-control text-center fs-4"
                    maxlength="4"
                    inputmode="numeric"
                    pattern="[0-9]{4}"
                    placeholder="••••"
                    required
                  />
                </div>
                <button type="submit" class="btn btn-primary w-100" :disabled="loading">
                  Entrar
                </button>
              </form>

              <form v-else @submit.prevent="loginAdmin">
                <div class="mb-3">
                  <label class="form-label">PIN Admin</label>
                  <input
                    v-model="adminPin"
                    type="password"
                    class="form-control"
                    placeholder="PIN admin"
                    required
                  />
                </div>
                <button type="submit" class="btn btn-dark w-100" :disabled="loading">
                  Entrar como Admin
                </button>
              </form>

              <div v-if="error" class="alert alert-danger mt-3 mb-0">{{ error }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
