import { supabase, supabaseConfigured } from './supabase.js'

export async function gatherExportData() {
  if (!supabaseConfigured) throw new Error('Supabase no configurado')

  const [
    { data: participantes, error: e1 },
    { data: partidos, error: e2 },
    { data: predicciones, error: e3 },
    { data: resultados, error: e4 },
    { data: config, error: e5 },
    { data: campeones, error: e6 },
  ] = await Promise.all([
    supabase.from('participantes_list').select('*').order('nombre'),
    supabase.from('partidos').select('*').order('orden'),
    supabase.from('predicciones').select('*'),
    supabase.from('resultados_reales').select('*'),
    supabase.from('config_public').select('*').eq('id', 1).maybeSingle(),
    supabase.from('prediccion_campeon').select('*'),
  ])

  const err = e1 || e2 || e3 || e4 || e5 || e6
  if (err) throw err

  return {
    participantes: participantes || [],
    partidos: partidos || [],
    predicciones: predicciones || [],
    resultados: resultados || [],
    campeones: campeones || [],
    config: config || {},
    exportedAt: new Date().toISOString(),
  }
}

export async function pushToGoogleSheets(data) {
  const secret = import.meta.env.VITE_EXPORT_SECRET || ''
  const res = await fetch('/api/export-sheets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret, data }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || 'Error al exportar')
  return json
}
