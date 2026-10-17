/**
 * Supabase devuelve como mucho 1.000 filas por consulta, aunque se pida más
 * con .limit(). Con el catálogo de espacios por encima de esa cifra, las
 * lecturas completas se hacen por páginas con .range().
 */
export const PAGINA_SUPABASE = 1000

type Resultado<T> = { data: T[] | null; error: { message: string } | null }

/**
 * Lee todas las filas pidiendo páginas de 1.000 hasta que una llega
 * incompleta. `pagina(desde, hasta)` debe construir la consulta con un orden
 * estable (incluido un desempate por id) y aplicarle .range(desde, hasta).
 */
export async function leerTodasLasPaginas<T>(
  pagina: (desde: number, hasta: number) => PromiseLike<Resultado<T>>,
  maximo = 20000,
): Promise<{ data: T[]; error: { message: string } | null }> {
  const todas: T[] = []
  for (let desde = 0; desde < maximo; desde += PAGINA_SUPABASE) {
    const { data, error } = await pagina(desde, desde + PAGINA_SUPABASE - 1)
    if (error) return { data: todas, error }
    todas.push(...(data ?? []))
    if (!data || data.length < PAGINA_SUPABASE) break
  }
  return { data: todas, error: null }
}
