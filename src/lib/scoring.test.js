/**
 * Tests manuales: node src/lib/scoring.test.js
 */
import {
  puntosGrupo,
  puntosEliminatoria,
  puntosFinalCampeon,
} from './scoring.js'

const partido = { equipo_local: 'Argentina', equipo_visitante: 'Francia' }

console.assert(puntosGrupo({ goles_local: 2, goles_visitante: 1 }, { goles_local: 2, goles_visitante: 1 }) === 2)
console.assert(puntosGrupo({ goles_local: 2, goles_visitante: 1 }, { goles_local: 1, goles_visitante: 0 }) === 1)
console.assert(puntosGrupo({ goles_local: 1, goles_visitante: 1 }, { goles_local: 0, goles_visitante: 0 }) === 1)

console.assert(
  puntosEliminatoria(
    { goles_local: 1, goles_visitante: 1, penales: true },
    { goles_local: 1, goles_visitante: 1, definido_penales: true, ganador_penales: 'Argentina' },
    partido
  ) === 3
)

console.assert(
  puntosFinalCampeon({
    finalista_1: 'Argentina',
    finalista_2: 'Francia',
    campeonPred: 'Argentina',
    finalistasReales: ['Argentina', 'Francia'],
    campeonReal: 'Argentina',
  }) === 12
)

console.log('OK scoring tests')
