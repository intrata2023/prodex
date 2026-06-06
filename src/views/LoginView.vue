<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase, supabaseConfigured } from '../lib/supabase.js'
import { useSession } from '../composables/useSession.js'

const router = useRouter()
const { setParticipant, setAdmin } = useSession()

const showAdmin = ref(false)
const usuario = ref('')
const pin = ref('')
const adminPin = ref('')
const error = ref('')
const loading = ref(false)

async function loginParticipante() {
  error.value = ''
  const user = usuario.value.trim()
  if (!user || pin.value.length !== 4) {
    error.value = 'Ingresá tu usuario y PIN de 4 dígitos'
    return
  }
  loading.value = true

  if (!supabaseConfigured) {
    if (pin.value === '1234') {
      setParticipant({ id: 'mock-1', nombre: user })
      router.push('/dashboard')
    } else {
      error.value = 'Usuario o PIN incorrectos'
    }
    loading.value = false
    return
  }

  const { data, error: err } = await supabase.rpc('login_participante', {
    p_nombre: user,
    p_pin: pin.value,
  })

  loading.value = false
  if (err || !data?.length) {
    error.value = 'Usuario o PIN incorrectos'
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
      setAdmin(adminPin.value)
      router.push('/admin')
    } else {
      error.value = 'PIN incorrecto'
    }
    loading.value = false
    return
  }

  const { data, error: err } = await supabase.rpc('login_admin', { p_pin: adminPin.value })
  loading.value = false
  if (err || !data) {
    error.value = 'PIN incorrecto'
    return
  }
  setAdmin(adminPin.value)
  router.push('/admin')
}
</script>

<template>
  <div class="login-page">
    <div class="login-bg" aria-hidden="true"></div>

    <div class="login-wrap">
      <header class="login-header">
        <p class="login-eyebrow">Mundial 2026</p>
        <h1 class="login-title">PRODEX</h1>
      </header>

      <div class="login-card">
        <template v-if="!showAdmin">
          <form class="login-form" @submit.prevent="loginParticipante">
            <label class="login-label" for="usuario">Usuario</label>
            <input
              id="usuario"
              v-model="usuario"
              type="text"
              class="text-input"
              placeholder="tu usuario"
              autocomplete="username"
              autocapitalize="off"
              spellcheck="false"
              required
            />
            <label class="login-label" for="pin">PIN</label>
            <input
              id="pin"
              v-model="pin"
              type="password"
              class="pin-input"
              maxlength="4"
              inputmode="numeric"
              pattern="[0-9]{4}"
              placeholder="••••"
              autocomplete="off"
              required
            />
            <button type="submit" class="btn-enter" :disabled="loading || !usuario.trim()">
              {{ loading ? 'Entrando…' : 'Entrar' }}
            </button>
          </form>
        </template>

        <template v-else>
          <p class="login-label">Acceso administrador</p>
          <form class="login-form" @submit.prevent="loginAdmin">
            <input
              v-model="adminPin"
              type="password"
              class="pin-input"
              placeholder="PIN admin"
              autocomplete="off"
              required
            />
            <button type="submit" class="btn-enter btn-enter--admin" :disabled="loading">
              {{ loading ? 'Entrando…' : 'Entrar' }}
            </button>
          </form>
        </template>

        <p v-if="error" class="login-error">{{ error }}</p>

        <p v-if="!supabaseConfigured && !showAdmin" class="login-demo">
          Demo — PIN <strong>1234</strong>
        </p>
      </div>

      <button type="button" class="admin-link" @click="showAdmin = !showAdmin; error = ''">
        {{ showAdmin ? '← Volver' : 'Admin' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #080808;
  color: #f5f5f5;
  padding: max(1rem, env(safe-area-inset-top)) 1rem max(1rem, env(safe-area-inset-bottom));
  position: relative;
  overflow: hidden;
}

.login-bg {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 80% 60% at 50% -10%, rgba(34, 197, 94, 0.12), transparent),
    radial-gradient(ellipse 50% 40% at 100% 100%, rgba(34, 197, 94, 0.06), transparent);
  pointer-events: none;
}

.login-wrap {
  position: relative;
  width: 100%;
  max-width: 22rem;
}

.login-header {
  text-align: center;
  margin-bottom: 2rem;
}

.login-eyebrow {
  margin: 0 0 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: #22c55e;
}

.login-title {
  margin: 0;
  font-size: 2.75rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  line-height: 1;
}

.login-card {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 1.25rem;
  padding: 1.75rem;
  backdrop-filter: blur(12px);
}

.login-label {
  margin: 0 0 0.75rem;
  font-size: 0.8125rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.5);
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.text-input {
  width: 100%;
  padding: 0.875rem 1rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.75rem;
  background: rgba(0, 0, 0, 0.4);
  color: #fff;
  font-size: 1rem;
  font-weight: 500;
  outline: none;
  transition: border-color 0.15s;
  box-sizing: border-box;
}

.text-input::placeholder {
  color: rgba(255, 255, 255, 0.25);
}

.text-input:focus {
  border-color: rgba(34, 197, 94, 0.6);
}

.pin-input {
  width: 100%;
  padding: 0.875rem 1rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.75rem;
  background: rgba(0, 0, 0, 0.4);
  color: #fff;
  font-size: 1.5rem;
  font-weight: 600;
  letter-spacing: 0.4em;
  text-align: center;
  outline: none;
  transition: border-color 0.15s;
  box-sizing: border-box;
}

.pin-input::placeholder {
  color: rgba(255, 255, 255, 0.2);
  letter-spacing: 0.2em;
}

.pin-input:focus {
  border-color: rgba(34, 197, 94, 0.6);
}

.btn-enter {
  margin-top: 0.25rem;
  min-height: 2.75rem;
  padding: 0.875rem;
  border: none;
  border-radius: 0.75rem;
  background: #22c55e;
  color: #052e16;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, opacity 0.15s;
}

.btn-enter:hover:not(:disabled) {
  background: #16a34a;
}

.btn-enter:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn-enter--admin {
  background: rgba(255, 255, 255, 0.12);
  color: #f5f5f5;
}

.btn-enter--admin:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.18);
}

.login-error {
  margin: 1rem 0 0;
  padding: 0.625rem 0.875rem;
  border-radius: 0.5rem;
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.25);
  color: #fca5a5;
  font-size: 0.875rem;
  text-align: center;
}

.login-demo {
  margin: 1rem 0 0;
  font-size: 0.75rem;
  text-align: center;
  color: rgba(255, 255, 255, 0.35);
}

.login-demo strong {
  color: rgba(255, 255, 255, 0.6);
}

.admin-link {
  display: block;
  margin: 1.25rem auto 0;
  min-height: 2.75rem;
  padding: 0.75rem;
  border: none;
  background: none;
  color: rgba(255, 255, 255, 0.3);
  font-size: 0.8125rem;
  cursor: pointer;
  transition: color 0.15s;
}

.admin-link:hover {
  color: rgba(255, 255, 255, 0.6);
}
</style>
