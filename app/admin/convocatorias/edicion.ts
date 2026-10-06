import { CATEGORIAS_IMPORTABLES, MAX_CIUDAD, MAX_RESUMEN, MAX_TITULO, ZONA_HORARIA, esFechaValida, estaVencida, finDelDiaEnMadrid } from '@/lib/convocatorias/importacion'
import { PAISES_NOTICIAS } from '@/lib/noticias/importacion'

/**
 * Edición de una convocatoria de la Redacción antes de aprobarla: título,
 * resumen, categoría, país, ciudad y fecha límite. Funciones puras, separadas
 * del componente para poder probarlas (mismo planteamiento que
 * app/admin/noticias/edicion.ts).
 *
 * Editar nunca cambia el estado: el UPDATE no lleva la columna `estado` y la
 * consulta exige estado = 'pendiente_revision'. location y
 * url_bases_normalizada las recalcula el trigger.
 */

export type CamposEdicion = {
  title: string
  description: string
  category: string
  pais_code: string
  ciudad: string
  fecha_limite: string
}

/** La fecha límite guardada (timestamptz) como YYYY-MM-DD en hora de Madrid. */
export function fechaEnMadrid(deadline: string | null): string {
  if (!deadline) return ''
  const d = new Date(deadline)
  if (Number.isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat('en-CA', { timeZone: ZONA_HORARIA, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
}

/** Lo que quien modera puede corregir antes de guardar. Null si todo está bien. */
export function validarEdicion(c: CamposEdicion, ahora: Date = new Date()): string | null {
  const titulo = c.title.trim()
  const resumen = c.description.trim()
  if (titulo === '') return 'El título no puede quedar vacío.'
  if (titulo.length > MAX_TITULO) return `El título no puede pasar de ${MAX_TITULO} caracteres.`
  if (resumen === '') return 'El resumen no puede quedar vacío.'
  if (resumen.length > MAX_RESUMEN) return `El resumen no puede pasar de ${MAX_RESUMEN} caracteres.`
  if (!CATEGORIAS_IMPORTABLES.has(c.category)) return 'Elige una categoría.'
  if (!PAISES_NOTICIAS.has(c.pais_code)) return 'Elige un país.'
  if (c.ciudad.trim().length > MAX_CIUDAD) return `La ciudad no puede pasar de ${MAX_CIUDAD} caracteres.`
  if (!esFechaValida(c.fecha_limite)) return 'Indica la fecha límite.'
  if (estaVencida(c.fecha_limite, ahora)) return 'La fecha límite debe ser posterior a hoy.'
  return null
}

/** El UPDATE de la edición: solo estos campos, nunca el estado. */
export function cambiosDeEdicion(c: CamposEdicion) {
  return {
    title: c.title.trim(),
    description: c.description.trim(),
    category: c.category,
    pais_code: c.pais_code,
    ciudad: c.ciudad.trim() === '' ? null : c.ciudad.trim(),
    deadline: finDelDiaEnMadrid(c.fecha_limite),
  }
}
