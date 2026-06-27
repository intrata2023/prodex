import { normTeamCrestKey, apiTeamNameForCrest, TEAM_CREST_ALIASES } from './teamCrestAliases.js'

console.assert(normTeamCrestKey('Países Bajos') === 'paises bajos', 'norm sin acentos')
console.assert(apiTeamNameForCrest('Sudáfrica') === 'South Africa', 'alias sudafrica')
console.assert(apiTeamNameForCrest('Costa de Marfil') === 'Ivory Coast', 'alias cmarfil')
console.assert(apiTeamNameForCrest('Cabo Verde') === 'Cape Verde Islands', 'alias cabo verde')
console.assert(TEAM_CREST_ALIASES['bosnia-herzegovina'] === 'Bosnia-Herzegovina', 'bosnia')

console.log('teamCrestAliases.test.js OK')
