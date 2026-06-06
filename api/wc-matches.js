export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const token = process.env.FOOTBALL_DATA_TOKEN || process.env.VITE_FOOTBALL_DATA_TOKEN
  if (!token) {
    res.status(500).json({ error: 'Falta FOOTBALL_DATA_TOKEN en el servidor' })
    return
  }

  try {
    const apiRes = await fetch(
      'https://api.football-data.org/v4/competitions/WC/matches?season=2026',
      { headers: { 'X-Auth-Token': token } }
    )
    const body = await apiRes.text()
    res.status(apiRes.status).setHeader('Content-Type', 'application/json').send(body)
  } catch {
    res.status(502).json({ error: 'No se pudo contactar football-data.org' })
  }
}
