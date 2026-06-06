import { ref } from 'vue'
import { supabase, supabaseConfigured } from '../lib/supabase.js'
import { useAdminPin } from './useAdminPin.js'

const config = ref({
  grupos_abiertos: true,
  eliminatorias_abiertos: false,
  monto_por_persona: 15000,
  campeon_real: null,
})

export function useConfig() {
  const { requireAdminPin } = useAdminPin()

  async function loadConfig() {
    if (!supabaseConfigured) return config.value
    const { data, error } = await supabase.from('config_public').select('*').eq('id', 1).single()
    if (!error && data) {
      config.value = {
        grupos_abiertos: data.grupos_abiertos,
        eliminatorias_abiertos: data.eliminatorias_abiertos,
        monto_por_persona: data.monto_por_persona,
        campeon_real: data.campeon_real,
      }
    }
    return config.value
  }

  async function updateConfig(updates) {
    if (!supabaseConfigured) return
    const pin = requireAdminPin()
    const { error } = await supabase.rpc('admin_update_config', {
      p_admin_pin: pin,
      p_grupos_abiertos: updates.grupos_abiertos ?? null,
      p_eliminatorias_abiertos: updates.eliminatorias_abiertos ?? null,
      p_monto_por_persona: updates.monto_por_persona ?? null,
      p_campeon_real:
        updates.campeon_real !== undefined ? updates.campeon_real : null,
    })
    if (!error) await loadConfig()
    return error
  }

  return { config, loadConfig, updateConfig }
}
