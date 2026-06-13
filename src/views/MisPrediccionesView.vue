<script setup>
import { ref, onMounted, computed } from 'vue'
import AppLayout from '../components/AppLayout.vue'
import MisPrediccionRow from '../components/MisPrediccionRow.vue'
import { useSession } from '../composables/useSession.js'
import { supabase, supabaseConfigured } from '../lib/supabase.js'
import { mapPrediccionesACanonica } from '../lib/participantProgress.js'
import { agruparPorFecha, partidosConPrediccion } from '../lib/misPredicciones.js'
import { aciertoPrediccion } from '../lib/scoring.js'

const { participanteId } = useSession()
const partidos = ref([])
const predicciones = ref({})
const resultados = ref({})
const loading = ref(true)
const soloConResultado = ref(false)

const partidosPredichos = computed(() =>
  partidosConPrediccion(partidos.value, predicciones.value)
)

const bloques = computed(() => {
  let lista = partidosPredichos.value
  if (soloConResultado.value) {
    lista = lista.filter((p) => {
      const r = resultados.value[p.id]
      return r?.goles_local != null && r?.goles_visitante != null
    })
  }
  return agruparPorFecha(lista)
})

const resumen = computed(() => {
  let exacto = 0
  let parcial = 0
  let fallo = 0
  let pendiente = 0

  for (const p of partidosPredichos.value) {
    const pred = predicciones.value[p.id]
    const real = resultados.value[p.id]
    const acierto = aciertoPrediccion(pred, real, p)
    if (!acierto) {
      pendiente++
      continue
    }
    if (acierto.tipo === 'exacto') exacto++
    else if (acierto.tipo === 'ganador') parcial++
    else fallo++
  }

  return { exacto, parcial, fallo, pendiente, total: partidosPredichos.value.length }
})

onMounted(cargar)

async function cargar() {
  loading.value = true
  if (!supabaseConfigured) {
    loading.value = false
    return
  }

  const { data: pts } = await supabase
    .from('partidos')
    .select('*')
    .order('fecha', { ascending: true, nullsFirst: false })
    .order('orden')

  partidos.value = pts || []

  const [{ data: preds }, { data: res }] = await Promise.all([
    supabase.from('predicciones').select('*').eq('participante_id', participanteId.value),
    supabase.from('resultados_reales').select('*'),
  ])

  const predMap = Object.fromEntries((preds || []).map((p) => [p.partido_id, p]))
  const grupos = partidos.value.filter((p) => p.fase === 'grupos')
  predicciones.value = {
    ...predMap,
    ...mapPrediccionesACanonica(grupos, predMap),
  }
  resultados.value = Object.fromEntries((res || []).map((r) => [r.partido_id, r]))
  loading.value = false
}
</script>

<template>
  <AppLayout title="Ver mis predicciones">
    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border text-primary"></div>
    </div>

    <div v-else-if="!supabaseConfigured" class="alert alert-info">
      Configurá Supabase en .env para ver tus predicciones.
    </div>

    <template v-else>
      <div v-if="resumen.total" class="mis-preds-resumen">
        <span class="mis-preds-pill mis-preds-pill--exacto">{{ resumen.exacto }} exactos</span>
        <span class="mis-preds-pill mis-preds-pill--parcial">{{ resumen.parcial }} parciales</span>
        <span class="mis-preds-pill mis-preds-pill--fallo">{{ resumen.fallo }} errados</span>
        <span class="mis-preds-pill mis-preds-pill--pend">{{ resumen.pendiente }} pendientes</span>
      </div>

      <label class="mis-preds-filtro">
        <input v-model="soloConResultado" type="checkbox" class="form-check-input" />
        Solo con resultado cargado
      </label>
      <p class="mis-preds-tz">Horarios en hora de Argentina (ART)</p>

      <p v-if="partidosPredichos.length === 0" class="empty-state">
        Todavía no cargaste predicciones. Entrá a Grupos o Eliminatorias para completarlas.
      </p>

      <p v-else-if="bloques.length === 0" class="empty-state">
        Aún no hay resultados cargados para tus predicciones.
      </p>

      <div v-else class="mis-preds-lista">
        <section v-for="bloque in bloques" :key="bloque.clave" class="mis-preds-dia">
          <h2 class="mis-preds-dia-titulo">{{ bloque.label }}</h2>
          <div class="mis-preds-dia-partidos">
            <MisPrediccionRow
              v-for="p in bloque.partidos"
              :key="p.id"
              :partido="p"
              :prediccion="predicciones[p.id]"
              :resultado="resultados[p.id]"
            />
          </div>
        </section>
      </div>
    </template>
  </AppLayout>
</template>
