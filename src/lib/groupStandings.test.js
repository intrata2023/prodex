import { buildGroupStandings } from './groupStandings.js'

const partidosA = [
  { id: 1, fase: 'grupos', grupo: 'A', equipo_local: 'México', equipo_visitante: 'Sudáfrica' },
  { id: 2, fase: 'grupos', grupo: 'A', equipo_local: 'Corea del Sur', equipo_visitante: 'Rep. Checa' },
  { id: 3, fase: 'grupos', grupo: 'A', equipo_local: 'México', equipo_visitante: 'Corea del Sur' },
  { id: 4, fase: 'grupos', grupo: 'A', equipo_local: 'Sudáfrica', equipo_visitante: 'Rep. Checa' },
  { id: 5, fase: 'grupos', grupo: 'A', equipo_local: 'México', equipo_visitante: 'Rep. Checa' },
  { id: 6, fase: 'grupos', grupo: 'A', equipo_local: 'Sudáfrica', equipo_visitante: 'Corea del Sur' },
]

const partidosB = [
  { id: 7, fase: 'grupos', grupo: 'B', equipo_local: 'Brasil', equipo_visitante: 'Marruecos' },
  { id: 8, fase: 'grupos', grupo: 'B', equipo_local: 'Croacia', equipo_visitante: 'Japón' },
  { id: 9, fase: 'grupos', grupo: 'B', equipo_local: 'Brasil', equipo_visitante: 'Croacia' },
  { id: 10, fase: 'grupos', grupo: 'B', equipo_local: 'Marruecos', equipo_visitante: 'Japón' },
  { id: 11, fase: 'grupos', grupo: 'B', equipo_local: 'Brasil', equipo_visitante: 'Japón' },
  { id: 12, fase: 'grupos', grupo: 'B', equipo_local: 'Marruecos', equipo_visitante: 'Croacia' },
]

const predicciones = {
  1: { goles_local: 2, goles_visitante: 1 },
  2: { goles_local: 1, goles_visitante: 1 },
  3: { goles_local: 3, goles_visitante: 0 },
  4: { goles_local: 0, goles_visitante: 2 },
  5: { goles_local: 2, goles_visitante: 0 },
  6: { goles_local: 1, goles_visitante: 1 },
  7: { goles_local: 2, goles_visitante: 0 },
  8: { goles_local: 0, goles_visitante: 0 },
  9: { goles_local: 3, goles_visitante: 1 },
  10: { goles_local: 1, goles_visitante: 1 },
  11: { goles_local: 2, goles_visitante: 0 },
  12: { goles_local: 0, goles_visitante: 1 },
}

const { grupos, mejoresTerceros } = buildGroupStandings(
  [...partidosA, ...partidosB],
  predicciones
)
const grupoA = grupos.find((g) => g.letra === 'A')
const terceroA = grupoA.standings.find((s) => s.pos === 3)

console.assert(grupos.length === 2, 'dos grupos')
console.assert(grupoA.standings[0].clasificaComo === 'directo', '1° clasifica directo')
console.assert(grupoA.standings[1].clasificaComo === 'directo', '2° clasifica directo')
console.assert(mejoresTerceros.length <= 8, 'máximo 8 terceros')
console.assert(terceroA.clasificaComo === 'tercero' || !terceroA.clasifica, '3° según ranking global')

const directos = grupos.flatMap((g) => g.standings.filter((s) => s.clasificaComo === 'directo'))
const terceros = grupos.flatMap((g) => g.standings.filter((s) => s.clasificaComo === 'tercero'))
console.assert(directos.length === 4, '4 directos en 2 grupos')
console.assert(terceros.length === mejoresTerceros.length, 'terceros marcados = chip list')

console.log('groupStandings.test.js OK')
