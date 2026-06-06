<script setup>
import { formatARS } from '../lib/premios.js'

defineProps({
  rows: { type: Array, default: () => [] },
  showPremios: { type: Boolean, default: false },
  showDesglose: { type: Boolean, default: false },
})

function initial(nombre) {
  return (nombre || '?').charAt(0).toUpperCase()
}
</script>

<template>
  <div v-if="rows.length === 0" class="empty-state">Sin datos todavía</div>

  <div v-else class="promi-table-wrap">
    <table class="promi-table">
      <thead>
        <tr>
          <th class="col-pos">#</th>
          <th class="col-name">Participante</th>
          <th class="col-pts">PTS</th>
          <th v-if="showDesglose" class="col-stat" title="Grupos">G</th>
          <th v-if="showDesglose" class="col-stat" title="Eliminatorias">E</th>
          <th v-if="showDesglose" class="col-stat" title="Final / Campeón">F</th>
          <th v-if="showPremios" class="col-premio">Premio</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(row, i) in rows"
          :key="row.id"
          :class="{ 'promi-row--podium': (row.puesto ?? i + 1) <= 3 }"
        >
          <td class="col-pos">{{ row.puesto ?? i + 1 }}</td>
          <td class="col-name">
            <span class="promi-avatar">{{ initial(row.nombre) }}</span>
            <span class="promi-name">{{ row.nombre }}</span>
          </td>
          <td class="col-pts">{{ row.puntos_total }}</td>
          <td v-if="showDesglose" class="col-stat">{{ row.desglose?.grupos ?? 0 }}</td>
          <td v-if="showDesglose" class="col-stat">{{ row.desglose?.eliminatorias ?? 0 }}</td>
          <td v-if="showDesglose" class="col-stat">{{ row.desglose?.final ?? 0 }}</td>
          <td v-if="showPremios" class="col-premio">
            {{ row.premio ? formatARS(row.premio) : '—' }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
