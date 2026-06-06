import { handleExportRequest } from './lib/sheetsExport.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  try {
    const result = await handleExportRequest(req.body, process.env)
    res.status(200).json(result)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
