<script setup>
import { formatARS } from '../lib/premios.js'

defineProps({
  rows: { type: Array, default: () => [] },
  showPremios: { type: Boolean, default: false },
  showDesglose: { type: Boolean, default: false },
})
</script>

<template>
  <div class="table-responsive">
    <table class="table table-striped table-hover align-middle">
      <thead class="table-primary">
        <tr>
          <th>#</th>
          <th>Participante</th>
          <th class="text-center">Puntos</th>
          <th v-if="showDesglose" class="text-center">Grupos</th>
          <th v-if="showDesglose" class="text-center">Elim.</th>
          <th v-if="showDesglose" class="text-center">Final</th>
          <th v-if="showPremios" class="text-end">Premio</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, i) in rows" :key="row.id">
          <td>{{ row.puesto ?? i + 1 }}</td>
          <td class="fw-semibold">{{ row.nombre }}</td>
          <td class="text-center fs-5">{{ row.puntos_total }}</td>
          <td v-if="showDesglose" class="text-center text-muted">
            {{ row.desglose?.grupos ?? 0 }}
          </td>
          <td v-if="showDesglose" class="text-center text-muted">
            {{ row.desglose?.eliminatorias ?? 0 }}
          </td>
          <td v-if="showDesglose" class="text-center text-muted">
            {{ row.desglose?.final ?? 0 }}
          </td>
          <td v-if="showPremios" class="text-end">
            {{ row.premio ? formatARS(row.premio) : '-' }}
          </td>
        </tr>
        <tr v-if="rows.length === 0">
          <td :colspan="showPremios ? 7 : 3" class="text-center text-muted py-4">
            Sin datos todavía
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
