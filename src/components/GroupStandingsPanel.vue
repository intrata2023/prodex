<script setup>
import { computed, onMounted } from 'vue'
import { buildGroupStandings, BEST_THIRDS_COUNT } from '../lib/groupStandings.js'
import { useTeamCrests } from '../composables/useTeamCrests.js'

const props = defineProps({
  partidos: { type: Array, default: () => [] },
  predicciones: { type: Object, default: () => ({}) },
})

const { load, crestForTeam, crestsLoaded } = useTeamCrests()

onMounted(load)

const tablas = computed(() => buildGroupStandings(props.partidos, props.predicciones))
const grupos = computed(() => tablas.value.grupos)
const mejoresTerceros = computed(() => tablas.value.mejoresTerceros)

function crestUrl(nombre) {
  crestsLoaded.value
  for (const p of props.partidos) {
    const c = crestForTeam(nombre, p)
    if (c) return c
  }
  return crestForTeam(nombre)
}

function shortName(name) {
  if (!name) return '—'
  if (name.length <= 12) return name
  return name.slice(0, 10) + '…'
}

function badgeLabel(row) {
  if (row.clasificaComo === 'tercero') return `3° #${row.rankTerceros}`
  if (row.clasificaComo === 'directo') return 'Clasifica'
  return ''
}
</script>

<template>
  <div class="group-standings">
    <div class="group-standings-rules">
      <p class="group-standings-rules-title">¿Quién clasifica a 16avos?</p>
      <ul class="group-standings-rules-list">
        <li><strong>1° y 2°</strong> de cada uno de los 12 grupos → <strong>24 equipos</strong></li>
        <li>
          Los <strong>{{ BEST_THIRDS_COUNT }} mejores terceros</strong> entre todos los grupos →
          <strong>8 equipos</strong>
        </li>
        <li>Total: <strong>32 equipos</strong> a eliminatorias</li>
      </ul>
      <p class="group-standings-rules-foot">
        Entre 3°: puntos → dif. de gol → goles a favor. Proyección según
        <strong>tus predicciones</strong> (no resultados reales).
      </p>
    </div>

    <div v-if="mejoresTerceros.length" class="group-standings-thirds">
      <span class="group-standings-thirds-label">Mejores 3° ahora:</span>
      <span
        v-for="t in mejoresTerceros"
        :key="t.grupo + t.nombre"
        class="group-standings-third-chip"
      >
        <img v-if="crestUrl(t.nombre)" :src="crestUrl(t.nombre)" class="group-chip-crest" alt="" />
        <span>{{ shortName(t.nombre) }} ({{ t.grupo }})</span>
      </span>
    </div>

    <div v-if="grupos.length === 0" class="empty-state">No hay partidos de grupos cargados.</div>

    <div v-else class="accordion" id="tablasGruposAcc">
      <div v-for="(g, idx) in grupos" :key="g.letra" class="accordion-item">
        <h2 class="accordion-header">
          <button
            class="accordion-button"
            :class="{ collapsed: idx > 0 }"
            type="button"
            data-bs-toggle="collapse"
            :data-bs-target="'#tabla-g' + g.letra"
          >
            Grupo {{ g.letra }}
            <span v-if="g.partidosPendientes > 0" class="group-standings-pending">
              · faltan {{ g.partidosPendientes }}
            </span>
          </button>
        </h2>
        <div
          :id="'tabla-g' + g.letra"
          class="accordion-collapse collapse"
          :class="{ show: idx === 0 }"
          data-bs-parent="#tablasGruposAcc"
        >
          <div class="accordion-body group-standings-body">
            <p v-if="g.partidosPendientes > 0" class="group-standings-note">
              {{ g.partidosConPrediccion }}/{{ g.partidosTotal }} partidos con predicción cargada.
            </p>

            <div class="promi-table-wrap">
              <table class="promi-table group-table">
                <thead>
                  <tr>
                    <th class="col-pos">#</th>
                    <th class="col-name">Equipo</th>
                    <th class="col-pts">PTS</th>
                    <th class="col-stat">PJ</th>
                    <th class="col-stat">PG</th>
                    <th class="col-stat">PE</th>
                    <th class="col-stat">PP</th>
                    <th class="col-stat">GF</th>
                    <th class="col-stat">GC</th>
                    <th class="col-stat">DG</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="row in g.standings"
                    :key="row.nombre"
                    :class="{
                      'group-row--clasifica': row.clasifica,
                      'group-row--tercero': row.clasificaComo === 'tercero',
                    }"
                  >
                    <td class="col-pos">{{ row.pos }}</td>
                    <td class="col-name">
                      <span class="group-name-cell">
                        <img
                          v-if="crestUrl(row.nombre)"
                          :src="crestUrl(row.nombre)"
                          class="group-table-crest"
                          :alt="row.nombre"
                          loading="lazy"
                        />
                        <span v-else class="group-table-crest group-table-crest--ph" aria-hidden="true" />
                        <span class="group-team-name">{{ shortName(row.nombre) }}</span>
                        <span
                          v-if="row.clasifica"
                          class="group-badge-clasifica"
                          :class="{ 'group-badge-clasifica--tercero': row.clasificaComo === 'tercero' }"
                        >
                          {{ badgeLabel(row) }}
                        </span>
                      </span>
                    </td>
                    <td class="col-pts">{{ row.pts }}</td>
                    <td class="col-stat">{{ row.pj }}</td>
                    <td class="col-stat">{{ row.pg }}</td>
                    <td class="col-stat">{{ row.pe }}</td>
                    <td class="col-stat">{{ row.pp }}</td>
                    <td class="col-stat">{{ row.gf }}</td>
                    <td class="col-stat">{{ row.gc }}</td>
                    <td
                      class="col-stat"
                      :class="{ 'group-dg--pos': row.dg > 0, 'group-dg--neg': row.dg < 0 }"
                    >
                      {{ row.dg > 0 ? '+' : '' }}{{ row.dg }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.group-standings-rules {
  margin: 0 0 1rem;
  padding: 0.875rem 1rem;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
}

.group-standings-rules-title {
  margin: 0 0 0.5rem;
  font-size: 0.8125rem;
  font-weight: 700;
  color: var(--accent);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.group-standings-rules-list {
  margin: 0;
  padding-left: 1.125rem;
  font-size: 0.8125rem;
  color: var(--text-muted);
  line-height: 1.55;
}

.group-standings-rules-list li + li {
  margin-top: 0.25rem;
}

.group-standings-rules-list strong {
  color: var(--text);
}

.group-standings-rules-foot {
  margin: 0.625rem 0 0;
  padding-top: 0.625rem;
  border-top: 1px solid var(--border);
  font-size: 0.75rem;
  color: var(--text-muted);
  line-height: 1.45;
}

.group-standings-rules-foot strong {
  color: var(--text);
}

.group-standings-thirds {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.375rem;
  margin-bottom: 1rem;
  padding: 0.625rem 0.75rem;
  background: rgba(59, 130, 246, 0.08);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: var(--radius);
}

.group-standings-thirds-label {
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #93c5fd;
  margin-right: 0.25rem;
}

.group-standings-third-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.2rem 0.45rem;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.3);
  font-size: 0.625rem;
  font-weight: 600;
  color: var(--text);
}

.group-chip-crest {
  width: 0.875rem;
  height: 0.625rem;
  object-fit: cover;
  border-radius: 0.125rem;
}

.group-standings-pending {
  font-size: 0.6875rem;
  font-weight: 500;
  color: var(--warning);
  margin-left: 0.25rem;
}

.group-standings-body {
  padding-top: 0.5rem !important;
}

.group-standings-note {
  margin: 0 0 0.625rem;
  font-size: 0.75rem;
  color: var(--text-muted);
  text-align: center;
}

.group-table .col-name {
  min-width: 6.5rem;
}

.group-name-cell {
  display: inline-flex;
  align-items: center;
  gap: 0.3125rem;
  min-width: 0;
  flex-wrap: wrap;
}

.group-table-crest {
  width: 1.125rem;
  height: 0.75rem;
  object-fit: cover;
  border-radius: 0.125rem;
  flex-shrink: 0;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.group-table-crest--ph {
  display: inline-block;
  background: rgba(255, 255, 255, 0.06);
}

.group-team-name {
  font-weight: 600;
  vertical-align: middle;
}

.group-badge-clasifica {
  display: inline-block;
  padding: 0.1rem 0.35rem;
  border-radius: 999px;
  font-size: 0.5rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  background: var(--accent-dim);
  color: var(--accent);
  vertical-align: middle;
  white-space: nowrap;
}

.group-badge-clasifica--tercero {
  background: rgba(59, 130, 246, 0.15);
  color: #93c5fd;
}

.group-row--clasifica {
  background: rgba(34, 197, 94, 0.04);
}

.group-row--tercero {
  background: rgba(59, 130, 246, 0.05);
}

.group-row--clasifica .col-pos {
  color: var(--accent);
}

.group-row--tercero .col-pos {
  color: #93c5fd;
}

.group-dg--pos {
  color: var(--accent);
}

.group-dg--neg {
  color: #fca5a5;
}
</style>
