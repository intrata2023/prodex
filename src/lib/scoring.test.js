/**
 * Tests manuales: npm test
 */
import {
  puntosGrupo,
  puntosEliminatoria,
  puntosFinalCampeon,
  resultadoEliminatoriaDefinido,
} from './scoring.js'

const partido = { equipo_local: 'Argentina', equipo_visitante: 'Francia' }

console.assert(puntosGrupo({ goles_local: 2, goles_visitante: 1 }, { goles_local: 2, goles_visitante: 1 }) === 2)
console.assert(puntosGrupo({ goles_local: 2, goles_visitante: 1 }, { goles_local: 1, goles_visitante: 0 }) === 1)
console.assert(puntosGrupo({ goles_local: 1, goles_visitante: 1 }, { goles_local: 0, goles_visitante: 0 }) === 1)

console.assert(
  puntosEliminatoria(
    {
      goles_local: 1,
      goles_visitante: 1,
      penales: true,
      ganador_penales: 'Argentina',
    },
    { goles_local: 1, goles_visitante: 1, definido_penales: true, ganador_penales: 'Argentina' },
    partido
  ) === 5,
  'empate exacto y penales'
)

console.assert(
  puntosEliminatoria(
    {
      goles_local: 1,
      goles_visitante: 1,
      penales: true,
      ganador_penales: 'Francia',
    },
    { goles_local: 1, goles_visitante: 1, definido_penales: true, ganador_penales: 'Argentina' },
    partido
  ) === 2,
  'empate exacto pero penales errados'
)

console.assert(
  puntosEliminatoria(
    { goles_local: 1, goles_visitante: 1, penales: true, ganador_penales: 'Argentina' },
    { goles_local: 1, goles_visitante: 1 },
    partido
  ) === 0,
  'sin penales reales no se puntúa'
)

console.assert(
  puntosEliminatoria(
    { goles_local: 2, goles_visitante: 1 },
    { goles_local: 2, goles_visitante: 1 },
    partido
  ) === 2,
  'resultado exacto sin empate'
)

console.assert(
  puntosEliminatoria(
    { goles_local: 2, goles_visitante: 0 },
    { goles_local: 3, goles_visitante: 1 },
    partido
  ) === 1,
  'acierta ganador parcial'
)

console.assert(
  !resultadoEliminatoriaDefinido(partido, { goles_local: 0, goles_visitante: 0 }),
  'empate real sin penales no está definido'
)

console.assert(
  puntosEliminatoria(
    {
      goles_local: 1,
      goles_visitante: 1,
      penales: true,
      ganador_penales: 'Argentina',
    },
    {
      goles_local: 2,
      goles_visitante: 2,
      definido_penales: true,
      ganador_penales: 'Argentina',
    },
    partido
  ) === 3,
  'penales correctos sin empate exacto en 90 min'
)

console.assert(
  puntosEliminatoria(
    {
      goles_local: 0,
      goles_visitante: 0,
      penales: true,
      ganador_penales: 'Argentina',
    },
    {
      goles_local: 1,
      goles_visitante: 1,
      definido_penales: true,
      ganador_penales: 'Argentina',
    },
    partido
  ) === 3,
  'penales correctos con otro empate en 90 min'
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
