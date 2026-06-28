/**
 * Restaura octavos a placeholders (UPDATE directo, sin PIN admin).
 * Uso: node scripts/reset-octavos.mjs
 */
import { createClient } from '@supabase/supabase-js'

const url = process.env.VITE_SUPABASE_URL
const key = process.env.VITE_SUPABASE_ANON_KEY

const OCTAVOS = [
  { external_id: 537375, local: 'Gan. M74', visitante: 'Gan. M77' },
  { external_id: 537376, local: 'Gan. M73', visitante: 'Gan. M75' },
  { external_id: 537379, local: 'Gan. M83', visitante: 'Gan. M84' },
  { external_id: 537380, local: 'Gan. M81', visitante: 'Gan. M82' },
  { external_id: 537377, local: 'Gan. M76', visitante: 'Gan. M78' },
  { external_id: 537378, local: 'Gan. M79', visitante: 'Gan. M80' },
  { external_id: 537381, local: 'Gan. M86', visitante: 'Gan. M88' },
  { external_id: 537382, local: 'Gan. M85', visitante: 'Gan. M87' },
]

if (!url || !key) {
  console.error('Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY')
  process.exit(1)
}

const supabase = createClient(url, key)

const { data: partidos, error } = await supabase
  .from('partidos')
  .select('id, external_id, ronda, equipo_local, equipo_visitante')
  .eq('fase', 'r16')

if (error) {
  console.error(error)
  process.exit(1)
}

let ok = 0
for (const slot of OCTAVOS) {
  const p = partidos.find((x) => Number(x.external_id) === slot.external_id)
  if (!p) {
    console.warn('No encontrado external_id', slot.external_id)
    continue
  }
  if (p.equipo_local === slot.local && p.equipo_visitante === slot.visitante) {
    console.log('OK ya placeholder:', p.ronda)
    ok++
    continue
  }
  const { error: e1 } = await supabase
    .from('partidos')
    .update({ equipo_local: slot.local, equipo_visitante: slot.visitante })
    .eq('id', p.id)
  if (e1) {
    console.error('Error', p.ronda, e1.message)
    continue
  }
  console.log('Reset:', p.ronda, `${p.equipo_local}/${p.equipo_visitante} → ${slot.local}/${slot.visitante}`)
  ok++
}

console.log(`Listo: ${ok}/${OCTAVOS.length} octavos`)

const { data: check } = await supabase
  .from('partidos')
  .select('ronda, equipo_local, equipo_visitante')
  .eq('fase', 'r16')
  .order('orden')
console.table(check)
