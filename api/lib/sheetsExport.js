import { google } from 'googleapis'

const TAB_NAMES = [
  'Participantes',
  'Partidos',
  'Predicciones',
  'Resultados',
  'Campeones',
  'Ranking',
  'Config',
]

const PARTICIPANT_TAB_PREFIX = 'Pred | '

const PREDICCION_HEADER = [
  'Orden',
  'Fase',
  'Grupo',
  'Ronda',
  'Local',
  'Visitante',
  'Pred L',
  'Pred V',
  'Penales',
]

function normalizePrivateKey(key) {
  if (!key || typeof key !== 'string') return key
  let normalized = key.trim().replace(/^['"]|['"]$/g, '')
  if (normalized.includes('\\n')) {
    normalized = normalized.replace(/\\n/g, '\n')
  }
  if (!normalized.includes('\n') && normalized.includes('-----BEGIN')) {
    normalized = normalized
      .replace(/-----BEGIN PRIVATE KEY-----/, '-----BEGIN PRIVATE KEY-----\n')
      .replace(/-----END PRIVATE KEY-----/, '\n-----END PRIVATE KEY-----')
  }
  if (!normalized.endsWith('\n')) normalized += '\n'
  return normalized
}

function assertValidPrivateKey(key) {
  if (!key || typeof key !== 'string') {
    throw new Error('Falta private_key en las credenciales de Google.')
  }
  if (!key.includes('-----BEGIN PRIVATE KEY-----')) {
    throw new Error(
      'private_key inválida. Usá la clave del archivo .json del service account (no un OAuth Client ID).'
    )
  }
}

function parseCredentials(raw) {
  const trimmed = String(raw || '').trim()
  let credentials
  try {
    credentials = JSON.parse(trimmed)
  } catch {
    try {
      credentials = JSON.parse(Buffer.from(trimmed, 'base64').toString('utf8'))
    } catch {
      throw new Error(
        'GOOGLE_SERVICE_ACCOUNT_JSON inválido. Pegá el JSON en una línea o en base64 en Vercel.'
      )
    }
  }
  if (credentials?.private_key) {
    credentials.private_key = normalizePrivateKey(credentials.private_key)
    assertValidPrivateKey(credentials.private_key)
  }
  return credentials
}

function resolveCredentials(env) {
  const email = String(env.GOOGLE_CLIENT_EMAIL || '').trim()
  const privateKeyRaw = env.GOOGLE_PRIVATE_KEY

  if (email && privateKeyRaw) {
    const private_key = normalizePrivateKey(privateKeyRaw)
    assertValidPrivateKey(private_key)
    return { client_email: email, private_key }
  }

  const rawCreds = env.GOOGLE_SERVICE_ACCOUNT_JSON
  if (!rawCreds) {
    throw new Error(
      'Faltan credenciales de Google en Vercel. Opción fácil: GOOGLE_CLIENT_EMAIL + GOOGLE_PRIVATE_KEY. Opción alternativa: GOOGLE_SERVICE_ACCOUNT_JSON.'
    )
  }
  return parseCredentials(rawCreds)
}

function normalizeSpreadsheetId(raw) {
  const trimmed = String(raw || '').trim().replace(/^['"]|['"]$/g, '')
  const fromUrl = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
  return fromUrl ? fromUrl[1] : trimmed
}

function googleSheetsErrorMessage(err, spreadsheetId, serviceAccountEmail) {
  const msg = String(err?.message || err || '')
  if (msg.includes('Requested entity was not found')) {
    return [
      'No se encontró el Google Sheet.',
      `ID usado: ${spreadsheetId}`,
      'Verificá GOOGLE_SHEETS_ID en Vercel (solo el ID, no la URL completa).',
      serviceAccountEmail
        ? `Compartí el sheet con ${serviceAccountEmail} como Editor.`
        : 'Compartí el sheet con el email del service account como Editor.',
    ].join(' ')
  }
  if (msg.includes('The caller does not have permission') || err?.code === 403) {
    return [
      'Sin permiso sobre el Google Sheet.',
      serviceAccountEmail
        ? `Compartí el spreadsheet con ${serviceAccountEmail} como Editor.`
        : 'Compartí el spreadsheet con el service account como Editor.',
    ].join(' ')
  }
  if (msg.includes('DECODER') || msg.includes('unsupported') || msg.includes('PEM')) {
    return [
      'La clave privada del service account no se pudo leer.',
      'En Vercel usá GOOGLE_CLIENT_EMAIL (del .json) y GOOGLE_PRIVATE_KEY (pegá la clave con saltos de línea, desde -----BEGIN PRIVATE KEY-----).',
      'O borrá esas dos y usá GOOGLE_SERVICE_ACCOUNT_JSON: JSON completo en una línea o en base64.',
    ].join(' ')
  }
  return msg || 'Error al exportar a Google Sheets'
}

function sheetRange(tabName, cellRange) {
  const escaped = String(tabName).replace(/'/g, "''")
  return `'${escaped}'!${cellRange}`
}

async function withSheetsError(fn, spreadsheetId, credentials) {
  try {
    return await fn()
  } catch (err) {
    throw new Error(googleSheetsErrorMessage(err, spreadsheetId, credentials?.client_email))
  }
}

function sanitizeSheetTitle(name) {
  return String(name || '')
    .trim()
    .replace(/[\[\]*?:/\\]/g, '')
    .slice(0, 80)
}

function sheetTitleForParticipante(nombre, used) {
  let base = sanitizeSheetTitle(nombre)
  if (!base) base = 'Participante'
  let title = `${PARTICIPANT_TAB_PREFIX}${base}`
  let n = 2
  while (used.has(title) || TAB_NAMES.includes(title)) {
    const suffix = ` (${n})`
    title = `${PARTICIPANT_TAB_PREFIX}${base.slice(0, Math.max(1, 80 - suffix.length))}${suffix}`
    n++
  }
  used.add(title)
  return title
}

function buildParticipantSheets(data) {
  const { participantes, partidos, predicciones, campeones } = data
  const predsByParticipante = {}
  for (const pr of predicciones) {
    if (!predsByParticipante[pr.participante_id]) predsByParticipante[pr.participante_id] = {}
    predsByParticipante[pr.participante_id][pr.partido_id] = pr
  }
  const campeonByParticipante = Object.fromEntries(
    (campeones || []).map((c) => [c.participante_id, c])
  )

  const used = new Set(TAB_NAMES)
  const sheets = {}

  for (const p of participantes) {
    const title = sheetTitleForParticipante(p.nombre, used)
    const myPreds = predsByParticipante[p.id] || {}
    const c = campeonByParticipante[p.id]

    sheets[title] = [
      ['Participante', p.nombre],
      ['Puntos', p.puntos_total ?? 0],
      ['Campeón', c?.equipo || ''],
      ['Finalista 1', c?.finalista_1 || ''],
      ['Finalista 2', c?.finalista_2 || ''],
      [],
      PREDICCION_HEADER,
      ...partidos.map((pt) => {
        const pr = myPreds[pt.id]
        return [
          pt.orden,
          pt.fase,
          pt.grupo || '',
          pt.ronda,
          pt.equipo_local,
          pt.equipo_visitante,
          pr?.goles_local ?? '',
          pr?.goles_visitante ?? '',
          pr?.penales ? 'Sí' : pr ? 'No' : '',
        ]
      }),
    ]
  }

  return sheets
}

function buildTables(data) {
  const { participantes, partidos, predicciones, resultados, campeones, config, exportedAt } =
    data
  const byParticipante = Object.fromEntries(participantes.map((p) => [p.id, p.nombre]))
  const byPartido = Object.fromEntries(partidos.map((p) => [p.id, p]))

  const ranking = [...participantes].sort((a, b) => b.puntos_total - a.puntos_total)

  const core = {
    Participantes: [
      ['Nombre', 'Puntos', 'Grupos', 'Elim', 'Final', 'Activo'],
      ...participantes.map((p) => [
        p.nombre,
        p.puntos_total,
        p.desglose?.grupos ?? 0,
        p.desglose?.eliminatorias ?? 0,
        p.desglose?.final ?? 0,
        p.activo ? 'Sí' : 'No',
      ]),
    ],
    Partidos: [
      ['Orden', 'Fase', 'Grupo', 'Ronda', 'Local', 'Visitante', 'External ID', 'Fecha'],
      ...partidos.map((p) => [
        p.orden,
        p.fase,
        p.grupo || '',
        p.ronda,
        p.equipo_local,
        p.equipo_visitante,
        p.external_id ?? '',
        p.fecha || '',
      ]),
    ],
    Predicciones: [
      ['Participante', 'Fase', 'Grupo', 'Local', 'Visitante', 'Pred L', 'Pred V', 'Penales'],
      ...predicciones.map((pr) => {
        const pt = byPartido[pr.partido_id]
        return [
          byParticipante[pr.participante_id] || pr.participante_id,
          pt?.fase || '',
          pt?.grupo || '',
          pt?.equipo_local || '',
          pt?.equipo_visitante || '',
          pr.goles_local ?? '',
          pr.goles_visitante ?? '',
          pr.penales ? 'Sí' : 'No',
        ]
      }),
    ],
    Resultados: [
      ['Fase', 'Grupo', 'Local', 'Visitante', 'Goles L', 'Goles V', 'Penales', 'Ganador penales'],
      ...resultados.map((r) => {
        const pt = byPartido[r.partido_id]
        return [
          pt?.fase || '',
          pt?.grupo || '',
          pt?.equipo_local || '',
          pt?.equipo_visitante || '',
          r.goles_local ?? '',
          r.goles_visitante ?? '',
          r.definido_penales ? 'Sí' : 'No',
          r.ganador_penales || '',
        ]
      }),
    ],
    Campeones: [
      ['Participante', 'Campeón', 'Finalista 1', 'Finalista 2'],
      ...(campeones || []).map((c) => [
        byParticipante[c.participante_id] || c.participante_id,
        c.equipo || '',
        c.finalista_1 || '',
        c.finalista_2 || '',
      ]),
    ],
    Ranking: [
      ['#', 'Participante', 'PTS', 'G', 'E', 'F'],
      ...ranking.map((p, i) => [
        i + 1,
        p.nombre,
        p.puntos_total,
        p.desglose?.grupos ?? 0,
        p.desglose?.eliminatorias ?? 0,
        p.desglose?.final ?? 0,
      ]),
    ],
    Config: [
      ['Campo', 'Valor'],
      ['Exportado (UTC)', exportedAt],
      ['Grupos abiertos', config?.grupos_abiertos ? 'Sí' : 'No'],
      ['Eliminatorias abiertas', config?.eliminatorias_abiertos ? 'Sí' : 'No'],
      ['Campeón real', config?.campeon_real || ''],
      ['Monto por persona', config?.monto_por_persona ?? ''],
    ],
  }

  return { ...core, ...buildParticipantSheets(data) }
}

async function syncTabs(sheetsApi, spreadsheetId, allTabNames) {
  const meta = await sheetsApi.spreadsheets.get({ spreadsheetId })
  const existingSheets = meta.data.sheets || []
  const existingTitles = new Set(existingSheets.map((s) => s.properties.title))
  const desired = new Set(allTabNames)
  const fixedTabs = new Set(TAB_NAMES)

  const requests = []

  for (const name of allTabNames) {
    if (!existingTitles.has(name)) {
      requests.push({ addSheet: { properties: { title: name } } })
    }
  }

  for (const sheet of existingSheets) {
    const title = sheet.properties?.title
    const sheetId = sheet.properties?.sheetId
    if (!title || sheetId == null) continue
    if (fixedTabs.has(title)) continue
    if (desired.has(title)) continue
    if (title.startsWith(PARTICIPANT_TAB_PREFIX)) {
      requests.push({ deleteSheet: { sheetId } })
    }
  }

  if (requests.length) {
    await sheetsApi.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests },
    })
  }
}

export async function exportToGoogleSheets(data, env = process.env) {
  const spreadsheetId = normalizeSpreadsheetId(env.GOOGLE_SHEETS_ID)
  if (!spreadsheetId) throw new Error('Falta GOOGLE_SHEETS_ID en Vercel')

  const credentials = resolveCredentials(env)
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
  const sheets = google.sheets({ version: 'v4', auth })
  const tables = buildTables(data)
  const allTabNames = Object.keys(tables)

  await withSheetsError(
    () => syncTabs(sheets, spreadsheetId, allTabNames),
    spreadsheetId,
    credentials
  )

  for (const name of allTabNames) {
    const values = tables[name]
    await withSheetsError(
      async () => {
        await sheets.spreadsheets.values.clear({
          spreadsheetId,
          range: sheetRange(name, 'A:Z'),
        })
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: sheetRange(name, 'A1'),
          valueInputOption: 'RAW',
          requestBody: { values },
        })
      },
      spreadsheetId,
      credentials
    )
  }

  const participantTabs = allTabNames.filter((n) => n.startsWith(PARTICIPANT_TAB_PREFIX))

  return {
    ok: true,
    spreadsheetId,
    tabs: allTabNames,
    participantSheets: participantTabs.length,
    rows: Object.fromEntries(allTabNames.map((n) => [n, tables[n].length - 1])),
  }
}

export async function handleExportRequest(body, env = process.env) {
  const secret = env.EXPORT_SECRET || env.VITE_EXPORT_SECRET
  if (secret && body?.secret !== secret) {
    throw new Error(
      'Export secret inválido. EXPORT_SECRET en Vercel y VITE_EXPORT_SECRET en el frontend deben coincidir.'
    )
  }
  if (!body?.data) throw new Error('Sin datos para exportar')
  return exportToGoogleSheets(body.data, env)
}
