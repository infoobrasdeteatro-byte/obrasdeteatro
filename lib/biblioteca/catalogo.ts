/**
 * Catálogo público de la biblioteca (/obras): búsqueda, paginación y los
 * datos de dominio público de cada obra.
 *
 * Con miles de obras la página ya no puede cargarlas todas de golpe
 * (Supabase devuelve como mucho 1.000 filas por consulta): el catálogo se
 * pide por páginas y el buscador filtra en la base de datos.
 */

export const OBRAS_POR_PAGINA = 48

/** Años de protección más largo de los 20 países: México, 100 años tras la muerte. */
export const PLAZO_MAXIMO_PROTECCION = 100

export type FiltrosCatalogo = { q: string; pagina: number }

type Crudos = Record<string, string | string[] | undefined>

const primero = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? ''

/** Lee ?q= y ?pagina= de la URL, saneados (texto corto, página entera ≥ 1). */
export function leerFiltrosCatalogo(sp: Crudos): FiltrosCatalogo {
  const q = primero(sp.q).replace(/\s+/g, ' ').trim().slice(0, 80)
  const n = Number.parseInt(primero(sp.pagina), 10)
  return { q, pagina: Number.isFinite(n) && n > 0 ? Math.min(n, 10000) : 1 }
}

/**
 * Patrón seguro para .or(...ilike...) de PostgREST: sin comas, paréntesis ni
 * comodines del usuario, que romperían el filtro o cambiarían su sentido.
 */
export function patronBusqueda(q: string): string | null {
  // Minúsculas y sin tildes, como la columna busqueda_normalizada.
  const limpio = q.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[%_,()*\\:"]/g, ' ').replace(/\s+/g, ' ').trim()
  return limpio ? `%${limpio}%` : null
}

/** Rango de filas (para .range) de una página. */
export function rangoPagina(pagina: number): [number, number] {
  const desde = (pagina - 1) * OBRAS_POR_PAGINA
  return [desde, desde + OBRAS_POR_PAGINA - 1]
}

export function totalPaginas(total: number): number {
  return Math.max(1, Math.ceil(total / OBRAS_POR_PAGINA))
}

/** URL del catálogo conservando la búsqueda; la página 1 no se escribe. */
export function urlCatalogo(q: string, pagina: number): string {
  const p = new URLSearchParams()
  if (q) p.set('q', q)
  if (pagina > 1) p.set('pagina', String(pagina))
  const s = p.toString()
  return s ? `/obras?${s}#catalogo` : '/obras#catalogo'
}

/**
 * ¿Es la obra de dominio público en los 20 países? Lo es si el último de sus
 * autores murió hace más de 100 años (el plazo de México, el más largo):
 * los derechos vencen el 1 de enero siguiente al centenario de la muerte.
 */
export function libreEnTodosLosPaises(anioMuerte: number | null | undefined, hoy = new Date()): boolean {
  if (anioMuerte === null || anioMuerte === undefined) return false
  return hoy.getFullYear() > anioMuerte + PLAZO_MAXIMO_PROTECCION
}

/** Formato de miles con punto («4.492»), también en cifras de cuatro dígitos. */
export function formatearMiles(n: number): string {
  return String(Math.trunc(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}
