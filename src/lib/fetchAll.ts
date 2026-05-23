/**
 * Pagina automaticamente uma query do Supabase em blocos para contornar
 * o cap default de 1000 linhas por request. Espera uma factory que devolva
 * uma query nova a cada chamada (com filtros/seleções aplicados).
 */
export async function fetchAll<T = any>(
  buildQuery: () => any,
  pageSize = 1000,
): Promise<T[]> {
  const all: T[] = []
  let from = 0
  while (true) {
    const { data, error } = await buildQuery().range(from, from + pageSize - 1)
    if (error) throw error
    const batch = (data ?? []) as T[]
    all.push(...batch)
    if (batch.length < pageSize) break
    from += pageSize
  }
  return all
}
