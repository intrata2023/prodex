import { createClient } from '@supabase/supabase-js'
import { fetchAllRows } from '../src/lib/fetchAll.js'
import {
  indexPartidosGrupos,
  listPartidosPendientes,
  countGruposCompletas,
  reparacionesPredicciones,
  prediccionParaFixture,
  buildPartidoById,
  prediccionCompleta,
} from '../src/lib/participantProgress.js'

const url = process.env.VITE_SUPABASE_URL
const key = process.env.VITE_SUPABASE_ANON_KEY
if (!url || !key) {
  console.error('Faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY')
  process.exit(1)
}

const supabase = createClient(url, key)
const nombres = process.argv.slice(2).length ? process.argv.slice(2) : ['ypuiatti', 'hsuarez', 'vtorcetta']

const { data: participantes } = await supabase
  .from('participantes_list')
  .select('id, nombre')
  .eq('activo', true)

const { data: partidosG } = await supabase
  .from('partidos')
  .select('id, grupo, equipo_local, equipo_visitante, orden, external_id')
  .eq('fase', 'grupos')
  .order('orden')

const preds = await fetchAllRows(
  supabase,
  'predicciones',
  'participante_id, partido_id, goles_local, goles_visitante'
)
console.log(`Predicciones cargadas: ${preds.length}\n`)

const { fixtures } = indexPartidosGrupos(partidosG)
const partidoById = buildPartidoById(partidosG)

console.log(`Partidos grupos: ${partidosG.length} filas, ${fixtures.size} cruces únicos\n`)

const duplicados = [...fixtures.values()].filter((fx) => fx.partidos.length > 1)
if (duplicados.length) {
  console.log('Cruces con filas duplicadas:')
  for (const fx of duplicados) {
    console.log(
      `  Grupo ${fx.grupo}: ${fx.canonical.equipo_local} vs ${fx.canonical.equipo_visitante} (${fx.partidos.length} ids: ${fx.partidos.map((p) => p.id.slice(0, 8)).join(', ')})`
    )
  }
  console.log()
}

for (const nombre of nombres) {
  const p = participantes.find((x) => x.nombre === nombre)
  if (!p) {
    console.log(`--- ${nombre}: no encontrado ---\n`)
    continue
  }

  const predsP = preds.filter((pr) => pr.participante_id === p.id)
  const predMap = Object.fromEntries(predsP.map((pr) => [pr.partido_id, pr]))
  const fixes = reparacionesPredicciones(partidosG, predMap)
  const { done, total } = countGruposCompletas(partidosG, predsP)
  const pendientes = listPartidosPendientes(partidosG, predsP)

  console.log(`--- ${nombre} ---`)
  console.log(`Progreso: ${done}/${total}`)
  console.log(`Reparaciones sugeridas: ${fixes.length}`)

  if (pendientes.length) {
    console.log('Pendientes según lógica actual:')
    for (const item of pendientes) {
      const fx = [...fixtures.values()].find(
        (f) => f.canonical.id === item.partido_id || f.grupo === item.grupo && f.canonical.equipo_local === item.equipo_local
      )
      const pr = fx ? prediccionParaFixture(fx, predsP, partidoById) : null
      const idsPred = predsP
        .filter((pr) => {
          const pt = partidoById.get(pr.partido_id)
          return pt && pt.grupo === item.grupo
        })
        .map((pr) => {
          const pt = partidoById.get(pr.partido_id)
          return `${pt.equipo_local} vs ${pt.equipo_visitante} [${pr.partido_id.slice(0, 8)}] ${pr.goles_local ?? '–'}-${pr.goles_visitante ?? '–'}`
        })

      console.log(`  Grupo ${item.grupo}: ${item.equipo_local} vs ${item.equipo_visitante} → ${item.estado}`)
      console.log(`    canonical id: ${item.partido_id}`)
      console.log(`    pred encontrada: ${pr ? `${pr.goles_local}-${pr.goles_visitante} en ${pr.partido_id.slice(0, 8)}` : 'ninguna'}`)
      if (idsPred.length) console.log(`    preds en grupo: ${idsPred.join(' | ')}`)
    }
  }

  const huerfanas = predsP.filter((pr) => !partidoById.has(pr.partido_id))
  if (huerfanas.length) {
    console.log(`Predicciones huérfanas (partido borrado): ${huerfanas.length}`)
    for (const pr of huerfanas) {
      console.log(`  partido_id=${pr.partido_id} ${pr.goles_local ?? '–'}-${pr.goles_visitante ?? '–'}`)
    }
  }

  console.log()
}
