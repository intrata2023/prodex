const PAGE_SIZE = 1000

/**
 * Trae todas las filas de una tabla (Supabase corta en 1000 por defecto).
 */
export async function fetchAllRows(supabase, table, select, applyFilters) {
  const rows = []
  let from = 0

  while (true) {
    let query = supabase.from(table).select(select).range(from, from + PAGE_SIZE - 1)
    if (applyFilters) query = applyFilters(query)

    const { data, error } = await query
    if (error) throw error

    const page = data || []
    rows.push(...page)
    if (page.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }

  return rows
}
