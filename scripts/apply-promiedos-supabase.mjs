/**
 * Aplica cuadro Promiedos en Supabase (solo UPDATE/INSERT, sin borrar predicciones).
 * Requiere .env: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_ADMIN_PIN
 *
 * node scripts/apply-promiedos-supabase.mjs
 */
import fs from 'fs'
import { createClient } from '@supabase/supabase-js'
import { syncEquiposFromPromiedos } from '../api/lib/syncPromiedosServer.js'

function loadEnv() {
  const envPath = new URL('../.env', import.meta.url)
  const env = {}
  if (!fs.existsSync(envPath)) return env
  let raw = fs.readFileSync(envPath, 'utf8')
  if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1)
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq <= 0) continue
    const key = trimmed.slice(0, eq).trim()
    let val = trimmed.slice(eq + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    env[key] = val
  }
  return env
}

const env = loadEnv()
const url = env.VITE_SUPABASE_URL || env.SUPABASE_URL
const key = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY
const pin = env.ADMIN_SYNC_PIN || env.SYNC_ADMIN_PIN || env.VITE_ADMIN_PIN

if (!url || !key) {
  console.error('Faltan VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en .env')
  process.exit(1)
}
if (!pin) {
  console.error('Falta VITE_ADMIN_PIN (o ADMIN_SYNC_PIN) en .env')
  process.exit(1)
}

const supabase = createClient(url, key)
const stats = await syncEquiposFromPromiedos(supabase, pin)

console.log('Promiedos aplicado en Supabase:')
console.log(JSON.stringify(stats, null, 2))

const { count } = await supabase
  .from('predicciones')
  .select('*', { count: 'exact', head: true })

console.log(`Predicciones en DB (sin cambios esperados): ${count ?? '?'}`)
