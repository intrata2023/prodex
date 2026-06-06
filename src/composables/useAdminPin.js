import { useSession } from './useSession.js'

export function useAdminPin() {
  const { adminPin } = useSession()

  function requireAdminPin() {
    if (!adminPin.value) {
      throw new Error('Sesión admin expirada. Volvé a entrar con tu PIN.')
    }
    return adminPin.value
  }

  return { adminPin, requireAdminPin }
}
