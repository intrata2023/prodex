import { ref } from 'vue'
import { supabase, supabaseConfigured } from '../lib/supabase.js'

const config = ref({
  grupos_abiertos: true,
  eliminatorias_abiertos: false,
  monto_por_persona: 15000,
  campeon_real: null,
})

export function useConfig() {
  async function loadConfig() {
    if (!supabaseConfigured) return config.value
    const { data, error } = await supabase.from('config').select('*').eq('id', 1).single()
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
    const { error } = await supabase.from('config').update(updates).eq('id', 1)
    if (!error) await loadConfig()
    return error
  }

  return { config, loadConfig, updateConfig }
}
