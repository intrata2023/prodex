import {
  progressPct,
  countCompletas,
  badgeGrupos,
  gruposPendientesPorParticipante,
} from './participantProgress.js'

const partidosG = [
  { id: 1, grupo: 'A' },
  { id: 2, grupo: 'A' },
  { id: 3, grupo: 'B' },
]

console.assert(progressPct(71, 72) === 99, '71/72 debe mostrar 99%')
console.assert(progressPct(72, 72) === 100, '72/72 debe mostrar 100%')
console.assert(progressPct(72, 73) === 99, '72/73 debe mostrar 99%')
console.assert(badgeGrupos(72, 72) === 'Completo', 'badge completo con todos los partidos')
console.assert(badgeGrupos(71, 72) === 'En curso', 'badge en curso si falta uno')

const done = countCompletas(
  [
    { partido_id: 1, goles_local: 1, goles_visitante: 0 },
    { partido_id: 1, goles_local: 2, goles_visitante: 1 },
    { partido_id: 2, goles_local: 0, goles_visitante: 0 },
  ],
  new Set([1, 2, 3])
)
console.assert(done === 2, 'cuenta partidos únicos completos')

const { gruposPendientes } = gruposPendientesPorParticipante(partidosG, [
  { partido_id: 1, goles_local: 1, goles_visitante: 0 },
  { partido_id: 2, goles_local: 0, goles_visitante: 0 },
])
console.assert(gruposPendientes.includes('B'), 'grupo B pendiente si no tiene predicciones')

console.log('participantProgress.test.js OK')
