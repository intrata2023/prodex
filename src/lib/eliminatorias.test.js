import {
  cuadroR32Completo,
  cruceEliminatoriaCompleto,
  equiposMitadCuadro,
  equiposOpcionesCruceAdmin,
  partidoEdicionCerrada,
  campeonEdicionCerrada,
  isPlaceholderEquipo,
  mensajePrediccionContrincante,
  mostrarPrediccionesContrincantes,
} from './eliminatorias.js'

const r32 = Array.from({ length: 16 }, (_, i) => ({
  fase: 'r32',
  orden: i + 1,
  equipo_local: `Local ${i}`,
  equipo_visitante: `Visit ${i}`,
  fecha: '2026-07-01T20:00:00Z',
}))

console.assert(!isPlaceholderEquipo('Argentina'))
console.assert(isPlaceholderEquipo('16avos · Local 1'))
console.assert(!cruceEliminatoriaCompleto({ fase: 'r32', equipo_local: 'Argentina', equipo_visitante: '16avos de final · Visitante 1' }))
console.assert(cruceEliminatoriaCompleto({ fase: 'r32', equipo_local: 'Argentina', equipo_visitante: 'Francia' }))
console.assert(cuadroR32Completo(r32))

const incompleto = [{ ...r32[0], equipo_local: '16avos · Local 1' }, ...r32.slice(1)]
console.assert(!cuadroR32Completo(incompleto))

const izq = equiposMitadCuadro(r32, 'izq')
console.assert(izq.length === 16 && izq.includes('Local 0') && !izq.includes('Local 8'))

const partido = { fecha: '2026-07-01T20:00:00Z' }
const unaHoraAntes = new Date('2026-07-01T19:00:00Z').getTime()
console.assert(!partidoEdicionCerrada(partido, unaHoraAntes - 1))
console.assert(partidoEdicionCerrada(partido, unaHoraAntes))
console.assert(campeonEdicionCerrada(r32, unaHoraAntes))

const elimAbierto = { fase: 'r32', equipo_local: 'Argentina', equipo_visitante: 'Francia', fecha: '2026-07-01T20:00:00Z' }
console.assert(!mostrarPrediccionesContrincantes(elimAbierto, { eliminatoriasAbiertos: true, ahora: unaHoraAntes - 1 }))
console.assert(mostrarPrediccionesContrincantes(elimAbierto, { eliminatoriasAbiertos: true, ahora: unaHoraAntes }))
console.assert(mostrarPrediccionesContrincantes(elimAbierto, { eliminatoriasAbiertos: false, ahora: unaHoraAntes - 1 }))
console.assert(mostrarPrediccionesContrincantes({ fase: 'grupos', equipo_local: 'A', equipo_visitante: 'B' }))
console.assert(!mostrarPrediccionesContrincantes({ fase: 'r32', equipo_local: '16avos · Local 1', equipo_visitante: 'Francia' }))
console.assert(mensajePrediccionContrincante(elimAbierto, { eliminatoriasAbiertos: true, ahora: unaHoraAntes - 1 })?.includes('Disponible desde'))

const base = ['Argentina', 'Francia', 'Brasil', 'Alemania']
const p1 = { id: 'a', fase: 'r32', equipo_local: 'Argentina', equipo_visitante: 'Por definir' }
const p2 = { id: 'b', fase: 'r32', equipo_local: 'Francia', equipo_visitante: 'Brasil' }
const optsLocal = equiposOpcionesCruceAdmin([p1, p2], p1, 'local', base)
console.assert(optsLocal.includes('Argentina') && !optsLocal.includes('Francia') && !optsLocal.includes('Brasil'))
const optsVisit = equiposOpcionesCruceAdmin([p1, p2], p1, 'visitante', base)
console.assert(!optsVisit.includes('Argentina') && optsVisit.includes('Alemania') && !optsVisit.includes('Francia'))

console.log('eliminatorias.test.js OK')
