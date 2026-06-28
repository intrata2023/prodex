import fs from 'fs'

const html = fs.readFileSync('tmp-promiedos.html', 'utf8')
const marker = 'type="application/json">'
const jsonStart = html.indexOf(marker) + marker.length
const jsonEnd = html.indexOf('</script>', jsonStart)
const data = JSON.parse(html.slice(jsonStart, jsonEnd))
const stages = data.props.pageProps.data.brackets.stages

for (const st of stages) {
  console.log(`\n=== ${st.name} (${st.groups.length} cruces) ===`)
  st.groups.forEach((g, i) => {
    const names = g.participants.map((p) => p.name).join(' vs ')
    console.log(`${String(i + 1).padStart(2)}. ${names}`)
  })
}
