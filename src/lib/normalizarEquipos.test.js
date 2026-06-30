import { listarCorreccionesNombresEquipos } from './normalizarEquipos.js'

const partidos = [
  {
    id: 'p1',
    fase: 'r16',
    equipo_local: 'Portugal',
    equipo_visitante: 'Marruecos',
  },
]

const predicciones = [
  {
    participante_id: 'u1',
    partido_id: 'p1',
    goles_local: 1,
    goles_visitante: 1,
    penales: true,
    ganador_penales: 'Morocco',
  },
]

const resultados = [
  {
    partido_id: 'p1',
    goles_local: 1,
    goles_visitante: 1,
    definido_penales: true,
    ganador_penales: 'Morocco',
  },
]

const { predFixes, resFixes } = listarCorreccionesNombresEquipos(partidos, predicciones, resultados)
console.assert(predFixes.length === 1 && predFixes[0].ganador_penales === 'Marruecos', 'pred Morocco')
console.assert(resFixes.length === 1 && resFixes[0].ganador_penales === 'Marruecos', 'res Morocco')

console.log('normalizarEquipos.test.js OK')
