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

const m101 = {
  id: 'm101',
  fase: 'sf',
  external_id: 537387,
  ronda: 'Semis · M101',
  equipo_local: 'Francia',
  equipo_visitante: 'España',
}
const m103 = {
  id: 'm103',
  fase: '3p',
  external_id: 537389,
  ronda: '3er puesto · M103 · Perd. M101 vs Perd. M102',
  equipo_local: 'Perdedor del partido 101',
  equipo_visitante: 'Perdedor del partido 102',
}
const m104 = {
  id: 'm104',
  fase: 'final',
  external_id: 537390,
  ronda: 'Final · M104',
  equipo_local: 'Ganador del partido 101',
  equipo_visitante: 'Ganador del partido 102',
}
const semis = [m101, m103, m104]
const resSemi = { goles_local: 1, goles_visitante: 2 }
const avancesSemi = listarAvancesCuadro(semis, { m101: resSemi })
console.assert(
  avancesSemi.some((a) => a.partidoId === 'm104' && a.equipo === 'España'),
  'ganador semi va a la final'
)
console.assert(
  avancesSemi.some((a) => a.partidoId === 'm103' && a.equipo === 'Francia'),
  'perdedor semi va al 3er puesto'
)

const mMorocco = {
  id: 'mMor',
  fase: 'r16',
  external_id: 999,
  ronda: 'Octavos',
  equipo_local: 'Portugal',
  equipo_visitante: 'Marruecos',
}
const resMorocco = {
  goles_local: 1,
  goles_visitante: 1,
  definido_penales: true,
  ganador_penales: 'Morocco',
}
console.assert(
  ganadorRealPartido(mMorocco, resMorocco) === 'Marruecos',
  'ganador penales normalizado al nombre del fixture'
)

console.log('bracketAdvancement.test.js OK')
