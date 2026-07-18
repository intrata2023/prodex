import {
  EXTERNAL_TO_FIFA_MATCH,
  BRACKET_POSITION_BY_FIFA,
  bracketOrdenGlobal,
  etiquetaSlotFifa,
  sortPartidosCuadro,
  fifaMatchNo,
} from './fifaBracket2026.js'

console.assert(Object.keys(EXTERNAL_TO_FIFA_MATCH).length === 32, '32 external ids mapeados')
console.assert(EXTERNAL_TO_FIFA_MATCH[537389] === 103, '3er puesto = M103')
console.assert(BRACKET_POSITION_BY_FIFA['3p'][103] === 1, 'M103 en fase 3p')
console.assert(EXTERNAL_TO_FIFA_MATCH[537417] === 73, 'SA-Canadá = M73')
console.assert(EXTERNAL_TO_FIFA_MATCH[537416] === 77, 'Francia-Suecia = M77')
console.assert(BRACKET_POSITION_BY_FIFA.r32[74] === 1, 'M74 primero en cuadro Promiedos')
console.assert(BRACKET_POSITION_BY_FIFA.r32[77] === 2, 'M77 segundo en cuadro')
console.assert(BRACKET_POSITION_BY_FIFA.r32[83] === 5, 'M83 antes que M84')
console.assert(BRACKET_POSITION_BY_FIFA.r32[84] === 6, 'M84 sexto')
console.assert(bracketOrdenGlobal('r32', 74, 72) === 73, 'orden global M74')
console.assert(etiquetaSlotFifa(73) === 'M73 · 2A vs 2B', 'etiqueta M73')

const r32 = [
  { id: 'a', fase: 'r32', external_id: 537417, orden: 99 },
  { id: 'b', fase: 'r32', external_id: 537415, orden: 1 },
  { id: 'c', fase: 'r32', external_id: 537416, orden: 2 },
]
const sorted = sortPartidosCuadro(r32, 'r32')
console.assert(sorted[0].external_id === 537415, 'M74 primero')
console.assert(sorted[1].external_id === 537416, 'M77 segundo')
console.assert(sorted[2].external_id === 537417, 'M73 tercero')

console.assert(fifaMatchNo({ ronda: '16avos · M73 · 2A vs 2B' }) === 73, 'parse M desde ronda')

console.log('fifaBracket2026.test.js OK')
