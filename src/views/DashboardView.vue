<script setup>
import { ref, onMounted, computed } from 'vue'
import AppLayout from '../components/AppLayout.vue'
import { useSession } from '../composables/useSession.js'
import { useConfig } from '../composables/useConfig.js'
import { supabase, supabaseConfigured } from '../lib/supabase.js'

const { nombre, participanteId } = useSession()
const { config, loadConfig } = useConfig()
const progreso = ref({ grupos: 0, eliminatorias: 0, campeon: false })

onMounted(async () => {
  await loadConfig()
  await calcularProgreso()
})

async function calcularProgreso() {
  if (!supabaseConfigured || !participanteId.value) return

  const { data: partidosGrupos } = await supabase
    .from('partidos')
    .select('id')
    .eq('fase', 'grupos')

  const { data: partidosElim } = await supabase
    .from('partidos')
    .select('id')
    .neq('fase', 'grupos')

  const { data: preds } = await supabase
    .from('predicciones')
    .select('partido_id, goles_local, goles_visitante')
    .eq('participante_id', participanteId.value)

  const { data: campeon } = await supabase
    .from('prediccion_campeon')
    .select('equipo')
    .eq('participante_id', participanteId.value)
    .maybeSingle()

  const predMap = new Set(
    (preds || [])
      .filter((p) => p.goles_local != null && p.goles_visitante != null)
      .map((p) => p.partido_id)
  )

  const totalG = partidosGrupos?.length || 0
  const totalE = partidosElim?.length || 0
  const doneG = (partidosGrupos || []).filter((p) => predMap.has(p.id)).length
  const doneE = (partidosElim || []).filter((p) => predMap.has(p.id)).length

  progreso.value = {
    grupos: totalG ? Math.round((doneG / totalG) * 100) : 0,
    eliminatorias: totalE ? Math.round((doneE / totalE) * 100) : 0,
    campeon: Boolean(campeon?.equipo),
  }
}

const gruposBloqueado = computed(() => !config.value.grupos_abiertos)
const elimBloqueado = computed(() => !config.value.eliminatorias_abiertos)
</script>

<template>
  <AppLayout :title="`Hola, ${nombre}`">
    <div class="row g-3">
      <div class="col-md-4">
        <div class="card h-100">
          <div class="card-body">
            <h2 class="h5">Fase de grupos</h2>
            <div class="progress mb-2" style="height: 8px">
              <div class="progress-bar" :style="{ width: progreso.grupos + '%' }"></div>
            </div>
            <p class="text-muted small mb-3">{{ progreso.grupos }}% completado</p>
            <span v-if="gruposBloqueado" class="badge bg-danger">Bloqueada</span>
            <span v-else class="badge bg-success">Abierta</span>
            <div class="mt-3">
              <router-link
                class="btn btn-primary"
                :class="{ disabled: gruposBloqueado }"
                to="/grupos"
              >
                Cargar grupos
              </router-link>
            </div>
          </div>
        </div>
      </div>
      <div class="col-md-4">
        <div class="card h-100">
          <div class="card-body">
            <h2 class="h5">Eliminatorias</h2>
            <div class="progress mb-2" style="height: 8px">
              <div class="progress-bar bg-warning" :style="{ width: progreso.eliminatorias + '%' }"></div>
            </div>
            <p class="text-muted small mb-3">{{ progreso.eliminatorias }}% completado</p>
            <span v-if="elimBloqueado" class="badge bg-danger">Bloqueada</span>
            <span v-else class="badge bg-success">Abierta</span>
            <p v-if="progreso.campeon" class="small text-success mt-2">Campeón elegido</p>
            <div class="mt-3">
              <router-link
                class="btn btn-warning"
                :class="{ disabled: elimBloqueado }"
                to="/eliminatorias"
              >
                Cargar eliminatorias
              </router-link>
            </div>
          </div>
        </div>
      </div>
      <div class="col-md-4">
        <div class="card h-100">
          <div class="card-body">
            <h2 class="h5">Ranking</h2>
            <p class="text-muted">Ver posiciones y premios del pozo.</p>
            <router-link class="btn btn-outline-primary" to="/ranking">Ver ranking</router-link>
          </div>
        </div>
      </div>
    </div>
  </AppLayout>
</template>
