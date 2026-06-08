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

function parseCredentials(raw) {
  const trimmed = String(raw || '').trim()
  try {
    return JSON.parse(trimmed)
  } catch {
    try {
      return JSON.parse(Buffer.from(trimmed, 'base64').toString('utf8'))
    } catch {
      throw new Error(
        'GOOGLE_SERVICE_ACCOUNT_JSON inválido. Pegá el JSON en una línea o en base64 en Vercel.'
      )
    }
  }
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
  return msg || 'Error al exportar a Google Sheets'
}

async function withSheetsError(fn, spreadsheetId, credentials) {
  try {
    return await fn()
  } catch (err) {
    throw new Error(googleSheetsErrorMessage(err, spreadsheetId, credentials?.client_email))
  }
}

function buildTables(data) {
  const { participantes, partidos, predicciones, resultados, campeones, config, exportedAt } =
    data
  const byParticipante = Object.fromEntries(participantes.map((p) => [p.id, p.nombre]))
  const byPartido = Object.fromEntries(partidos.map((p) => [p.id, p]))

  const ranking = [...participantes].sort((a, b) => b.puntos_total - a.puntos_total)

  return {
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
}

async function ensureTabs(sheets, spreadsheetId) {
  const meta = await sheets.spreadsheets.get({ spreadsheetId })
  const existing = new Set((meta.data.sheets || []).map((s) => s.properties.title))
  const requests = TAB_NAMES.filter((name) => !existing.has(name)).map((title) => ({
    addSheet: { properties: { title } },
  }))
  if (requests.length) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests },
    })
  }
}

export async function exportToGoogleSheets(data, env = process.env) {
  const spreadsheetId = normalizeSpreadsheetId(env.GOOGLE_SHEETS_ID)
  const rawCreds = env.GOOGLE_SERVICE_ACCOUNT_JSON
  if (!spreadsheetId) throw new Error('Falta GOOGLE_SHEETS_ID en Vercel')
  if (!rawCreds) throw new Error('Falta GOOGLE_SERVICE_ACCOUNT_JSON en Vercel')

  const credentials = parseCredentials(rawCreds)
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
  const sheets = google.sheets({ version: 'v4', auth })
  const tables = buildTables(data)

  await withSheetsError(() => ensureTabs(sheets, spreadsheetId), spreadsheetId, credentials)

  for (const name of TAB_NAMES) {
    const values = tables[name]
    await withSheetsError(
      async () => {
        await sheets.spreadsheets.values.clear({
          spreadsheetId,
          range: `${name}!A:Z`,
        })
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${name}!A1`,
          valueInputOption: 'RAW',
          requestBody: { values },
        })
      },
      spreadsheetId,
      credentials
    )
  }

  return {
    ok: true,
    spreadsheetId,
    tabs: TAB_NAMES,
    rows: Object.fromEntries(TAB_NAMES.map((n) => [n, tables[n].length - 1])),
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
