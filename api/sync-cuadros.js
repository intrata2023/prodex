import { createClient } from '@supabase/supabase-js'
import {
  fetchFootballDataMatches,
  importWorldCupEliminatoriasFromMatches,
} from '../src/lib/syncResults.js'

function env(name, fallback) {
  return process.env[name] || (fallback ? process.env[fallback] : undefined)
}

function unauthorized(res) {
  res.status(401).json({ error: 'No autorizado' })
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const cronSecret = env('CRON_SECRET')
  const authHeader = req.headers.authorization || ''
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''

  if (!cronSecret || bearer !== cronSecret) {
    unauthorized(res)
    return
  }

  const footballToken = env('FOOTBALL_DATA_TOKEN', 'VITE_FOOTBALL_DATA_TOKEN')
  const adminPin = env('ADMIN_SYNC_PIN', 'SYNC_ADMIN_PIN')
  const supabaseUrl = env('VITE_SUPABASE_URL', 'SUPABASE_URL')
  const supabaseKey =
    env('SUPABASE_SERVICE_ROLE_KEY') ||
    env('VITE_SUPABASE_ANON_KEY', 'SUPABASE_ANON_KEY')

  if (!footballToken || !adminPin || !supabaseUrl || !supabaseKey) {
    res.status(500).json({
      error:
        'Faltan variables en Vercel: FOOTBALL_DATA_TOKEN, ADMIN_SYNC_PIN, VITE_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY (o anon key).',
    })
    return
  }

  try {
    const matches = await fetchFootballDataMatches(footballToken)
    const supabase = createClient(supabaseUrl, supabaseKey)
    const stats = await importWorldCupEliminatoriasFromMatches(supabase, adminPin, matches)
    res.status(200).json({ ok: true, ...stats })
  } catch (e) {
    res.status(500).json({ error: e.message || 'Error al sincronizar cuadros' })
  }
}
