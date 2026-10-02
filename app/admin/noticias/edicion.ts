import { MAX_RESUMEN, MAX_TITULAR, PAISES_NOTICIAS } from '@/lib/noticias/importacion'

/**
 * Edición de una candidata antes de publicarla: titular, resumen, categoría y
 * país. Funciones puras, separadas del componente para poder probarlas.
 *
 * Solo las candidatas se editan. Una publicada no se corrige en el sitio: se
 * retira (y queda en el registro). Editar nunca cambia el estado: el UPDATE no
 * lleva la columna `estado`, y la consulta exige estado = 'candidata'.
 */

export type CamposEdicion = {
  titular: string
  resumen: string
  categoria_id: string
  pais_code: string
}

export type CategoriaOpcion = { id: string; etiqueta: string; activo: boolean }

/** Solo una candidata admite edición. */
export function puedeEditar(estado: string): boolean {
  return estado === 'candidata'
}

/** Lo que quien modera puede corregir antes de guardar. Null si todo está bien. */
export function validarEdicion(c: CamposEdicion, categoriasValidas: ReadonlySet<string>): string | null {
  const titular = c.titular.trim()
  const resumen = c.resumen.trim()
  if (titular === '') return 'El titular no puede quedar vacío.'
  if (titular.length > MAX_TITULAR) return `El titular no puede pasar de ${MAX_TITULAR} caracteres.`
  if (resumen === '') return 'El resumen no puede quedar vacío.'
  if (resumen.length > MAX_RESUMEN) return `El resumen no puede pasar de ${MAX_RESUMEN} caracteres.`
  if (!categoriasValidas.has(c.categoria_id)) return 'Elige una categoría.'
  if (!PAISES_NOTICIAS.has(c.pais_code)) return 'Elige un país.'
  return null
}

/** El UPDATE de la edición: solo los cuatro campos, nunca el estado. */
export function cambiosDeEdicion(c: CamposEdicion): CamposEdicion {
  return {
    titular: c.titular.trim(),
    resumen: c.resumen.trim(),
    categoria_id: c.categoria_id,
    pais_code: c.pais_code,
  }
}

/**
 * Categorías que ofrece el selector: las activas y, si la candidata usa una
 * que se desactivó después, también esa, para que editar el titular no obligue
 * a cambiar de categoría.
 */
export function categoriasParaEditar(todas: CategoriaOpcion[], actual: string): CategoriaOpcion[] {
  return todas.filter(c => c.activo || c.id === actual)
}

/** Texto del contador del resumen: «123 / 400». */
export function contadorResumen(resumen: string): string {
  return `${resumen.length} / ${MAX_RESUMEN}`
}
