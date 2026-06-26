import { supabase, supabaseConfigured } from './supabase.js'
import {
  fetchAllPartidos,
  fetchAllPredicciones,
  fetchAllResultados,
} from './dataLoaders.js'

export async function gatherExportData() {
  if (!supabaseConfigured) throw new Error('Supabase no configurado')

  const [
    { data: participantes, error: e1 },
    partidos,
    resultados,
    { data: config, error: e5 },
    { data: campeones, error: e6 },
    predicciones,
  ] = await Promise.all([
    supabase.from('participantes_list').select('*').order('nombre'),
    fetchAllPartidos(supabase),
    fetchAllResultados(supabase),
    supabase.from('config_public').select('*').eq('id', 1).maybeSingle(),
    supabase.from('prediccion_campeon').select('*'),
    fetchAllPredicciones(supabase),
  ])

  const err = e1 || e5 || e6
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
