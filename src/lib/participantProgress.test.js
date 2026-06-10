import {
  progressPct,
  countCompletas,
  countGruposCompletas,
  badgeGrupos,
  gruposPendientesPorParticipante,
  listPartidosPendientes,
  detectarDuplicados,
} from './participantProgress.js'

const partidosG = [
  { id: 1, grupo: 'A', equipo_local: 'México', equipo_visitante: 'Sudáfrica', orden: 1 },
  { id: 2, grupo: 'A', equipo_local: 'México', equipo_visitante: 'Sudáfrica', orden: 99 },
  { id: 3, grupo: 'B', equipo_local: 'Brasil', equipo_visitante: 'Croacia', orden: 2 },
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

const grupos = countGruposCompletas(partidosG, [
  { partido_id: 1, goles_local: 2, goles_visitante: 1 },
])
console.assert(grupos.done === 1 && grupos.total === 2, 'fixture duplicado cuenta una vez')

const duplicados = detectarDuplicados(partidosG)
console.assert(duplicados.length === 1 && duplicados[0].grupo === 'A', 'detecta duplicado en grupo A')

const pendientes = listPartidosPendientes(partidosG, [
  { partido_id: 1, goles_local: 1, goles_visitante: 0 },
])
console.assert(pendientes.length === 1 && pendientes[0].grupo === 'B', 'lista fixture B pendiente')

const { gruposPendientes } = gruposPendientesPorParticipante(partidosG, [
  { partido_id: 1, goles_local: 1, goles_visitante: 0 },
])
console.assert(gruposPendientes.includes('B'), 'grupo B pendiente si falta un fixture')

console.log('participantProgress.test.js OK')
