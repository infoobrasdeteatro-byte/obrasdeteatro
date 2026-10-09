import { COUNTRIES, getCountryByCode } from '@/lib/geo/countries'

/**
 * Espacios escénicos: catálogo propio de teatros, auditorios, salas, centros
 * culturales y espacios al aire libre, separado de los perfiles.
 *
 * Funciones puras (filtros del buscador, validación del formulario de admin y
 * de la reclamación, datos estructurados) para poder probarlas sin base de
 * datos. Las lecturas públicas viven en ./datos.ts; la tabla y la RLS, en la
 * migración 20261009120000.
 */

export const TIPOS = [
  { value: 'teatro', label: 'Teatro' },
  { value: 'auditorio', label: 'Auditorio' },
  { value: 'sala', label: 'Sala' },
  { value: 'centro_cultural', label: 'Centro cultural' },
  { value: 'aire_libre', label: 'Espacio al aire libre' },
] as const

export type TipoEspacio = (typeof TIPOS)[number]['value']

export const ESTADOS = [
  { value: 'publicado', label: 'Publicado' },
  { value: 'borrador', label: 'Borrador' },
  { value: 'retirado', label: 'Retirado' },
] as const

export const FUENTES = [
  { value: 'redaccion', label: 'Redacción' },
  { value: 'osm', label: 'OpenStreetMap' },
  { value: 'wikidata', label: 'Wikidata' },
  { value: 'responsable', label: 'Responsable del espacio' },
] as const

export const MAX_NOMBRE = 160
export const MAX_MUNICIPIO = 120
export const MAX_DIRECCION = 200
export const MAX_DESCRIPCION = 600
export const MIN_MENSAJE = 10
export const MAX_MENSAJE = 500

export const URL_OSM_COPYRIGHT = 'https://www.openstreetmap.org/copyright'
export const URL_WIKIDATA = 'https://www.wikidata.org'

export function etiquetaTipo(tipo: string): string {
  return TIPOS.find(t => t.value === tipo)?.label ?? tipo
}

/** Lo que pinta una tarjeta del buscador y lo que hace falta para filtrar. */
export type EspacioTarjeta = {
  id: string
  slug: string
  nombre: string
  tipo: string
  pais_code: string
  region: string
  isla: string | null
  municipio: string
  municipio_slug: string
  nombre_normalizado: string
}

export type EspacioFicha = {
  id: string
  slug: string
  nombre: string
  tipo: string
  pais_code: string
  region: string
  provincia: string | null
  isla: string | null
  municipio: string
  municipio_slug: string
  direccion: string | null
  lat: number
  lon: number
  web: string | null
  aforo: number | null
  num_salas: number | null
  descripcion: string | null
}

/** Minúsculas y sin tildes, igual que la columna nombre_normalizado (unaccent + lower). */
export function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()
}

// ── Filtros del buscador ──────────────────────────────────────────────────

export type Filtros = { pais: string | null; region: string | null; municipio: string | null; tipo: string | null; q: string }

type ParametrosCrudos = { pais?: string | string[]; region?: string | string[]; m?: string | string[]; tipo?: string | string[]; q?: string | string[] }

const uno = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() ?? ''

/**
 * Filtros válidos a partir de la URL. Solo pasan un país de los 20, una región
 * de ese país (lib/geo/countries.ts), un municipio si hay región y un tipo del
 * catálogo; lo demás se ignora. La búsqueda se recorta a 80 caracteres.
 */
export function leerFiltros(p: ParametrosCrudos): Filtros {
  const paisCrudo = uno(p.pais).toUpperCase()
  const pais = getCountryByCode(paisCrudo) ? paisCrudo : null
  const regionCruda = uno(p.region)
  const region = pais && getCountryByCode(pais)!.regions.includes(regionCruda) ? regionCruda : null
  const mCrudo = uno(p.m)
  const municipio = region && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(mCrudo) ? mCrudo : null
  const tipoCrudo = uno(p.tipo)
  const tipo = TIPOS.some(t => t.value === tipoCrudo) ? tipoCrudo : null
  return { pais, region, municipio, tipo, q: uno(p.q).slice(0, 80) }
}

export function hayFiltros(f: Filtros): boolean {
  return Boolean(f.pais || f.tipo || f.q)
}

/** Aplica los filtros y ordena por municipio y nombre. */
export function filtrarEspacios<T extends EspacioTarjeta>(lista: T[], f: Filtros): T[] {
  const q = normalizar(f.q)
  return lista
    .filter(e =>
      (!f.pais || e.pais_code === f.pais) &&
      (!f.region || e.region === f.region) &&
      (!f.municipio || e.municipio_slug === f.municipio) &&
      (!f.tipo || e.tipo === f.tipo) &&
      (!q || e.nombre_normalizado.includes(q)))
    .sort((a, b) => a.municipio.localeCompare(b.municipio, 'es') || a.nombre.localeCompare(b.nombre, 'es'))
}

export type Opcion = { value: string; label: string }

/**
 * Opciones de los desplegables en cascada, sacadas de los espacios publicados:
 * solo se ofrecen países, regiones y municipios donde hay algo que ver.
 */
export function opcionesFiltro(lista: EspacioTarjeta[], f: Filtros): { paises: Opcion[]; regiones: Opcion[]; municipios: Opcion[] } {
  const paisesCon = new Set(lista.map(e => e.pais_code))
  const paises = COUNTRIES.filter(c => paisesCon.has(c.code)).map(c => ({ value: c.code, label: c.name }))

  const regiones = f.pais
    ? [...new Set(lista.filter(e => e.pais_code === f.pais).map(e => e.region))]
        .sort((a, b) => a.localeCompare(b, 'es'))
        .map(r => ({ value: r, label: r }))
    : []

  const municipiosMap = new Map<string, string>()
  if (f.pais && f.region) {
    for (const e of lista) if (e.pais_code === f.pais && e.region === f.region) municipiosMap.set(e.municipio_slug, e.municipio)
  }
  const municipios = [...municipiosMap].map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label, 'es'))

  return { paises, regiones, municipios }
}

// ── Rutas ─────────────────────────────────────────────────────────────────

export function rutaFicha(slug: string): string {
  return `/espacios/${slug}`
}

/** Página por municipio: /espacios/es/santa-cruz-de-tenerife. */
export function rutaMunicipio(paisCode: string, municipioSlug: string): string {
  return `/espacios/${paisCode.toLowerCase()}/${municipioSlug}`
}

export type MunicipioConEspacios = { pais_code: string; municipio: string; municipio_slug: string; total: number }

/** Municipios con al menos un espacio publicado (para el sitemap y los enlaces). */
export function municipiosConEspacios(lista: Pick<EspacioTarjeta, 'pais_code' | 'municipio' | 'municipio_slug'>[]): MunicipioConEspacios[] {
  const mapa = new Map<string, MunicipioConEspacios>()
  for (const e of lista) {
    const clave = `${e.pais_code}/${e.municipio_slug}`
    const actual = mapa.get(clave)
    if (actual) actual.total++
    else mapa.set(clave, { pais_code: e.pais_code, municipio: e.municipio, municipio_slug: e.municipio_slug, total: 1 })
  }
  return [...mapa.values()].sort((a, b) => a.municipio.localeCompare(b.municipio, 'es'))
}

/** «Cómo llegar»: Google Maps con las coordenadas, solo enlace. */
export function urlComoLlegar(lat: number, lon: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`
}

/** La web se pinta como enlace si es http(s) sin caracteres raros (dos fichas del primer lote siguen en http). */
export function webEnlazable(url: string | null): string | null {
  return url && /^https?:\/\/[^\s"'<>]+$/i.test(url) ? url : null
}

/** Texto de la web sin el protocolo ni la barra final, para mostrarla. */
export function webVisible(url: string): string {
  return url.replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/$/, '')
}

/** «Municipio, Isla» o «Municipio, Región» para las tarjetas. */
export function lugarCorto(e: Pick<EspacioTarjeta, 'municipio' | 'isla' | 'region'>): string {
  return [e.municipio, e.isla ?? e.region].filter(Boolean).join(' · ')
}

// ── Datos estructurados ──────────────────────────────────────────────────

/** schema.org: los teatros como PerformingArtsTheater; el resto, EventVenue. */
export function jsonLdEspacio(e: EspacioFicha, urlCanonica: string) {
  const pais = getCountryByCode(e.pais_code)
  const web = webEnlazable(e.web)
  return {
    '@context': 'https://schema.org',
    '@type': e.tipo === 'teatro' ? 'PerformingArtsTheater' : 'EventVenue',
    name: e.nombre,
    url: urlCanonica,
    ...(e.descripcion ? { description: e.descripcion } : {}),
    ...(web ? { sameAs: [web] } : {}),
    ...(e.aforo ? { maximumAttendeeCapacity: e.aforo } : {}),
    address: {
      '@type': 'PostalAddress',
      ...(e.direccion ? { streetAddress: e.direccion } : {}),
      addressLocality: e.municipio,
      addressRegion: e.provincia ?? e.region,
      addressCountry: pais?.code ?? e.pais_code,
    },
    geo: { '@type': 'GeoCoordinates', latitude: e.lat, longitude: e.lon },
  }
}

// ── Reclamación ───────────────────────────────────────────────────────────

export function validarMensajeReclamacion(mensaje: unknown): string | null {
  if (typeof mensaje !== 'string') return 'Escribe tu cargo y cómo contactarte.'
  const m = mensaje.trim()
  if (m.length < MIN_MENSAJE) return 'Cuéntanos tu cargo y una forma de contacto (al menos 10 caracteres).'
  if (m.length > MAX_MENSAJE) return `El mensaje no puede pasar de ${MAX_MENSAJE} caracteres.`
  return null
}

/** Ancla de la ficha que abre el formulario de reclamación al volver del login. */
export const ANCLA_RECLAMAR = 'reclamar'

// ── Formulario de admin ───────────────────────────────────────────────────

/** Columnas que lee /admin/espacios (página y recarga del cliente). */
export const COLUMNAS_ADMIN =
  'id, slug, nombre, tipo, pais_code, region, provincia, isla, municipio, direccion, lat, lon, web, aforo, num_salas, descripcion, fuente, fuente_ref, estado, gestionado_por, updated_at'

export type CamposEspacio = {
  nombre: string
  tipo: string
  pais_code: string
  region: string
  provincia: string
  isla: string
  municipio: string
  direccion: string
  lat: string
  lon: string
  web: string
  aforo: string
  num_salas: string
  descripcion: string
  fuente: string
  fuente_ref: string
}

const entero = (v: string) => /^\d+$/.test(v.trim()) && Number(v) > 0
const coordenada = (v: string, max: number) => {
  const n = Number(v.trim().replace(',', '.'))
  return v.trim() !== '' && Number.isFinite(n) && Math.abs(n) <= max
}

/**
 * Validación del formulario de admin. Null si todo está bien. Repite las
 * CHECK de la tabla y añade lo que la base no puede saber (que la región
 * pertenezca al país). La web nueva tiene que ser https; `webAnterior` deja
 * guardar sin tocarla una ficha que ya venía en http.
 */
export function validarEspacio(c: CamposEspacio, webAnterior: string | null = null): string | null {
  const nombre = c.nombre.trim()
  if (nombre === '') return 'El nombre es obligatorio.'
  if (nombre.length > MAX_NOMBRE) return `El nombre no puede pasar de ${MAX_NOMBRE} caracteres.`
  if (!TIPOS.some(t => t.value === c.tipo)) return 'Elige un tipo.'
  const pais = getCountryByCode(c.pais_code)
  if (!pais) return 'Elige un país del ámbito.'
  if (!pais.regions.includes(c.region)) return 'Elige una región de ese país.'
  if (c.municipio.trim() === '') return 'El municipio es obligatorio.'
  if (c.municipio.trim().length > MAX_MUNICIPIO) return `El municipio no puede pasar de ${MAX_MUNICIPIO} caracteres.`
  if (c.direccion.trim().length > MAX_DIRECCION) return `La dirección no puede pasar de ${MAX_DIRECCION} caracteres.`
  if (!coordenada(c.lat, 90)) return 'La latitud debe ser un número entre -90 y 90.'
  if (!coordenada(c.lon, 180)) return 'La longitud debe ser un número entre -180 y 180.'
  const web = c.web.trim()
  if (web !== '' && web !== webAnterior && !/^https:\/\/[^\s/?#"'<>]+[^\s"'<>]*$/i.test(web)) return 'La web debe empezar por https://.'
  if (c.aforo.trim() !== '' && !entero(c.aforo)) return 'El aforo debe ser un número entero mayor que 0.'
  if (c.num_salas.trim() !== '' && !entero(c.num_salas)) return 'El número de salas debe ser un entero mayor que 0.'
  if (c.descripcion.trim().length > MAX_DESCRIPCION) return `La descripción no puede pasar de ${MAX_DESCRIPCION} caracteres.`
  if (!FUENTES.some(f => f.value === c.fuente)) return 'Elige la fuente.'
  if (c.fuente_ref.trim().length > 120) return 'La referencia de la fuente es demasiado larga.'
  return null
}

/** Fila para INSERT/UPDATE a partir del formulario (vacío → null). Nunca toca estado, slug ni gestionado_por. */
export function filaDeFormulario(c: CamposEspacio) {
  const nulo = (v: string) => (v.trim() === '' ? null : v.trim())
  const num = (v: string) => Number(v.trim().replace(',', '.'))
  return {
    nombre: c.nombre.trim(),
    tipo: c.tipo,
    pais_code: c.pais_code,
    region: c.region,
    provincia: nulo(c.provincia),
    isla: nulo(c.isla),
    municipio: c.municipio.trim(),
    direccion: nulo(c.direccion),
    lat: num(c.lat),
    lon: num(c.lon),
    web: nulo(c.web),
    aforo: c.aforo.trim() === '' ? null : Number(c.aforo),
    num_salas: c.num_salas.trim() === '' ? null : Number(c.num_salas),
    descripcion: nulo(c.descripcion),
    fuente: c.fuente,
    fuente_ref: nulo(c.fuente_ref),
  }
}

/** Enlace a la fuente original del dato, para admin. */
export function urlFuente(fuente: string, ref: string | null): string | null {
  if (!ref) return null
  if (fuente === 'osm' && /^(node|way|relation)\/\d+$/.test(ref)) return `https://www.openstreetmap.org/${ref}`
  if (fuente === 'wikidata' && /^Q\d+$/.test(ref)) return `https://www.wikidata.org/wiki/${ref}`
  return null
}
