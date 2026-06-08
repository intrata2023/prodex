import { handleExportRequest } from './lib/sheetsExport.js'

function parseBody(req) {
  if (req.body && typeof req.body === 'object') return req.body
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body)
    } catch {
      return {}
    }
  }
  return req.body || {}
}

export default async function handler(req, res) {
  const method = req.method?.toUpperCase()

  if (method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    res.status(204).end()
    return
  }

  if (method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  res.setHeader('Access-Control-Allow-Origin', '*')

  try {
    const result = await handleExportRequest(parseBody(req), process.env)
    res.status(200).json(result)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
