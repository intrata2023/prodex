/** Escudos estáticos (football-data.org) — fallback si /api/wc-matches falla o tarda. */
export const TEAM_STATIC_CRESTS = {
  algeria: 'https://crests.football-data.org/algeria.svg',
  argentina: 'https://crests.football-data.org/762.png',
  australia: 'https://crests.football-data.org/779.svg',
  austria: 'https://crests.football-data.org/816.svg',
  belgium: 'https://crests.football-data.org/805.svg',
  'bosnia-herzegovina': 'https://crests.football-data.org/bosnia.svg',
  brazil: 'https://crests.football-data.org/764.svg',
  canada: 'https://crests.football-data.org/canada.svg',
  'cape verde islands': 'https://crests.football-data.org/cape_verde.svg',
  colombia: 'https://crests.football-data.org/818.svg',
  'congo dr': 'https://crests.football-data.org/congo_dr.svg',
  croatia: 'https://crests.football-data.org/799.svg',
  curacao: 'https://crests.football-data.org/curacao.svg',
  czechia: 'https://crests.football-data.org/798.svg',
  ecuador: 'https://crests.football-data.org/791.svg',
  egypt: 'https://crests.football-data.org/825.svg',
  england: 'https://crests.football-data.org/770.svg',
  france: 'https://crests.football-data.org/773.svg',
  germany: 'https://crests.football-data.org/759.svg',
  ghana: 'https://crests.football-data.org/ghana.svg',
  haiti: 'https://crests.football-data.org/haiti.svg',
  iran: 'https://crests.football-data.org/iran.svg',
  iraq: 'https://crests.football-data.org/iraq.svg',
  'ivory coast': 'https://crests.football-data.org/787.svg',
  japan: 'https://crests.football-data.org/766.svg',
  jordan: 'https://crests.football-data.org/8049.png',
  mexico: 'https://crests.football-data.org/769.svg',
  morocco: 'https://crests.football-data.org/morocco.svg',
  netherlands: 'https://crests.football-data.org/8601.svg',
  'new zealand': 'https://crests.football-data.org/783.svg',
  norway: 'https://crests.football-data.org/813.svg',
  panama: 'https://crests.football-data.org/panama.svg',
  paraguay: 'https://crests.football-data.org/761.svg',
  portugal: 'https://crests.football-data.org/765.svg',
  qatar: 'https://crests.football-data.org/8030.svg',
  'saudi arabia': 'https://crests.football-data.org/saudi_arabia.svg',
  scotland: 'https://crests.football-data.org/814.svg',
  senegal: 'https://crests.football-data.org/senegal.svg',
  'south africa': 'https://crests.football-data.org/9396.svg',
  'south korea': 'https://crests.football-data.org/772.png',
  spain: 'https://crests.football-data.org/760.svg',
  sweden: 'https://crests.football-data.org/792.svg',
  switzerland: 'https://crests.football-data.org/788.svg',
  tunisia: 'https://crests.football-data.org/tunisia.svg',
  turkey: 'https://crests.football-data.org/803.svg',
  'united states': 'https://crests.football-data.org/usa.svg',
  uruguay: 'https://crests.football-data.org/758.svg',
  uzbekistan: 'https://crests.football-data.org/8070.png',
}

/** Nombres en PRODEX (español) → nombre en football-data.org para buscar escudo. */
export const TEAM_CREST_ALIASES = {
  sudafrica: 'South Africa',
  'south africa': 'South Africa',
  canada: 'Canada',
  canadá: 'Canada',
  alemania: 'Germany',
  germany: 'Germany',
  paraguay: 'Paraguay',
  francia: 'France',
  france: 'France',
  suecia: 'Sweden',
  sweden: 'Sweden',
  'paises bajos': 'Netherlands',
  'países bajos': 'Netherlands',
  holanda: 'Netherlands',
  netherlands: 'Netherlands',
  marruecos: 'Morocco',
  morocco: 'Morocco',
  espana: 'Spain',
  españa: 'Spain',
  spain: 'Spain',
  'estados unidos': 'United States',
  usa: 'United States',
  'united states': 'United States',
  belgica: 'Belgium',
  bélgica: 'Belgium',
  belgium: 'Belgium',
  brasil: 'Brazil',
  brazil: 'Brazil',
  japon: 'Japan',
  japón: 'Japan',
  japan: 'Japan',
  'costa de marfil': 'Ivory Coast',
  'ivory coast': 'Ivory Coast',
  noruega: 'Norway',
  norway: 'Norway',
  mexico: 'Mexico',
  méxico: 'Mexico',
  argentina: 'Argentina',
  'cabo verde': 'Cape Verde Islands',
  'cape verde': 'Cape Verde Islands',
  'cape verde islands': 'Cape Verde Islands',
  australia: 'Australia',
  egipto: 'Egypt',
  egypt: 'Egypt',
  suiza: 'Switzerland',
  switzerland: 'Switzerland',
  'bosnia-herzegovina': 'Bosnia-Herzegovina',
  'bosnia herzegovina': 'Bosnia-Herzegovina',
  inglaterra: 'England',
  england: 'England',
  croacia: 'Croatia',
  croatia: 'Croatia',
  uruguay: 'Uruguay',
  colombia: 'Colombia',
  'rd congo': 'Congo DR',
  'congo dr': 'Congo DR',
  chile: 'Chile',
  ecuador: 'Ecuador',
  peru: 'Peru',
  perú: 'Peru',
  portugal: 'Portugal',
  italia: 'Italy',
  italy: 'Italy',
  turquia: 'Turkey',
  turkey: 'Turkey',
  'corea del sur': 'South Korea',
  'south korea': 'South Korea',
  'arabia saudita': 'Saudi Arabia',
  'saudi arabia': 'Saudi Arabia',
  senegal: 'Senegal',
  ghana: 'Ghana',
  nigeria: 'Nigeria',
  camerun: 'Cameroon',
  cameroon: 'Cameroon',
  tunisia: 'Tunisia',
  tunez: 'Tunisia',
  túnez: 'Tunisia',
  argelia: 'Algeria',
  algeria: 'Algeria',
  iran: 'Iran',
  qatar: 'Qatar',
  panama: 'Panama',
  panamá: 'Panama',
  'nueva zelanda': 'New Zealand',
  'new zealand': 'New Zealand',
  escocia: 'Scotland',
  scotland: 'Scotland',
  austria: 'Austria',
  'republica checa': 'Czechia',
  'rep. checa': 'Czechia',
  'república checa': 'Czechia',
  czechia: 'Czechia',
  curazao: 'Curaçao',
  curaçao: 'Curaçao',
  haiti: 'Haiti',
  haití: 'Haiti',
  jordania: 'Jordan',
  jordan: 'Jordan',
  uzbekistan: 'Uzbekistan',
  uzbequistán: 'Uzbekistan',
  irak: 'Iraq',
  iraq: 'Iraq',
}

export function normTeamCrestKey(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
}

export function apiTeamNameForCrest(displayName) {
  const key = normTeamCrestKey(displayName)
  return TEAM_CREST_ALIASES[key] || displayName
}

/** Clave canónica para comparar equipos (español/inglés, acentos, etc.). */
export function canonicalTeamKey(name) {
  return normTeamCrestKey(apiTeamNameForCrest(name))
}

export function equiposEquivalentes(a, b) {
  if (!a || !b) return false
  return canonicalTeamKey(a) === canonicalTeamKey(b)
}

/** Si el nombre coincide con local o visitante del partido, devuelve el del fixture. */
export function resolverEquipoEnPartido(nombre, partido) {
  if (!nombre || !partido) return nombre
  if (equiposEquivalentes(nombre, partido.equipo_local)) return partido.equipo_local
  if (equiposEquivalentes(nombre, partido.equipo_visitante)) return partido.equipo_visitante
  return nombre
}

/** Igual que resolverEquipoEnPartido pero contra una lista (finalistas, cuadro, etc.). */
export function resolverEquipoEnLista(nombre, equipos) {
  if (!nombre || !equipos?.length) return nombre
  const hit = equipos.find((e) => equiposEquivalentes(e, nombre))
  return hit ?? nombre
}

/** Cruce local/visitante equivalente (p. ej. API en inglés vs PRODEX en español). */
export function partidosMismosEquipos(partido, local, visitante) {
  if (!partido) return false
  const directo =
    equiposEquivalentes(partido.equipo_local, local) &&
    equiposEquivalentes(partido.equipo_visitante, visitante)
  const invertido =
    equiposEquivalentes(partido.equipo_local, visitante) &&
    equiposEquivalentes(partido.equipo_visitante, local)
  return directo || invertido
}

export function staticCrestForTeam(displayName) {
  const key = normTeamCrestKey(displayName)
  if (TEAM_STATIC_CRESTS[key]) return TEAM_STATIC_CRESTS[key]
  const apiName = apiTeamNameForCrest(displayName)
  return TEAM_STATIC_CRESTS[normTeamCrestKey(apiName)] || null
}
