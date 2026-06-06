import { readFileSync } from 'fs'

const text = readFileSync(String.raw`c:\Users\feder\Downloads\4.sql`, 'utf8')
const rows = []

for (const line of text.split('\n')) {
  const trimmed = line.trim()
  if (!trimmed.startsWith('(')) continue
  const fields = [...trimmed.matchAll(/'((?:[^'\\]|'')*)'/g)].map((m) =>
    m[1].replace(/''/g, "'")
  )
  if (fields.length < 5) continue
  const idM = trimmed.match(/^\((\d+),/)
  const activoM = trimmed.match(/,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/)
  if (!idM || !activoM) continue
  rows.push({
    id: Number(idM[1]),
    nombre: fields[0],
    apellido: fields[1],
    usuario: fields[2],
    apodo: fields[4],
    activo: Number(activoM[1]),
  })
}

const filtered = rows
  .filter((r) => r.usuario && r.usuario !== 'rellenoid' && r.activo === 1)
  .sort((a, b) => a.id - b.id)

console.log(`-- ${filtered.length} participantes (activo=1, columna usuario)`)
console.log('-- Ejecutar en Supabase SQL Editor\n')
console.log('INSERT INTO participantes (nombre, pin_hash, activo) VALUES')
console.log(
  filtered
    .map((r, i) => {
      const pin = String(1001 + i)
      const display = (r.apodo || `${r.nombre} ${r.apellido}`.trim() || r.usuario).replace(
        /'/g,
        "''"
      )
      return `  ('${display}', hash_pin('${pin}'), true)`
    })
    .join(',\n')
)
console.log('ON CONFLICT (nombre) DO UPDATE SET')
console.log('  pin_hash = EXCLUDED.pin_hash,')
console.log('  activo = EXCLUDED.activo;')
console.log('\n-- Referencia PINs (usuario | nombre en app | PIN)')
for (let i = 0; i < filtered.length; i++) {
  const r = filtered[i]
  const pin = String(1001 + i)
  const display = r.apodo || `${r.nombre} ${r.apellido}`.trim() || r.usuario
  console.log(`-- ${r.usuario.padEnd(16)} | ${display.padEnd(22)} | ${pin}`)
}
