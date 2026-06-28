const PAGE_SIZE = 1000
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 400

function esperar(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function queryConReintento(queryFactory) {
  let lastError = null

  for (let intento = 0; intento < MAX_RETRIES; intento++) {
    const { data, error } = await queryFactory()
    if (!error) return data

    lastError = error
    const reintentable =
      error.message?.includes('fetch') ||
      error.message?.includes('network') ||
      error.message?.includes('timeout') ||
      error.code === 'PGRST000' ||
      error.status >= 500

    if (!reintentable || intento === MAX_RETRIES - 1) throw error
    await esperar(RETRY_DELAY_MS * (intento + 1))
  }

  throw lastError
}

/**
 * Trae todas las filas de una tabla (Supabase corta en 1000 por defecto).
 */
export async function fetchAllRows(supabase, table, select, applyFilters) {
  const rows = []
  let from = 0

  while (true) {
    const page = await queryConReintento(() => {
      let query = supabase.from(table).select(select).range(from, from + PAGE_SIZE - 1)
      if (applyFilters) query = applyFilters(query)
      return query
    })

    rows.push(...(page || []))
    if ((page || []).length < PAGE_SIZE) break
    from += PAGE_SIZE
  }

  return rows
}
