import { PAISES_NOTICIAS } from '@/lib/noticias/importacion'

/**
 * Colaboradores: medios, instituciones y patrocinadores.
 *
 * Funciones puras (agrupación, validación del formulario de admin y del logo)
 * para poder probarlas sin base de datos. Las lecturas públicas viven en
 * ./datos.ts; la tabla y la RLS, en la migración 20261007120000.
 */

export const TIPOS = [
  { value: 'medio', label: 'Medio', grupo: 'Medios colaboradores' },
  { value: 'institucion', label: 'Institución', grupo: 'Instituciones' },
  { value: 'patrocinador', label: 'Patrocinador', grupo: 'Patrocinadores' },
] as const

export type TipoColaborador = (typeof TIPOS)[number]['value']

export const MAX_DESCRIPCION = 200
export const MAX_NOMBRE = 120
/** Con este número de colaboradores o más, la franja de la portada es un carrusel. */
export const MINIMO_CARRUSEL = 6

export const LOGO_TIPOS: ReadonlySet<string> = new Set(['image/svg+xml', 'image/png', 'image/webp'])
export const LOGO_MAX_BYTES = 500 * 1024
export const BUCKET_LOGOS = 'colaboradores'

/** Mailto del bloque «¿Quieres colaborar…?» de /colaboradores: a hola@, con el asunto ya escrito. */
export const MAILTO_COLABORAR =
  `mailto:hola@obrasdeteatro.com?subject=${encodeURIComponent('Colaboración con obrasdeteatro.com')}`

export type ColaboradorPublico = {
  id: string
  nombre: string
  tipo: string
  descripcion: string | null
  pais_code: string | null
  url_web: string | null
  logo_url: string | null
  orden: number
}

export type GrupoColaboradores = { tipo: TipoColaborador; titulo: string; colaboradores: ColaboradorPublico[] }

/** Agrupa por tipo en el orden de TIPOS y por `orden` dentro de cada grupo. Los grupos vacíos no salen. */
export function agruparPorTipo(lista: ColaboradorPublico[]): GrupoColaboradores[] {
  return TIPOS
    .map(t => ({
      tipo: t.value,
      titulo: t.grupo,
      colaboradores: lista.filter(c => c.tipo === t.value).sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre, 'es')),
    }))
    .filter(g => g.colaboradores.length > 0)
}

/** Solo https se pinta como enlace o como imagen. */
export function urlSegura(url: string | null): string | null {
  return url && /^https:\/\/[^\s"'<>]+$/i.test(url) ? url : null
}

export type CamposColaborador = {
  nombre: string
  tipo: string
  descripcion: string
  pais_code: string
  url_web: string
  desde: string
  noticias_fuente_id: string
}

/** Validación del formulario de admin. Null si todo está bien. Repite las CHECK de la tabla. */
export function validarColaborador(c: CamposColaborador): string | null {
  const nombre = c.nombre.trim()
  if (nombre === '') return 'El nombre es obligatorio.'
  if (nombre.length > MAX_NOMBRE) return `El nombre no puede pasar de ${MAX_NOMBRE} caracteres.`
  if (!TIPOS.some(t => t.value === c.tipo)) return 'Elige un tipo.'
  if (c.descripcion.trim().length > MAX_DESCRIPCION) return `La descripción no puede pasar de ${MAX_DESCRIPCION} caracteres.`
  if (c.pais_code !== '' && !PAISES_NOTICIAS.has(c.pais_code)) return 'Elige un país del ámbito.'
  if (c.url_web.trim() === '') return 'La web es obligatoria: cada logo enlaza a ella.'
  if (!urlSegura(c.url_web.trim())) return 'La web debe empezar por https://.'
  if (c.desde !== '' && !/^\d{4}-\d{2}-\d{2}$/.test(c.desde)) return 'La fecha «desde» no es válida.'
  return null
}

/** Fila para INSERT/UPDATE a partir del formulario (vacío → null). Nunca toca `activo` ni `orden`. */
export function filaDeFormulario(c: CamposColaborador) {
  const nulo = (v: string) => (v.trim() === '' ? null : v.trim())
  return {
    nombre: c.nombre.trim(),
    tipo: c.tipo,
    descripcion: nulo(c.descripcion),
    pais_code: nulo(c.pais_code),
    url_web: c.url_web.trim(),
    desde: nulo(c.desde),
    noticias_fuente_id: nulo(c.noticias_fuente_id),
  }
}

/** Comprobación del archivo de logo antes de subirlo (Storage lo vuelve a comprobar). */
export function validarLogo(archivo: { type: string; size: number }): string | null {
  if (!LOGO_TIPOS.has(archivo.type)) return 'El logo debe ser SVG, PNG o WebP.'
  if (archivo.size > LOGO_MAX_BYTES) return 'El logo no puede pasar de 500 KB.'
  return null
}

/** Ruta del logo en el bucket: nombre nuevo en cada subida, así no hace falta sobrescribir. */
export function rutaLogo(colaboradorId: string, tipoMime: string, marca: number = Date.now()): string {
  const ext = tipoMime === 'image/svg+xml' ? 'svg' : tipoMime === 'image/png' ? 'png' : 'webp'
  return `${colaboradorId}/logo-${marca}.${ext}`
}

/** Intercambia la posición de dos colaboradores: devuelve los dos UPDATE de `orden`. */
export function intercambiarOrden(a: { id: string; orden: number }, b: { id: string; orden: number }) {
  // Si coinciden (filas antiguas con el mismo orden), se separan para que el cambio se note.
  if (a.orden === b.orden) return [{ id: a.id, orden: b.orden + 1 }, { id: b.id, orden: a.orden }]
  return [{ id: a.id, orden: b.orden }, { id: b.id, orden: a.orden }]
}
