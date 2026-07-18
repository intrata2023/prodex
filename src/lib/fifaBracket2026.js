/**
 * Cuadro eliminatorio FIFA WC 2026 — orden visual tipo Promiedos / BracketView.
 * Fuente: Reglamento FIFA (M73–M104) + football-data.org external_id.
 *
 * El orden dentro de cada fase define mitad izq/der (primeros N/2 = izquierda).
 */

/** football-data.org id → número de partido FIFA */
export const EXTERNAL_TO_FIFA_MATCH = {
  537417: 73,
  537423: 76,
  537415: 74,
  537418: 75,
  537424: 78,
  537416: 77,
  537425: 79,
  537426: 80,
  537422: 82,
  537421: 81,
  537420: 84,
  537419: 83,
  537429: 85,
  537428: 88,
  537427: 86,
  537430: 87,
  537376: 90,
  537375: 89,
  537377: 91,
  537378: 92,
  537379: 93,
  537380: 94,
  537381: 95,
  537382: 96,
  537383: 97,
  537384: 98,
  537385: 99,
  537386: 100,
  537387: 101,
  537388: 102,
  537389: 103,
  537390: 104,
}

/** Posición en el árbol del cuadro (1-based) por número FIFA */
export const BRACKET_POSITION_BY_FIFA = {
  r32: {
    74: 1,
    77: 2,
    73: 3,
    75: 4,
    83: 5,
    84: 6,
    81: 7,
    82: 8,
    76: 9,
    78: 10,
    79: 11,
    80: 12,
    86: 13,
    88: 14,
    85: 15,
    87: 16,
  },
  r16: { 89: 1, 90: 2, 93: 3, 94: 4, 91: 5, 92: 6, 95: 7, 96: 8 },
  qf: { 97: 1, 98: 2, 99: 3, 100: 4 },
  sf: { 101: 1, 102: 2 },
  '3p': { 103: 1 },
  final: { 104: 1 },
}

/** Etiquetas de slot (como Promiedos) */
export const FIFA_SLOT_LABELS = {
  73: { local: '2A', visitante: '2B' },
  74: { local: '1E', visitante: '3° A/B/C/D/F' },
  75: { local: '1F', visitante: '2C' },
  76: { local: '1C', visitante: '2F' },
  77: { local: '1I', visitante: '3° C/D/F/G/H' },
  78: { local: '2E', visitante: '2I' },
  79: { local: '1A', visitante: '3° C/E/F/H/I' },
  80: { local: '1L', visitante: '3° E/H/I/J/K' },
  81: { local: '1D', visitante: '3° B/E/F/I/J' },
  82: { local: '1G', visitante: '3° A/E/H/I/J' },
  83: { local: '2K', visitante: '2L' },
  84: { local: '1H', visitante: '2J' },
  85: { local: '1B', visitante: '3° E/F/G/I/J' },
  86: { local: '1J', visitante: '2H' },
  87: { local: '1K', visitante: '3° D/E/I/J/L' },
  88: { local: '2D', visitante: '2G' },
  89: { local: 'Gan. M74', visitante: 'Gan. M77' },
  90: { local: 'Gan. M73', visitante: 'Gan. M75' },
  91: { local: 'Gan. M76', visitante: 'Gan. M78' },
  92: { local: 'Gan. M79', visitante: 'Gan. M80' },
  93: { local: 'Gan. M83', visitante: 'Gan. M84' },
  94: { local: 'Gan. M81', visitante: 'Gan. M82' },
  95: { local: 'Gan. M86', visitante: 'Gan. M88' },
  96: { local: 'Gan. M85', visitante: 'Gan. M87' },
  97: { local: 'Gan. M89', visitante: 'Gan. M90' },
  98: { local: 'Gan. M93', visitante: 'Gan. M94' },
  99: { local: 'Gan. M91', visitante: 'Gan. M92' },
  100: { local: 'Gan. M95', visitante: 'Gan. M96' },
  101: { local: 'Gan. M97', visitante: 'Gan. M98' },
  102: { local: 'Gan. M99', visitante: 'Gan. M100' },
  103: { local: 'Perd. M101', visitante: 'Perd. M102' },
  104: { local: 'Gan. M101', visitante: 'Gan. M102' },
}

const FASE_OFFSETS = {
  r32: 0,
  r16: 16,
  qf: 24,
  sf: 28,
  '3p': 30,
  final: 31,
}

function normalizeExternalId(id) {
  if (id == null || id === '') return null
  const n = Number(id)
  return Number.isFinite(n) ? n : null
}

export function fifaMatchNo(partido) {
  const ext = normalizeExternalId(partido?.external_id)
  if (ext != null && EXTERNAL_TO_FIFA_MATCH[ext] != null) {
    return EXTERNAL_TO_FIFA_MATCH[ext]
  }
  if (partido?.ronda) {
    const m = String(partido.ronda).match(/\bM(\d{2,3})\b/i)
    if (m) return Number(m[1])
  }
  return null
}

export function bracketPositionInPhase(fase, fifaNo) {
  return BRACKET_POSITION_BY_FIFA[fase]?.[fifaNo] ?? null
}

/** Orden global continuo después de la fase de grupos (base = max orden grupos). */
export function bracketOrdenGlobal(fase, fifaNo, baseGruposOrden = 72) {
  const pos = bracketPositionInPhase(fase, fifaNo)
  if (pos == null) return null
  return baseGruposOrden + (FASE_OFFSETS[fase] ?? 0) + pos
}

export function etiquetaSlotFifa(fifaNo) {
  const slot = FIFA_SLOT_LABELS[fifaNo]
  if (!slot) return fifaNo ? `M${fifaNo}` : null
  return `M${fifaNo} · ${slot.local} vs ${slot.visitante}`
}

export function etiquetaPartidoFifa(partido) {
  const no = fifaMatchNo(partido)
  if (no) return etiquetaSlotFifa(no)
  return partido?.ronda || null
}

export function ladoCuadro(fase, bracketPos, totalEnFase) {
  if (!bracketPos || !totalEnFase) return null
  const mitad = totalEnFase / 2
  return bracketPos <= mitad ? 'izq' : 'der'
}

/** Ordena partidos de una fase como el cuadro Promiedos / BracketView. */
export function sortPartidosCuadro(partidos, fase) {
  const posMap = BRACKET_POSITION_BY_FIFA[fase]
  if (!posMap) {
    return [...partidos].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
  }

  return [...partidos].sort((a, b) => {
    const pa = bracketPositionInPhase(fase, fifaMatchNo(a))
    const pb = bracketPositionInPhase(fase, fifaMatchNo(b))
    if (pa != null && pb != null) return pa - pb
    if (pa != null) return -1
    if (pb != null) return 1
    return (a.orden ?? 0) - (b.orden ?? 0)
  })
}

export function enrichPartidoBracketMeta(partido, baseGruposOrden = 72) {
  const fifaNo = fifaMatchNo(partido)
  if (!fifaNo || !partido?.fase) return partido

  const bracketPos = bracketPositionInPhase(partido.fase, fifaNo)
  const orden = bracketOrdenGlobal(partido.fase, fifaNo, baseGruposOrden)
  const slot = FIFA_SLOT_LABELS[fifaNo]
  const faseLabel = {
    r32: '16avos',
    r16: 'Octavos',
    qf: 'Cuartos',
    sf: 'Semis',
    '3p': '3er puesto',
    final: 'Final',
  }[partido.fase]

  return {
    ...partido,
    orden: orden ?? partido.orden,
    ronda: slot ? `${faseLabel} · ${etiquetaSlotFifa(fifaNo)}` : partido.ronda,
    fifa_match_no: fifaNo,
    bracket_pos: bracketPos,
    lado_cuadro: ladoCuadro(partido.fase, bracketPos, Object.keys(BRACKET_POSITION_BY_FIFA[partido.fase] || {}).length),
  }
}
