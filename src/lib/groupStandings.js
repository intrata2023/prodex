import {
  indexPartidosGrupos,
  buildPartidoById,
  prediccionParaFixture,
} from './participantProgress.js'

export const BEST_THIRDS_COUNT = 8

function createTeamRow(nombre) {
  return { nombre, pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, dg: 0, pts: 0 }
}

function applyResult(row, gf, gc) {
  row.pj += 1
  row.gf += gf
  row.gc += gc
  row.dg = row.gf - row.gc
  if (gf > gc) {
    row.pg += 1
    row.pts += 3
  } else if (gf === gc) {
    row.pe += 1
    row.pts += 1
  } else {
    row.pp += 1
  }
}

export function sortStandings(rows) {
  return [...rows].sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts
    if (b.dg !== a.dg) return b.dg - a.dg
    if (b.gf !== a.gf) return b.gf - a.gf
    return a.nombre.localeCompare(b.nombre, 'es')
  })
}

function applyThirdQualification(grupos) {
  const thirds = []

  for (const grupo of grupos) {
    for (const row of grupo.standings) {
      row.clasifica = row.pos <= 2
      row.clasificaComo = row.pos <= 2 ? 'directo' : null
      row.rankTerceros = null
      if (row.pos === 3) {
        thirds.push({ ...row, grupo: grupo.letra })
      }
    }
  }

  const rankedThirds = sortStandings(thirds)
  const mejoresTerceros = rankedThirds.slice(0, BEST_THIRDS_COUNT)

  for (let i = 0; i < mejoresTerceros.length; i++) {
    const t = mejoresTerceros[i]
    const grupo = grupos.find((g) => g.letra === t.grupo)
    const row = grupo?.standings.find((s) => s.nombre === t.nombre)
    if (!row) continue
    row.clasifica = true
    row.clasificaComo = 'tercero'
    row.rankTerceros = i + 1
  }

  return mejoresTerceros.map((t, i) => ({
    nombre: t.nombre,
    grupo: t.grupo,
    pts: t.pts,
    dg: t.dg,
    gf: t.gf,
    rank: i + 1,
  }))
}

export function buildGroupStandings(partidos, predicciones = {}) {
  const gruposPartidos = (partidos || []).filter((p) => p.fase === 'grupos')
  const { fixtures, porGrupo } = indexPartidosGrupos(gruposPartidos)
  const partidoById = buildPartidoById(gruposPartidos)
  const predsLista = Object.entries(predicciones).map(([partido_id, pr]) => ({
    ...pr,
    partido_id,
  }))
  const byGrupo = {}

  for (const letra of porGrupo.keys()) {
    byGrupo[letra] = { letra, fixtures: [], teams: new Map() }
    for (const key of porGrupo.get(letra)) {
      const fx = fixtures.get(key)
      byGrupo[letra].fixtures.push(fx)
      const partido = fx.canonical
      for (const nombre of [partido.equipo_local, partido.equipo_visitante]) {
        if (!byGrupo[letra].teams.has(nombre)) {
          byGrupo[letra].teams.set(nombre, createTeamRow(nombre))
        }
      }
    }
  }

  const grupos = Object.keys(byGrupo)
    .sort()
    .map((letra) => {
      const grupo = byGrupo[letra]
      let partidosConPrediccion = 0

      for (const fx of grupo.fixtures) {
        const partido = fx.canonical
        const pred = prediccionParaFixture(fx, predsLista, partidoById)
        if (!pred) continue
        partidosConPrediccion += 1
        applyResult(
          grupo.teams.get(partido.equipo_local),
          pred.goles_local,
          pred.goles_visitante
        )
        applyResult(
          grupo.teams.get(partido.equipo_visitante),
          pred.goles_visitante,
          pred.goles_local
        )
      }

      const standings = sortStandings([...grupo.teams.values()]).map((row, i) => ({
        ...row,
        pos: i + 1,
        clasifica: false,
        clasificaComo: null,
        rankTerceros: null,
      }))

      return {
        letra,
        standings,
        partidosTotal: grupo.fixtures.length,
        partidosConPrediccion,
        partidosPendientes: grupo.fixtures.length - partidosConPrediccion,
      }
    })

  const mejoresTerceros = applyThirdQualification(grupos)

  return { grupos, mejoresTerceros }
}
