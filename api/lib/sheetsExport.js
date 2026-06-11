import { google } from 'googleapis'
import {
  indexPartidosGrupos,
  countGruposCompletas,
  prediccionParaFixture,
  buildPartidoById,
} from '../../src/lib/participantProgress.js'
import { calcularPuntosParticipante } from '../../src/lib/scoring.js'

const TAB_NAMES = ['Predicciones', 'Participantes', 'Posiciones']

const LEGACY_TAB_PREFIXES = ['Pred | ']

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
  if (msg.includes('Quota exceeded') || msg.includes('quota metric')) {
    return [
      'Google Sheets rechazó la exportación: superaste el límite de escrituras por minuto.',
      'Esperá ~1 minuto y volvé a exportar.',
      'Si sigue pasando, reducí exportaciones seguidas o pedí más cuota en Google Cloud Console.',
    ].join(' ')
  }
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

function predsByParticipante(predicciones) {
  const map = {}
  for (const pr of predicciones || []) {
    if (!map[pr.participante_id]) map[pr.participante_id] = []
    map[pr.participante_id].push(pr)
  }
  return map
}

function partidosGrupos(partidos) {
  return (partidos || []).filter((p) => p.fase === 'grupos')
}

function fixturesGruposEnOrden(partidosG) {
  const { fixtures, porGrupo } = indexPartidosGrupos(partidosG)
  return [...porGrupo.keys()]
    .sort()
    .flatMap((grupo) =>
      [...porGrupo.get(grupo)]
        .map((key) => fixtures.get(key))
        .filter(Boolean)
        .sort((a, b) => (a.canonical.orden ?? 0) - (b.canonical.orden ?? 0))
    )
}

function participantesGruposCompletos(participantes, partidosG, predicciones) {
  const byP = predsByParticipante(predicciones)
  const { total } = countGruposCompletas(partidosG, [])
  if (!total) return []

  return [...(participantes || [])]
    .filter((p) => {
      const { done } = countGruposCompletas(partidosG, byP[p.id] || [])
      return done === total
    })
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
}

function filaPrediccionGrupo(partido, pr) {
  return [
    partido.grupo || '',
    partido.ronda || 'Fase de grupos',
    partido.equipo_local,
    pr?.goles_local ?? '',
    pr?.goles_visitante ?? '',
    partido.equipo_visitante,
  ]
}

function buildExportContext(data) {
  const { participantes, partidos, predicciones } = data
  const partidosG = partidosGrupos(partidos)
  const fixtures = fixturesGruposEnOrden(partidosG)
  const partidoById = buildPartidoById(partidosG)
  const byP = predsByParticipante(predicciones)
  const completos = participantesGruposCompletos(participantes, partidosG, predicciones)

  return { fixtures, partidoById, byP, completos }
}

function buildPrediccionesSheet(ctx) {
  const { fixtures, partidoById, byP, completos } = ctx

  const rows = [
    ['Participante', 'Grupo', 'Ronda', 'Local', 'Pred L', 'Pred V', 'Visitante'],
  ]

  for (const p of completos) {
    const predsP = byP[p.id] || []
    for (const fx of fixtures) {
      const pr = prediccionParaFixture(fx, predsP, partidoById)
      rows.push([p.nombre, ...filaPrediccionGrupo(fx.canonical, pr)])
    }
  }

  return rows
}

function finalistasRealesDesdePartidos(partidos) {
  const partidoFinal = (partidos || []).find((p) => p.fase === 'final')
  return partidoFinal ? [partidoFinal.equipo_local, partidoFinal.equipo_visitante] : []
}

function buildPosicionesSheet(data, ctx) {
  const { partidos, predicciones, resultados, campeones, config, exportedAt } = data
  const { completos } = ctx
  const finalistasReales = finalistasRealesDesdePartidos(partidos)
  const campeonReal = config?.campeon_real || null

  const resultadosConPartido = (resultados || []).map((r) => {
    const partido = partidos.find((p) => p.id === r.partido_id)
    return partido ? { ...r, ...partido } : r
  })

  const ranked = completos
    .map((p) => {
      const preds = (predicciones || []).filter((pr) => pr.participante_id === p.id)
      const predCampeon = (campeones || []).find((c) => c.participante_id === p.id)
      const { total, desglose } = calcularPuntosParticipante({
        partidos,
        predicciones: preds,
        resultados: resultadosConPartido,
        predCampeon,
        campeonReal,
        finalistasReales,
      })
      return { nombre: p.nombre, puntos_total: total, desglose }
    })
    .sort((a, b) => {
      if (b.puntos_total !== a.puntos_total) return b.puntos_total - a.puntos_total
      return a.nombre.localeCompare(b.nombre, 'es')
    })

  return [
    ['Actualizado (UTC)', exportedAt || ''],
    [],
    ['#', 'Participante', 'PTS', 'G', 'E', 'F'],
    ...ranked.map((r, i) => [
      i + 1,
      r.nombre,
      r.puntos_total,
      r.desglose?.grupos ?? 0,
      r.desglose?.eliminatorias ?? 0,
      r.desglose?.final ?? 0,
    ]),
  ]
}

function buildTables(data) {
  const ctx = buildExportContext(data)
  const { completos } = ctx

  return {
    Predicciones: buildPrediccionesSheet(ctx),
    Participantes: [['Nombre'], ...completos.map((p) => [p.nombre])],
    Posiciones: buildPosicionesSheet(data, ctx),
  }
}

async function syncTabs(sheetsApi, spreadsheetId, allTabNames) {
  const meta = await sheetsApi.spreadsheets.get({ spreadsheetId })
  const existingSheets = meta.data.sheets || []
  const existingTitles = new Set(existingSheets.map((s) => s.properties.title))
  const desired = new Set(allTabNames)

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
    if (desired.has(title)) continue
    const isLegacy =
      LEGACY_TAB_PREFIXES.some((prefix) => title.startsWith(prefix)) ||
      !TAB_NAMES.includes(title)
    if (isLegacy) {
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

async function writeAllTabs(sheetsApi, spreadsheetId, tables, credentials) {
  const names = Object.keys(tables)
  if (!names.length) return

  await withSheetsError(
    () =>
      sheetsApi.spreadsheets.values.batchClear({
        spreadsheetId,
        requestBody: {
          ranges: names.map((name) => sheetRange(name, 'A:Z')),
        },
      }),
    spreadsheetId,
    credentials
  )

  await withSheetsError(
    () =>
      sheetsApi.spreadsheets.values.batchUpdate({
        spreadsheetId,
        requestBody: {
          valueInputOption: 'RAW',
          data: names.map((name) => ({
            range: sheetRange(name, 'A1'),
            values: tables[name],
          })),
        },
      }),
    spreadsheetId,
    credentials
  )
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

  await writeAllTabs(sheets, spreadsheetId, tables, credentials)

  const ctx = buildExportContext(data)
  const predRows = tables.Predicciones?.length > 1 ? tables.Predicciones.length - 1 : 0

  return {
    ok: true,
    spreadsheetId,
    tabs: allTabNames,
    prediccionesRows: predRows,
    participantesCompletos: ctx.completos.length,
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
