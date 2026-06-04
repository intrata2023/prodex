import { ref, computed } from 'vue'

const STORAGE_KEY = 'prode_session'

const session = ref(loadSession())

function loadSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function useSession() {
  const isLoggedIn = computed(
    () => Boolean(session.value?.participante_id) || session.value?.es_admin
  )
  const isAdmin = computed(() => Boolean(session.value?.es_admin))
  const isParticipant = computed(() => Boolean(session.value?.participante_id))
  const participanteId = computed(() => session.value?.participante_id ?? null)
  const nombre = computed(() => session.value?.nombre ?? '')

  function setParticipant({ id, nombre: n }) {
    session.value = { participante_id: id, nombre: n, es_admin: false }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session.value))
  }

  function setAdmin() {
    session.value = { es_admin: true }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session.value))
  }

  function logout() {
    session.value = null
    localStorage.removeItem(STORAGE_KEY)
  }

  return {
    session,
    isLoggedIn,
    isAdmin,
    isParticipant,
    participanteId,
    nombre,
    setParticipant,
    setAdmin,
    logout,
  }
}
