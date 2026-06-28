import fs from 'fs'

const html = fs.readFileSync('tmp-promiedos.html', 'utf8')
const marker = 'type="application/json">'
const start = html.indexOf(marker)
if (start < 0) throw new Error('no __NEXT_DATA__')
const jsonStart = start + marker.length
const jsonEnd = html.indexOf('</script>', jsonStart)
const data = JSON.parse(html.slice(jsonStart, jsonEnd))
const pp = data.props.pageProps

console.log('pageProps keys:', Object.keys(pp))

function walk(obj, path = '', depth = 0, hits = []) {
  if (depth > 6 || hits.length > 30) return hits
  if (Array.isArray(obj)) {
    if (obj.length && typeof obj[0] === 'object') {
      hits.push({ path, type: 'array', len: obj.length, sampleKeys: Object.keys(obj[0]).slice(0, 12) })
    }
    return hits
  }
  if (!obj || typeof obj !== 'object') return hits
  for (const [k, v] of Object.entries(obj)) {
    const p = path ? `${path}.${k}` : k
    if (/bracket|knock|playoff|elim|fixture|match|round|cup|tree|draw/i.test(k)) {
      hits.push({ path: p, kind: Array.isArray(v) ? `array[${v.length}]` : typeof v })
    }
    walk(v, p, depth + 1, hits)
  }
  return hits
}

console.log('\nInteresting paths:')
for (const h of walk(pp)) console.log(h)

const league = pp.leagueData || pp.league || pp.data
if (league) console.log('\nleague keys:', Object.keys(league))
