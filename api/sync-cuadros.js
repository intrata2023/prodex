import {
  createSupabaseFromEnv,
  fetchFootballDataMatches,
  footballTokenFromEnv,
  syncEliminatoriasCuadros,
  verifyAdminPin,
} from './lib/syncCuadrosServer.js'

function parseBody(req) {
  if (req.body && typeof req.body === 'object') return req.body
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body)
    } catch {
      return {}
    }
  }
  return {}
}

function unauthorized(res, message = 'No autorizado') {
  res.status(401).json({ error: message })
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const cronSecret = process.env.CRON_SECRET
  const authHeader = req.headers.authorization || ''
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  const body = parseBody(req)
  const adminPin = body.admin_pin || body.adminPin || null
  const isCron = Boolean(cronSecret && bearer === cronSecret)

  if (!isCron && !adminPin) {
    unauthorized(res, 'Enviá admin_pin en el body o usá Authorization Bearer CRON_SECRET')
    return
  }

  const footballToken = footballTokenFromEnv()
  if (!footballToken) {
    res.status(500).json({
      error: 'Falta FOOTBALL_DATA_TOKEN en Vercel (Settings → Environment Variables).',
    })
    return
  }

  let supabase
  try {
    supabase = createSupabaseFromEnv()
  } catch (e) {
    res.status(500).json({ error: e.message })
    return
  }

  const pinForSync = isCron
    ? process.env.ADMIN_SYNC_PIN || process.env.SYNC_ADMIN_PIN
    : adminPin

  if (!pinForSync) {
    res.status(500).json({
      error: isCron
        ? 'Falta ADMIN_SYNC_PIN en Vercel para el cron.'
        : 'Falta admin_pin',
    })
    return
  }

  try {
    if (!isCron) {
      await verifyAdminPin(supabase, adminPin)
    }

    const matches = await fetchFootballDataMatches(footballToken)
    const stats = await syncEliminatoriasCuadros(supabase, pinForSync, matches)
    res.status(200).json({ ok: true, ...stats })
  } catch (e) {
    const msg = e.message || 'Error al sincronizar cuadros'
    if (msg.includes('admin_update_partido')) {
      res.status(500).json({
        error: 'Falta ejecutar supabase/admin_update_partido.sql en Supabase.',
      })
      return
    }
    res.status(500).json({ error: msg })
  }
}
