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
  letrasGruposIncompletos,
  progresoPorFase,
  progresoGlobalFase,
  prediccionCompletaEliminatoria,
  prediccionCompletaCruce,
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

const incompletos = letrasGruposIncompletos(partidosG, {
  1: { partido_id: 1, goles_local: 1, goles_visitante: 0 },
})
console.assert(incompletos.includes('B') && incompletos.includes('L'), 'lista grupos incompletos')

const partidosElim = [
  { id: 10, fase: 'r32', equipo_local: 'Argentina', equipo_visitante: 'Brasil', orden: 1 },
  { id: 11, fase: 'r32', equipo_local: '2K', equipo_visitante: 'Croacia', orden: 2 },
  { id: 12, fase: 'qf', equipo_local: 'Gan. M73', equipo_visitante: 'Gan. M74', orden: 3 },
  { id: 13, fase: 'qf', equipo_local: 'Francia', equipo_visitante: 'Alemania', orden: 4 },
]

const r32 = progresoPorFase(partidosElim, [{ partido_id: 10, goles_local: 1, goles_visitante: 0 }], 'r32')
console.assert(r32.total === 1 && r32.done === 1 && r32.activa, 'r32 solo cuenta cruces completos')

const qf = progresoPorFase(partidosElim, [], 'qf')
console.assert(qf.total === 1 && qf.activa, 'qf solo un cruce real')

const qfEmpty = progresoPorFase(
  [{ id: 12, fase: 'qf', equipo_local: 'Gan. M73', equipo_visitante: 'Gan. M74' }],
  [],
  'qf'
)
console.assert(!qfEmpty.activa && qfEmpty.total === 0, 'qf sin equipos reales = inactiva')

const globalQf = progresoGlobalFase(partidosElim, [], ['u1', 'u2'], 'qf')
console.assert(globalQf.nPartidos === 1 && globalQf.total === 2, 'global fase usa predecibles')

const pElim = { id: 10, fase: 'r32', equipo_local: 'Argentina', equipo_visitante: 'Brasil' }
console.assert(
  !prediccionCompletaEliminatoria({ goles_local: 1, goles_visitante: 1 }),
  'empate sin penales incompleto'
)
console.assert(
  prediccionCompletaCruce(
    { goles_local: 1, goles_visitante: 1, penales: true, ganador_penales: 'Argentina' },
    pElim
  ),
  'empate con penales completo'
)

const r32Empate = progresoPorFase(
  partidosElim,
  [{ partido_id: 10, goles_local: 1, goles_visitante: 1 }],
  'r32'
)
console.assert(r32Empate.done === 0, 'empate sin penales no cuenta como hecho')

console.log('participantProgress.test.js OK')
