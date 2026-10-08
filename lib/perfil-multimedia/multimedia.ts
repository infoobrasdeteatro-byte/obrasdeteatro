/**
 * Perfil completo (planes de pago): portada, galería de fotos, vídeos y
 * portfolio. Funciones puras, sin dependencias de servidor: las usan los
 * editores (navegador), el perfil público y la administración.
 *
 * Los límites y las validaciones REPITEN los de la migración 20261008120000
 * para dar un mensaje claro; quien manda es la base (CHECK y triggers).
 */

export const MAX_FOTOS = 12
export const MAX_VIDEOS = 6
export const MAX_PORTFOLIO = 10
export const MAX_PIE = 140
export const MAX_CREDITO = 80
export const MAX_TITULO_VIDEO = 100
export const MAX_TITULO_PROYECTO = 120
export const MAX_ROL = 120
export const MAX_COMPANIA = 120
export const MAX_DESCRIPCION_PROYECTO = 500
export const LADO_LARGO_MAX = 2000
export const IMAGEN_MAX_BYTES = 5 * 1024 * 1024
export const TIPOS_IMAGEN: ReadonlySet<string> = new Set(['image/jpeg', 'image/png', 'image/webp'])

export const BUCKET_GALERIA = 'galeria'
export const BUCKET_PORTADAS = 'covers'

/** Planes con perfil completo: todos menos el gratuito (como public.plan_de_pago()). */
export function esPlanDePago(plan: string | null | undefined): boolean {
  return plan === 'premium' || plan === 'destacado' || plan === 'empresas'
}

// ── Vídeos ────────────────────────────────────────────────────────────────

export type Plataforma = 'youtube' | 'vimeo'
export type VideoAnalizado = { plataforma: Plataforma; id: string; url: string }

// Las mismas expresiones que la CHECK perfil_galeria_videos_url_check.
const YOUTUBE = /^https:\/\/(www\.|m\.)?(youtube\.com\/(watch\?v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})([?&#][^\s]*)?$/
const VIMEO = /^https:\/\/(www\.|player\.)?vimeo\.com\/(video\/)?([0-9]{6,12})([/?#][^\s]*)?$/

/** Reconoce un enlace de YouTube o Vimeo. Null si no es ninguno de los dos (o no es https). */
export function analizarVideo(url: string): VideoAnalizado | null {
  const u = url.trim()
  const yt = u.match(YOUTUBE)
  if (yt) return { plataforma: 'youtube', id: yt[4], url: u }
  const vm = u.match(VIMEO)
  if (vm) return { plataforma: 'vimeo', id: vm[3], url: u }
  return null
}

/**
 * Reproductor sin cookies de seguimiento: youtube-nocookie.com y Vimeo con
 * dnt=1. Solo se carga al pulsar «reproducir».
 */
export function urlReproductor(v: Pick<VideoAnalizado, 'plataforma' | 'id'>): string {
  return v.plataforma === 'youtube'
    ? `https://www.youtube-nocookie.com/embed/${v.id}?autoplay=1&rel=0`
    : `https://player.vimeo.com/video/${v.id}?autoplay=1&dnt=1`
}

/** Miniatura de YouTube (i.ytimg.com, sin cookies). Vimeo no la da sin llamar a su API: null. */
export function miniaturaVideo(v: Pick<VideoAnalizado, 'plataforma' | 'id'>): string | null {
  return v.plataforma === 'youtube' ? `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg` : null
}

// ── Validaciones de formulario ────────────────────────────────────────────

const largo = (v: string | null | undefined) => (v ?? '').trim().length

export function validarFoto(c: { pie: string; credito: string }): string | null {
  if (largo(c.pie) > MAX_PIE) return `El pie de foto no puede pasar de ${MAX_PIE} caracteres.`
  if (largo(c.credito) > MAX_CREDITO) return `El crédito no puede pasar de ${MAX_CREDITO} caracteres.`
  return null
}

export function validarVideo(c: { url: string; titulo: string }): string | null {
  if (!analizarVideo(c.url)) return 'Pega un enlace de YouTube o de Vimeo (https).'
  if (largo(c.titulo) > MAX_TITULO_VIDEO) return `El título no puede pasar de ${MAX_TITULO_VIDEO} caracteres.`
  return null
}

export type CamposProyecto = { titulo: string; anio: string; rol: string; compania: string; descripcion: string; enlace: string }

export function validarProyecto(c: CamposProyecto): string | null {
  const titulo = c.titulo.trim()
  if (titulo === '') return 'El título es obligatorio.'
  if (titulo.length > MAX_TITULO_PROYECTO) return `El título no puede pasar de ${MAX_TITULO_PROYECTO} caracteres.`
  if (c.anio.trim() !== '') {
    const anio = Number(c.anio)
    if (!Number.isInteger(anio) || anio < 1900 || anio > 2100) return 'El año no es válido.'
  }
  if (largo(c.rol) > MAX_ROL) return `El rol no puede pasar de ${MAX_ROL} caracteres.`
  if (largo(c.compania) > MAX_COMPANIA) return `La compañía no puede pasar de ${MAX_COMPANIA} caracteres.`
  if (largo(c.descripcion) > MAX_DESCRIPCION_PROYECTO) return `La descripción no puede pasar de ${MAX_DESCRIPCION_PROYECTO} caracteres.`
  if (c.enlace.trim() !== '' && !/^https:\/\/[^\s/?#]+[^\s]*$/i.test(c.enlace.trim())) return 'El enlace debe empezar por https://.'
  return null
}

/** Fila de perfil_portfolio a partir del formulario (vacío → null). */
export function filaProyecto(c: CamposProyecto) {
  const nulo = (v: string) => (v.trim() === '' ? null : v.trim())
  return {
    titulo: c.titulo.trim(),
    anio: c.anio.trim() === '' ? null : Number(c.anio),
    rol: nulo(c.rol),
    compania: nulo(c.compania),
    descripcion: nulo(c.descripcion),
    enlace: nulo(c.enlace),
  }
}

export function validarImagen(archivo: { type: string; size: number }): string | null {
  if (!TIPOS_IMAGEN.has(archivo.type)) return 'La imagen debe ser JPEG, PNG o WebP.'
  if (archivo.size > IMAGEN_MAX_BYTES) return 'La imagen no puede pasar de 5 MB.'
  return null
}

/** Límite de una sección: mensaje si ya está llena. */
export function limiteAlcanzado(actual: number, maximo: number): string | null {
  return actual >= maximo ? `Has alcanzado el máximo de ${maximo}. Borra alguno para añadir otro.` : null
}

// ── Rutas y URLs de Storage ───────────────────────────────────────────────

/** Ruta nueva y no adivinable en la carpeta del usuario (lo exigen la CHECK y las políticas). */
export function rutaNueva(profileId: string, carpeta: 'fotos' | 'portfolio' | 'portada', ext: string, aleatorio: string = crypto.randomUUID()): string {
  return `${profileId}/${carpeta}/${aleatorio}.${ext}`
}

export function urlPublica(supabaseUrl: string, bucket: string, ruta: string): string {
  return `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/${bucket}/${ruta.split('/').map(encodeURIComponent).join('/')}`
}

/**
 * Portada válida para mostrar: solo una URL pública del bucket «covers» y de
 * la carpeta del propio perfil. profiles.cover_url la puede escribir el
 * usuario con su sesión: así nunca se pinta una URL ajena.
 */
export function portadaValida(coverUrl: string | null, supabaseUrl: string, profileId: string): string | null {
  if (!coverUrl) return null
  const prefijo = `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/${BUCKET_PORTADAS}/${profileId}/`
  return coverUrl.startsWith(prefijo) && !/[\s"'<>]/.test(coverUrl) ? coverUrl : null
}

/** Ruta dentro del bucket a partir de su URL pública (para borrar el archivo anterior). */
export function rutaDesdeUrl(url: string | null, bucket: string): string | null {
  if (!url) return null
  const marca = `/storage/v1/object/public/${bucket}/`
  const i = url.indexOf(marca)
  return i === -1 ? null : url.slice(i + marca.length).split('/').map(decodeURIComponent).join('/')
}

// ── Redimensionado ────────────────────────────────────────────────────────

/** Tamaño final con el lado largo ≤ maximo, sin agrandar nunca. */
export function dimensionesReducidas(ancho: number, alto: number, maximo: number = LADO_LARGO_MAX): { ancho: number; alto: number } {
  const largoActual = Math.max(ancho, alto)
  if (largoActual <= maximo) return { ancho, alto }
  const f = maximo / largoActual
  return { ancho: Math.round(ancho * f), alto: Math.round(alto * f) }
}

/** Intercambia la posición de dos elementos: los dos UPDATE de `orden`. */
export function intercambiarOrden(a: { id: string; orden: number }, b: { id: string; orden: number }) {
  if (a.orden === b.orden) return [{ id: a.id, orden: b.orden + 1 }, { id: b.id, orden: a.orden }]
  return [{ id: a.id, orden: b.orden }, { id: b.id, orden: a.orden }]
}
