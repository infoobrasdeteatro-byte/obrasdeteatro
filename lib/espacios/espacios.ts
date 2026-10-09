import { COUNTRIES, getCountryByCode } from '@/lib/geo/countries'

/**
 * Espacios escénicos: catálogo propio de teatros, auditorios, salas, centros
 * culturales y espacios al aire libre, separado de los perfiles.
 *
 * Funciones puras (filtros del buscador, exploración por país y municipio,
 * validación de los formularios, datos estructurados) para poder probarlas
 * sin base de datos. Las lecturas públicas viven en ./datos.ts; las tablas y
 * la RLS, en las migraciones 20261009120000 y 20261009150000.
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

export const ACCESIBILIDAD = [
  { value: 'si', label: 'Accesible' },
  { value: 'parcial', label: 'Accesibilidad parcial' },
  { value: 'no', label: 'No accesible' },
] as const

export const TITULARIDAD = [
  { value: 'publica', label: 'Pública' },
  { value: 'privada', label: 'Privada' },
] as const

export const DESCRIPCION_ORIGEN = [
  { value: 'redaccion', label: 'Redacción' },
  { value: 'ia_revisada', label: 'Generada con IA y revisada' },
  { value: 'responsable', label: 'Responsable del espacio' },
] as const

/** Redes admitidas, en el orden en que se muestran, con el dominio que debe tener su URL. */
export const REDES = [
  { clave: 'instagram', label: 'Instagram', dominios: ['instagram.com'] },
  { clave: 'facebook', label: 'Facebook', dominios: ['facebook.com', 'fb.com'] },
  { clave: 'x', label: 'X', dominios: ['x.com', 'twitter.com'] },
  { clave: 'youtube', label: 'YouTube', dominios: ['youtube.com', 'youtu.be'] },
  { clave: 'tiktok', label: 'TikTok', dominios: ['tiktok.com'] },
] as const

export type ClaveRed = (typeof REDES)[number]['clave']

/** Tramos de aforo del filtro. */
export const TAMANOS = [
  { value: 'hasta150', label: 'Hasta 150 localidades', min: 1, max: 150 },
  { value: '151-500', label: '151 a 500 localidades', min: 151, max: 500 },
  { value: 'mas500', label: 'Más de 500 localidades', min: 501, max: Infinity },
] as const

export const MAX_NOMBRE = 160
export const MAX_MUNICIPIO = 120
export const MAX_DIRECCION = 200
export const MAX_DESCRIPCION = 600
export const MIN_MENSAJE = 10
export const MAX_MENSAJE = 500
export const MIN_SUGERENCIA = 10
export const MAX_SUGERENCIA = 1000
/** Fichas en «Otros espacios en <municipio>». */
export const MAX_OTROS = 6

export const URL_OSM_COPYRIGHT = 'https://www.openstreetmap.org/copyright'
export const URL_WIKIDATA = 'https://www.wikidata.org'

const etiqueta = (lista: readonly { value: string; label: string }[], v: string | null) =>
  v === null ? null : lista.find(x => x.value === v)?.label ?? v

export function etiquetaTipo(tipo: string): string {
  return etiqueta(TIPOS, tipo) ?? tipo
}
export const etiquetaAccesibilidad = (v: string | null) => etiqueta(ACCESIBILIDAD, v)
export const etiquetaTitularidad = (v: string | null) => etiqueta(TITULARIDAD, v)

/** Lo que pinta una tarjeta del buscador (y un punto del mapa) y lo que hace falta para filtrar. */
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
  lat: number
  lon: number
  aforo: number | null
  accesibilidad: string | null
  verificado: boolean
  imagen_url: string | null
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
  codigo_postal: string | null
  lat: number
  lon: number
  web: string | null
  telefono: string | null
  email: string | null
  redes: unknown
  aforo: number | null
  num_salas: number | null
  accesibilidad: string | null
  anio_inauguracion: number | null
  arquitecto: string | null
  titularidad: string | null
  descripcion: string | null
  imagen_url: string | null
  imagen_autor: string | null
  imagen_licencia: string | null
  imagen_fuente_url: string | null
  verificado: boolean
}

/** Minúsculas y sin tildes, igual que la columna nombre_normalizado (unaccent + lower). */
export function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()
}

// ── Filtros del buscador ──────────────────────────────────────────────────

export type Tamano = (typeof TAMANOS)[number]['value']

export type Filtros = {
  pais: string | null
  region: string | null
  municipio: string | null
  tipo: string | null
  aforo: Tamano | null
  accesible: boolean
  q: string
}

type Crudo = string | string[] | undefined
export type ParametrosCrudos = { pais?: Crudo; region?: Crudo; m?: Crudo; tipo?: Crudo; aforo?: Crudo; accesible?: Crudo; q?: Crudo }

const uno = (v: Crudo) => (Array.isArray(v) ? v[0] : v)?.trim() ?? ''

/**
 * Filtros válidos a partir de la URL. Solo pasan un país de los 20, una región
 * de ese país (lib/geo/countries.ts), un municipio si hay región, un tipo y un
 * tramo de aforo del catálogo y «accesible=1»; lo demás se ignora. La
 * búsqueda se recorta a 80 caracteres.
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
  const aforoCrudo = uno(p.aforo)
  const aforo = (TAMANOS.find(t => t.value === aforoCrudo)?.value ?? null) as Tamano | null
  return { pais, region, municipio, tipo, aforo, accesible: uno(p.accesible) === '1', q: uno(p.q).slice(0, 80) }
}

/** Filtros que no son de lugar: con alguno de ellos se listan espacios, no se explora. */
function filtrosDeContenido(f: Filtros): boolean {
  return Boolean(f.tipo || f.aforo || f.accesible || f.q)
}

export function hayFiltros(f: Filtros): boolean {
  return Boolean(f.pais) || filtrosDeContenido(f)
}

/**
 * Qué enseña /espacios debajo del buscador:
 *   - 'paises': sin filtros, tarjetas por país;
 *   - 'municipios': con país (y región) y nada más, tarjetas por municipio;
 *   - 'espacios': con municipio o cualquier otro filtro, las fichas.
 */
export type Nivel = 'paises' | 'municipios' | 'espacios'

export function nivelExploracion(f: Filtros): Nivel {
  if (f.municipio || filtrosDeContenido(f)) return 'espacios'
  return f.pais ? 'municipios' : 'paises'
}

function enTamano(aforo: number | null, tamano: Tamano | null): boolean {
  if (!tamano) return true
  const t = TAMANOS.find(x => x.value === tamano)!
  return aforo !== null && aforo >= t.min && aforo <= t.max
}

/** Por municipio; dentro de cada municipio, primero los verificados y después alfabético. */
export function compararEspacios(a: EspacioTarjeta, b: EspacioTarjeta): number {
  return a.municipio.localeCompare(b.municipio, 'es')
    || Number(b.verificado) - Number(a.verificado)
    || a.nombre.localeCompare(b.nombre, 'es')
}

/** Aplica los filtros y ordena (compararEspacios). Sin aforo conocido, un espacio no entra en ningún tramo. */
export function filtrarEspacios<T extends EspacioTarjeta>(lista: T[], f: Filtros): T[] {
  const q = normalizar(f.q)
  return lista
    .filter(e =>
      (!f.pais || e.pais_code === f.pais) &&
      (!f.region || e.region === f.region) &&
      (!f.municipio || e.municipio_slug === f.municipio) &&
      (!f.tipo || e.tipo === f.tipo) &&
      enTamano(e.aforo, f.aforo) &&
      (!f.accesible || e.accesibilidad === 'si') &&
      (!q || e.nombre_normalizado.includes(q)))
    .sort(compararEspacios)
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

// ── Exploración por país y municipio ──────────────────────────────────────

export type PaisConEspacios = { code: string; nombre: string; total: number }

/** Países con espacios publicados, de más a menos, en el orden de countries.ts si empatan. */
export function paisesConEspacios(lista: Pick<EspacioTarjeta, 'pais_code'>[]): PaisConEspacios[] {
  const cuenta = new Map<string, number>()
  for (const e of lista) cuenta.set(e.pais_code, (cuenta.get(e.pais_code) ?? 0) + 1)
  return COUNTRIES
    .filter(c => cuenta.has(c.code))
    .map(c => ({ code: c.code, nombre: c.name, total: cuenta.get(c.code)! }))
    .sort((a, b) => b.total - a.total)
}

export type MunicipioConEspacios = { pais_code: string; region: string; municipio: string; municipio_slug: string; total: number }

type ParaMunicipio = Pick<EspacioTarjeta, 'pais_code' | 'region' | 'municipio' | 'municipio_slug'>

/** Municipios con al menos un espacio publicado, alfabético (sitemap, exploración y enlaces). */
export function municipiosConEspacios(lista: ParaMunicipio[]): MunicipioConEspacios[] {
  const mapa = new Map<string, MunicipioConEspacios>()
  for (const e of lista) {
    const clave = `${e.pais_code}/${e.municipio_slug}`
    const actual = mapa.get(clave)
    if (actual) actual.total++
    else mapa.set(clave, { pais_code: e.pais_code, region: e.region, municipio: e.municipio, municipio_slug: e.municipio_slug, total: 1 })
  }
  return [...mapa.values()].sort((a, b) => a.municipio.localeCompare(b.municipio, 'es'))
}

/** Enlace del buscador filtrado por país, región o municipio. */
export function urlFiltro(f: { pais?: string; region?: string; m?: string }): string {
  const qs = new URLSearchParams()
  if (f.pais) qs.set('pais', f.pais)
  if (f.pais && f.region) qs.set('region', f.region)
  if (f.pais && f.region && f.m) qs.set('m', f.m)
  const s = qs.toString()
  return s ? `/espacios?${s}` : '/espacios'
}

/** «Otros espacios en <municipio>»: los del mismo municipio menos el propio, verificados primero, hasta MAX_OTROS. */
export function otrosDelMunicipio<T extends EspacioTarjeta>(lista: T[], ficha: Pick<EspacioFicha, 'id' | 'pais_code' | 'municipio_slug'>): T[] {
  return lista
    .filter(e => e.id !== ficha.id && e.pais_code === ficha.pais_code && e.municipio_slug === ficha.municipio_slug)
    .sort(compararEspacios)
    .slice(0, MAX_OTROS)
}

// ── Rutas ─────────────────────────────────────────────────────────────────

export function rutaFicha(slug: string): string {
  return `/espacios/${slug}`
}

/** Página por municipio: /espacios/es/santa-cruz-de-tenerife. */
export function rutaMunicipio(paisCode: string, municipioSlug: string): string {
  return `/espacios/${paisCode.toLowerCase()}/${municipioSlug}`
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

/** Aforo para mostrar: «1.200 localidades». */
export function textoAforo(aforo: number | null): string | null {
  return aforo ? `${aforo.toLocaleString('es-ES')} localidades` : null
}

// ── Foto, contacto y redes ────────────────────────────────────────────────

/** Solo fotos de upload.wikimedia.org (lo que admiten la CHECK de la tabla y next.config). */
export function imagenSegura(url: string | null): string | null {
  return url && /^https:\/\/upload\.wikimedia\.org\/[^\s"'<>]+$/.test(url) ? url : null
}

export type Credito = { autor: string | null; licencia: string; fuente: string }

/**
 * Crédito de la foto: «Foto: autor · licencia · Wikimedia Commons». Sin
 * licencia o sin página de origen no hay crédito, y sin crédito la foto no
 * se muestra (la base tampoco lo permite).
 */
export function creditoImagen(e: Pick<EspacioFicha, 'imagen_url' | 'imagen_autor' | 'imagen_licencia' | 'imagen_fuente_url'>): Credito | null {
  if (!imagenSegura(e.imagen_url) || !e.imagen_licencia) return null
  if (!e.imagen_fuente_url || !/^https:\/\/commons\.wikimedia\.org\/[^\s"'<>]+$/.test(e.imagen_fuente_url)) return null
  return { autor: e.imagen_autor, licencia: e.imagen_licencia, fuente: e.imagen_fuente_url }
}

export function textoCredito(c: Credito): string {
  return ['Foto:', [c.autor, c.licencia, 'Wikimedia Commons'].filter(Boolean).join(' · ')].join(' ')
}

/** ¿La URL es https y de uno de los dominios (o subdominios) de la red? */
function urlDeRed(url: string, dominios: readonly string[]): boolean {
  let host: string
  try {
    const u = new URL(url)
    if (u.protocol !== 'https:') return false
    host = u.hostname.toLowerCase()
  } catch {
    return false
  }
  return dominios.some(d => host === d || host.endsWith(`.${d}`))
}

export type Red = { clave: ClaveRed; label: string; url: string }

/** Redes del jsonb, en orden fijo; las que no son https o no son de su red se descartan. */
export function redesDe(redes: unknown): Red[] {
  if (!redes || typeof redes !== 'object' || Array.isArray(redes)) return []
  const r = redes as Record<string, unknown>
  return REDES.flatMap(red => {
    const url = r[red.clave]
    return typeof url === 'string' && urlDeRed(url, red.dominios) ? [{ clave: red.clave, label: red.label, url }] : []
  })
}

/** Teléfono para el enlace tel: (solo dígitos y +). */
export function hrefTelefono(telefono: string): string {
  return `tel:${telefono.replace(/[^\d+]/g, '')}`
}

const EMAIL = /^[^\s@<>"]+@[^\s@<>"]+\.[a-z]{2,}$/i

// ── Datos estructurados ──────────────────────────────────────────────────

/** schema.org: los teatros como PerformingArtsTheater; el resto, EventVenue. */
export function jsonLdEspacio(e: EspacioFicha, urlCanonica: string) {
  const pais = getCountryByCode(e.pais_code)
  const web = webEnlazable(e.web)
  const imagen = creditoImagen(e) ? imagenSegura(e.imagen_url) : null
  const redes = redesDe(e.redes).map(r => r.url)
  const sameAs = [...(web ? [web] : []), ...redes]
  return {
    '@context': 'https://schema.org',
    '@type': e.tipo === 'teatro' ? 'PerformingArtsTheater' : 'EventVenue',
    name: e.nombre,
    url: urlCanonica,
    ...(e.descripcion ? { description: e.descripcion } : {}),
    ...(imagen ? { image: imagen } : {}),
    ...(e.telefono ? { telephone: e.telefono } : {}),
    ...(e.email && EMAIL.test(e.email) ? { email: e.email } : {}),
    ...(sameAs.length ? { sameAs } : {}),
    ...(e.aforo ? { maximumAttendeeCapacity: e.aforo } : {}),
    ...(e.accesibilidad === 'si'
      ? { amenityFeature: { '@type': 'LocationFeatureSpecification', name: 'Acceso para personas con movilidad reducida', value: true } }
      : {}),
    address: {
      '@type': 'PostalAddress',
      ...(e.direccion ? { streetAddress: e.direccion } : {}),
      ...(e.codigo_postal ? { postalCode: e.codigo_postal } : {}),
      addressLocality: e.municipio,
      addressRegion: e.provincia ?? e.region,
      addressCountry: pais?.code ?? e.pais_code,
    },
    geo: { '@type': 'GeoCoordinates', latitude: e.lat, longitude: e.lon },
  }
}

// ── Reclamación y sugerencias ─────────────────────────────────────────────

export function validarMensajeReclamacion(mensaje: unknown): string | null {
  if (typeof mensaje !== 'string') return 'Escribe tu cargo y cómo contactarte.'
  const m = mensaje.trim()
  if (m.length < MIN_MENSAJE) return 'Cuéntanos tu cargo y una forma de contacto (al menos 10 caracteres).'
  if (m.length > MAX_MENSAJE) return `El mensaje no puede pasar de ${MAX_MENSAJE} caracteres.`
  return null
}

/** Sugerencia de corrección: texto de 10 a 1000 caracteres y, si se da, un email válido. */
export function validarSugerencia(texto: unknown, email: unknown): string | null {
  if (typeof texto !== 'string' || texto.trim().length < MIN_SUGERENCIA) return 'Cuéntanos qué hay que corregir (al menos 10 caracteres).'
  if (texto.trim().length > MAX_SUGERENCIA) return `La sugerencia no puede pasar de ${MAX_SUGERENCIA} caracteres.`
  if (email !== undefined && email !== null && email !== '') {
    if (typeof email !== 'string' || email.trim().length > 254 || !EMAIL.test(email.trim())) return 'El email no es válido (puedes dejarlo vacío).'
  }
  return null
}

/** Nombre del campo trampa del formulario de sugerencias: si llega relleno, es un robot. */
export const CAMPO_TRAMPA = 'sitio_web'

/** Ancla de la ficha que abre el formulario de reclamación al volver del login. */
export const ANCLA_RECLAMAR = 'reclamar'

// ── Formulario de admin ───────────────────────────────────────────────────

/** Columnas que lee /admin/espacios (página y recarga del cliente). */
export const COLUMNAS_ADMIN =
  'id, slug, nombre, tipo, pais_code, region, provincia, isla, municipio, direccion, codigo_postal, lat, lon, web, telefono, email, redes, aforo, num_salas, accesibilidad, anio_inauguracion, arquitecto, titularidad, wikidata_id, imagen_url, imagen_autor, imagen_licencia, imagen_fuente_url, descripcion, descripcion_origen, fuente, fuente_ref, estado, gestionado_por, verificado, updated_at'

export type CamposEspacio = {
  nombre: string
  tipo: string
  pais_code: string
  region: string
  provincia: string
  isla: string
  municipio: string
  direccion: string
  codigo_postal: string
  lat: string
  lon: string
  web: string
  telefono: string
  email: string
  redes: Record<ClaveRed, string>
  aforo: string
  num_salas: string
  accesibilidad: string
  anio_inauguracion: string
  arquitecto: string
  titularidad: string
  wikidata_id: string
  imagen_url: string
  imagen_autor: string
  imagen_licencia: string
  imagen_fuente_url: string
  descripcion: string
  descripcion_origen: string
  fuente: string
  fuente_ref: string
}

export const REDES_VACIAS: Record<ClaveRed, string> = { instagram: '', facebook: '', x: '', youtube: '', tiktok: '' }

/** Redes del jsonb tal cual, para rellenar el formulario (sin descartar nada: lo que no valga lo dirá la validación). */
export function redesParaFormulario(redes: unknown): Record<ClaveRed, string> {
  const r = redes && typeof redes === 'object' && !Array.isArray(redes) ? (redes as Record<string, unknown>) : {}
  return Object.fromEntries(REDES.map(x => [x.clave, typeof r[x.clave] === 'string' ? (r[x.clave] as string) : ''])) as Record<ClaveRed, string>
}

const entero = (v: string) => /^\d+$/.test(v.trim()) && Number(v) > 0
const coordenada = (v: string, max: number) => {
  const n = Number(v.trim().replace(',', '.'))
  return v.trim() !== '' && Number.isFinite(n) && Math.abs(n) <= max
}
const enLista = (lista: readonly { value: string }[], v: string) => v === '' || lista.some(x => x.value === v)

/**
 * Validación del formulario de admin. Null si todo está bien. Repite las
 * CHECK de la tabla y añade lo que la base no puede saber (que la región
 * pertenezca al país, que cada red sea de su dominio). La web nueva tiene que
 * ser https; `webAnterior` deja guardar sin tocarla una ficha que ya venía en
 * http.
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
  if (c.codigo_postal.trim() !== '' && !/^[A-Za-z0-9][A-Za-z0-9 -]{1,9}$/.test(c.codigo_postal.trim())) return 'El código postal no es válido.'
  if (!coordenada(c.lat, 90)) return 'La latitud debe ser un número entre -90 y 90.'
  if (!coordenada(c.lon, 180)) return 'La longitud debe ser un número entre -180 y 180.'
  const web = c.web.trim()
  if (web !== '' && web !== webAnterior && !/^https:\/\/[^\s/?#"'<>]+[^\s"'<>]*$/i.test(web)) return 'La web debe empezar por https://.'
  if (c.telefono.trim() !== '' && !/^\+?[0-9][0-9 ().-]{5,28}$/.test(c.telefono.trim())) return 'El teléfono no es válido (solo números, espacios, +, paréntesis y guiones).'
  if (c.email.trim() !== '' && (c.email.trim().length > 254 || !EMAIL.test(c.email.trim()))) return 'El email no es válido.'
  for (const red of REDES) {
    const url = c.redes[red.clave].trim()
    if (url !== '' && !urlDeRed(url, red.dominios)) return `${red.label}: debe ser una URL https de ${red.dominios[0]}.`
  }
  if (c.aforo.trim() !== '' && !entero(c.aforo)) return 'El aforo debe ser un número entero mayor que 0.'
  if (c.num_salas.trim() !== '' && !entero(c.num_salas)) return 'El número de salas debe ser un entero mayor que 0.'
  if (!enLista(ACCESIBILIDAD, c.accesibilidad)) return 'Elige la accesibilidad.'
  if (c.anio_inauguracion.trim() !== '') {
    const anio = Number(c.anio_inauguracion.trim())
    if (!/^\d{4}$/.test(c.anio_inauguracion.trim()) || anio < 1500 || anio > 2100) return 'El año de inauguración debe estar entre 1500 y 2100.'
  }
  if (c.arquitecto.trim().length > 120) return 'El arquitecto no puede pasar de 120 caracteres.'
  if (!enLista(TITULARIDAD, c.titularidad)) return 'Elige la titularidad.'
  if (c.wikidata_id.trim() !== '' && !/^Q[1-9]\d*$/.test(c.wikidata_id.trim())) return 'El identificador de Wikidata tiene la forma Q123.'
  const imagen = c.imagen_url.trim()
  if (imagen !== '') {
    if (!imagenSegura(imagen)) return 'La foto debe ser una URL de https://upload.wikimedia.org/.'
    if (c.imagen_licencia.trim() === '') return 'Con foto, la licencia es obligatoria (p. ej. «CC BY-SA 4.0»).'
    if (!/^https:\/\/commons\.wikimedia\.org\/[^\s"'<>]+$/.test(c.imagen_fuente_url.trim())) return 'Con foto, indica su página de Wikimedia Commons (https://commons.wikimedia.org/…).'
  }
  if (c.imagen_autor.trim().length > 160) return 'El autor de la foto no puede pasar de 160 caracteres.'
  if (c.imagen_licencia.trim().length > 60) return 'La licencia no puede pasar de 60 caracteres.'
  if (c.descripcion.trim().length > MAX_DESCRIPCION) return `La descripción no puede pasar de ${MAX_DESCRIPCION} caracteres.`
  if (!enLista(DESCRIPCION_ORIGEN, c.descripcion_origen)) return 'Elige quién redactó la descripción.'
  if (!FUENTES.some(f => f.value === c.fuente)) return 'Elige la fuente.'
  if (c.fuente_ref.trim().length > 120) return 'La referencia de la fuente es demasiado larga.'
  return null
}

/** Fila para INSERT/UPDATE a partir del formulario (vacío → null). Nunca toca estado, slug, gestionado_por ni verificado. */
export function filaDeFormulario(c: CamposEspacio) {
  const nulo = (v: string) => (v.trim() === '' ? null : v.trim())
  const num = (v: string) => Number(v.trim().replace(',', '.'))
  const enteroONulo = (v: string) => (v.trim() === '' ? null : Number(v.trim()))
  const redes = Object.fromEntries(REDES.flatMap(r => (c.redes[r.clave].trim() ? [[r.clave, c.redes[r.clave].trim()]] : [])))
  return {
    nombre: c.nombre.trim(),
    tipo: c.tipo,
    pais_code: c.pais_code,
    region: c.region,
    provincia: nulo(c.provincia),
    isla: nulo(c.isla),
    municipio: c.municipio.trim(),
    direccion: nulo(c.direccion),
    codigo_postal: nulo(c.codigo_postal),
    lat: num(c.lat),
    lon: num(c.lon),
    web: nulo(c.web),
    telefono: nulo(c.telefono),
    email: nulo(c.email),
    redes: Object.keys(redes).length ? redes : null,
    aforo: enteroONulo(c.aforo),
    num_salas: enteroONulo(c.num_salas),
    accesibilidad: nulo(c.accesibilidad),
    anio_inauguracion: enteroONulo(c.anio_inauguracion),
    arquitecto: nulo(c.arquitecto),
    titularidad: nulo(c.titularidad),
    wikidata_id: nulo(c.wikidata_id),
    imagen_url: nulo(c.imagen_url),
    imagen_autor: nulo(c.imagen_autor),
    imagen_licencia: nulo(c.imagen_licencia),
    imagen_fuente_url: nulo(c.imagen_fuente_url),
    descripcion: nulo(c.descripcion),
    descripcion_origen: nulo(c.descripcion_origen),
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
