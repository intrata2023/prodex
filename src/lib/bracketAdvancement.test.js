import {
  resultadoCompleto,
  calcularAvanceCuadro,
  listarAvancesCuadro,
} from './bracketAdvancement.js'
import { ganadorRealPartido } from './scoring.js'

const m73 = {
  id: 'm73',
  fase: 'r32',
  external_id: 537417,
  ronda: '16avos · M73 · 2A vs 2B',
  equipo_local: 'Argentina',
  equipo_visitante: 'Francia',
}
const m90 = {
  id: 'm90',
  fase: 'r16',
  external_id: 537376,
  ronda: 'Octavos · M90',
  equipo_local: 'Gan. M73',
  equipo_visitante: 'Gan. M75',
}
const partidos = [m73, m90]

console.assert(
  !resultadoCompleto(m73, { goles_local: 1, goles_visitante: 1 }),
  'empate sin penales no es resultado completo'
)
console.assert(
  resultadoCompleto(m73, {
    goles_local: 1,
    goles_visitante: 1,
    definido_penales: true,
    ganador_penales: 'Argentina',
  }),
  'empate con penales es resultado completo'
)
console.assert(
  resultadoCompleto(m73, { goles_local: 2, goles_visitante: 1 }),
  'victoria en 90 min es resultado completo'
)

const resPenales = {
  goles_local: 1,
  goles_visitante: 1,
  definido_penales: true,
  ganador_penales: 'Argentina',
}
console.assert(
  ganadorRealPartido(m73, resPenales) === 'Argentina',
  'ganador por penales'
)

const avance = calcularAvanceCuadro(m73, resPenales, partidos)
console.assert(avance?.partidoId === 'm90', 'M73 alimenta M90')
console.assert(avance?.field === 'equipo_local', 'ganador M73 va al local de M90')
console.assert(avance?.equipo === 'Argentina', 'equipo avanzado correcto')

const resWin = { goles_local: 3, goles_visitante: 1 }
console.assert(
  calcularAvanceCuadro(m73, resWin, partidos)?.equipo === 'Argentina',
  'ganador en 90 min avanza'
)

const avances = listarAvancesCuadro(partidos, { m73: resPenales })
console.assert(avances.length === 1 && avances[0].equipo === 'Argentina', 'lista avances')

console.log('bracketAdvancement.test.js OK')
