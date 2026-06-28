/**
 * Tests: node src/lib/promiedosBracket.test.js
 */
import fs from 'fs'
import {
  mapPromiedosBracket,
  parsePromiedosNextData,
  isSlotPlaceholder,
  normalizePromiedosTeam,
} from './promiedosBracket.js'

const html = fs.readFileSync('tmp-promiedos.html', 'utf8')
const brackets = parsePromiedosNextData(html)
const rows = mapPromiedosBracket(brackets, 72)

console.assert(rows.length === 31, `esperaba 31 cruces, hay ${rows.length}`)
console.assert(rows[0].external_id === 537415, 'M74 primero')
console.assert(rows[0].equipo_local === 'Alemania', 'M74 local')
console.assert(rows[0].equipo_visitante === 'Paraguay', 'M74 visitante')
console.assert(rows[4].equipo_local === '2K', 'M83 slot 2K')
console.assert(rows[4].equipo_visitante === 'Croacia', 'M83 visitante Croacia')
console.assert(isSlotPlaceholder('2K'), '2K es placeholder')
console.assert(isSlotPlaceholder('Ganador del partido 74'), 'ganador es placeholder')
console.assert(!isSlotPlaceholder('Argentina'), 'Argentina no es placeholder')
console.assert(
  normalizePromiedosTeam('Bosnia Herzegovina') === 'Bosnia-Herzegovina',
  'normaliza Bosnia'
)

console.log('promiedosBracket.test.js OK', rows.length, 'cruces')
