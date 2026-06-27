import {
  normTeamCrestKey,
  apiTeamNameForCrest,
  TEAM_CREST_ALIASES,
  staticCrestForTeam,
} from './teamCrestAliases.js'

console.assert(normTeamCrestKey('Países Bajos') === 'paises bajos', 'norm sin acentos')
console.assert(apiTeamNameForCrest('Sudáfrica') === 'South Africa', 'alias sudafrica')
console.assert(apiTeamNameForCrest('Costa de Marfil') === 'Ivory Coast', 'alias cmarfil')
console.assert(apiTeamNameForCrest('Cabo Verde') === 'Cape Verde Islands', 'alias cabo verde')
console.assert(staticCrestForTeam('Sudáfrica')?.includes('9396'), 'crest statico sudafrica')
console.assert(staticCrestForTeam('2J') == null, 'slot sin crest')

console.log('teamCrestAliases.test.js OK')
