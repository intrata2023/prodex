import {
  progressPct,
  countCompletas,
  countGruposCompletas,
  badgeGrupos,
  gruposPendientesPorParticipante,
  listPartidosPendientes,
  detectarDuplicados,
  mapPrediccionesACanonica,
  reparacionesPredicciones,
} from './participantProgress.js'

const partidosG = [
  { id: 1, grupo: 'A', equipo_local: 'México', equipo_visitante: 'Sudáfrica', orden: 1 },
  { id: 2, grupo: 'A', equipo_local: 'México', equipo_visitante: 'Sudáfrica', orden: 99 },
  { id: 3, grupo: 'B', equipo_local: 'Brasil', equipo_visitante: 'Croacia', orden: 2 },
  {
    id: 4,
    grupo: 'L',
    equipo_local: 'Croatia',
    equipo_visitante: 'Ghana',
    orden: 10,
    external_id: 100,
  },
  {
    id: 5,
    grupo: 'L',
    equipo_local: 'Ghana',
    equipo_visitante: 'Croatia',
    orden: 11,
    external_id: 100,
  },
]

console.assert(progressPct(71, 72) === 99, '71/72 debe mostrar 99%')
console.assert(progressPct(72, 72) === 100, '72/72 debe mostrar 100%')
console.assert(badgeGrupos(2, 2) === 'Completo', 'badge completo con todos los fixtures')

const done = countCompletas(
  [
    { partido_id: 1, goles_local: 1, goles_visitante: 0 },
    { partido_id: 1, goles_local: 2, goles_visitante: 1 },
    { partido_id: 2, goles_local: 0, goles_visitante: 0 },
  ],
  new Set([1, 2, 3])
)
console.assert(done === 2, 'cuenta partidos únicos completos')

const predL = [{ partido_id: 5, goles_local: 1, goles_visitante: 2 }]
const grupos = countGruposCompletas(partidosG, predL)
console.assert(grupos.done === 1, 'pred en fila duplicada cuenta para el cruce L')

const pendientes = listPartidosPendientes(partidosG, predL)
console.assert(!pendientes.some((p) => p.grupo === 'L'), 'grupo L no pendiente con pred en duplicado')

const fixes = reparacionesPredicciones(partidosG, {
  5: { partido_id: 5, goles_local: 1, goles_visitante: 2 },
})
console.assert(fixes.length === 1 && fixes[0].partido_id === 4, 'repara pred al partido canónico')

const mapped = mapPrediccionesACanonica(partidosG, {
  5: { partido_id: 5, goles_local: 1, goles_visitante: 2 },
})
console.assert(mapped[4]?.goles_visitante === 2, 'mapea pred duplicada al canónico')

const { gruposPendientes } = gruposPendientesPorParticipante(partidosG, predL)
console.assert(!gruposPendientes.includes('L'), 'grupo L completo con pred en fila duplicada')

const duplicados = detectarDuplicados(partidosG)
console.assert(duplicados.length >= 1, 'detecta duplicados')

console.log('participantProgress.test.js OK')
