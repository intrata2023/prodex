/**
 * Vista previa del cuadro Promiedos vs slots PRODEX (sin escribir en Supabase).
 * node scripts/sync-promiedos-bracket.mjs
 */
import fs from 'fs'
import {
  fetchPromiedosBracketPartidos,
  mapPromiedosBracket,
  parsePromiedosNextData,
  isSlotPlaceholder,
} from '../src/lib/promiedosBracket.js'

const useCache = process.argv.includes('--cache') && fs.existsSync('tmp-promiedos.html')

let rows
if (useCache) {
  const html = fs.readFileSync('tmp-promiedos.html', 'utf8')
  rows = mapPromiedosBracket(parsePromiedosNextData(html), 72)
} else {
  rows = await fetchPromiedosBracketPartidos(72)
}

console.log(`\nPromiedos — ${rows.length} cruces\n`)
for (const r of rows) {
  const loc = isSlotPlaceholder(r.equipo_local) ? `[${r.equipo_local}]` : r.equipo_local
  const vis = isSlotPlaceholder(r.equipo_visitante) ? `[${r.equipo_visitante}]` : r.equipo_visitante
  console.log(`${r.fase.padEnd(5)} ext=${r.external_id}  ${loc} vs ${vis}`)
}
