/**
 * Cartelera: vocabularios, validación y conversiones puras (sin red), para el
 * panel «Mis espectáculos» y, más adelante, la cartelera pública.
 * Las reglas de verdad (revisión, límites por plan, permisos) están en la
 * base: aquí solo lo que el usuario puede corregir antes de enviar.
 */

export const BUCKET_CARTELES = 'carteles'

export type Opcion = { value: string; label: string }

export const GENEROS: Opcion[] = [
  { value: 'teatro', label: 'Teatro' },
  { value: 'comedia', label: 'Comedia' },
  { value: 'drama', label: 'Drama' },
  { value: 'musical', label: 'Musical' },
  { value: 'danza', label: 'Danza' },
  { value: 'humor', label: 'Humor y monólogos' },
  { value: 'infantil', label: 'Infantil y familiar' },
  { value: 'opera', label: 'Ópera y zarzuela' },
  { value: 'circo', label: 'Circo' },
  { value: 'titeres', label: 'Títeres y objetos' },
  { value: 'clown', label: 'Clown' },
  { value: 'improvisacion', label: 'Improvisación' },
  { value: 'microteatro', label: 'Microteatro' },
  { value: 'performance', label: 'Performance' },
  { value: 'lectura', label: 'Lectura dramatizada' },
  { value: 'otro', label: 'Otro' },
]

export const ROLES: Opcion[] = [
  { value: 'reparto', label: 'Reparto' },
  { value: 'direccion', label: 'Dirección' },
  { value: 'ayudante_direccion', label: 'Ayudantía de dirección' },
  { value: 'autoria', label: 'Autoría' },
  { value: 'dramaturgia', label: 'Dramaturgia' },
  { value: 'adaptacion', label: 'Adaptación / versión' },
  { value: 'traduccion', label: 'Traducción' },
  { value: 'produccion', label: 'Producción' },
  { value: 'produccion_ejecutiva', label: 'Producción ejecutiva' },
  { value: 'escenografia', label: 'Escenografía' },
  { value: 'iluminacion', label: 'Iluminación' },
  { value: 'vestuario', label: 'Vestuario' },
  { value: 'maquillaje', label: 'Maquillaje y caracterización' },
  { value: 'peluqueria', label: 'Peluquería' },
  { value: 'atrezzo', label: 'Atrezo' },
  { value: 'musica', label: 'Música original' },
  { value: 'direccion_musical', label: 'Dirección musical' },
  { value: 'coreografia', label: 'Coreografía' },
  { value: 'sonido', label: 'Diseño de sonido' },
  { value: 'video', label: 'Audiovisuales y vídeo' },
  { value: 'direccion_tecnica', label: 'Dirección técnica' },
  { value: 'tecnica', label: 'Equipo técnico' },
  { value: 'regiduria', label: 'Regiduría' },
  { value: 'diseno_grafico', label: 'Diseño gráfico' },
  { value: 'fotografia', label: 'Fotografía' },
  { value: 'comunicacion', label: 'Prensa y comunicación' },
  { value: 'distribucion', label: 'Distribución' },
  { value: 'otro', label: 'Otro' },
]

export const TIPOS_OPCION: Opcion[] = [
  { value: 'venta', label: 'Venta online' },
  { value: 'reserva', label: 'Reserva online' },
  { value: 'taquilla', label: 'Solo en taquilla' },
  { value: 'gratis', label: 'Entrada libre / gratuita' },
]

export const IDIOMAS: Opcion[] = [
  { value: 'es', label: 'Español' },
  { value: 'ca', label: 'Catalán' },
  { value: 'eu', label: 'Euskera' },
  { value: 'gl', label: 'Gallego' },
  { value: 'pt', label: 'Portugués' },
  { value: 'en', label: 'Inglés' },
  { value: 'fr', label: 'Francés' },
  { value: 'it', label: 'Italiano' },
  { value: 'qu', label: 'Quechua' },
  { value: 'gn', label: 'Guaraní' },
]

export const MONEDAS = ['EUR', 'USD', 'MXN', 'ARS', 'COP', 'CLP', 'PEN', 'UYU', 'PYG', 'BOB', 'CRC', 'GTQ', 'HNL', 'NIO', 'DOP', 'VES', 'CUP', 'PAB']

/** Moneda habitual de cada país (la primera que se propone). */
export const MONEDA_PAIS: Record<string, string> = {
  ES: 'EUR', AR: 'ARS', MX: 'MXN', CO: 'COP', CL: 'CLP', PE: 'PEN', UY: 'UYU', PY: 'PYG', BO: 'BOB',
  EC: 'USD', VE: 'USD', CR: 'CRC', PA: 'USD', GT: 'GTQ', HN: 'HNL', NI: 'NIO', SV: 'USD', DO: 'DOP', CU: 'CUP', PR: 'USD',
}

/** Zonas horarias por país (la primera es la habitual). */
export const ZONAS_PAIS: Record<string, Opcion[]> = {
  ES: [{ value: 'Europe/Madrid', label: 'Península y Baleares' }, { value: 'Atlantic/Canary', label: 'Canarias' }],
  AR: [{ value: 'America/Argentina/Buenos_Aires', label: 'Argentina' }],
  MX: [
    { value: 'America/Mexico_City', label: 'Centro (CDMX)' },
    { value: 'America/Cancun', label: 'Quintana Roo' },
    { value: 'America/Chihuahua', label: 'Chihuahua' },
    { value: 'America/Hermosillo', label: 'Sonora' },
    { value: 'America/Mazatlan', label: 'Pacífico (Sinaloa, BCS)' },
    { value: 'America/Tijuana', label: 'Baja California' },
  ],
  CO: [{ value: 'America/Bogota', label: 'Colombia' }],
  CL: [{ value: 'America/Santiago', label: 'Chile continental' }],
  PE: [{ value: 'America/Lima', label: 'Perú' }],
  UY: [{ value: 'America/Montevideo', label: 'Uruguay' }],
  PY: [{ value: 'America/Asuncion', label: 'Paraguay' }],
  BO: [{ value: 'America/La_Paz', label: 'Bolivia' }],
  EC: [{ value: 'America/Guayaquil', label: 'Ecuador continental' }],
  VE: [{ value: 'America/Caracas', label: 'Venezuela' }],
  CR: [{ value: 'America/Costa_Rica', label: 'Costa Rica' }],
  PA: [{ value: 'America/Panama', label: 'Panamá' }],
  GT: [{ value: 'America/Guatemala', label: 'Guatemala' }],
  HN: [{ value: 'America/Tegucigalpa', label: 'Honduras' }],
  NI: [{ value: 'America/Managua', label: 'Nicaragua' }],
  SV: [{ value: 'America/El_Salvador', label: 'El Salvador' }],
  DO: [{ value: 'America/Santo_Domingo', label: 'República Dominicana' }],
  CU: [{ value: 'America/Havana', label: 'Cuba' }],
  PR: [{ value: 'America/Puerto_Rico', label: 'Puerto Rico' }],
}

/** Zona habitual de un lugar: en España, Canarias tiene la suya. */
export function zonaPorDefecto(paisCode: string | null | undefined, region?: string | null): string {
  if (paisCode === 'ES' && region && /canarias/i.test(region)) return 'Atlantic/Canary'
  return ZONAS_PAIS[paisCode ?? '']?.[0]?.value ?? 'Europe/Madrid'
}

const ETIQUETAS_ESTADO: Record<string, string> = {
  borrador: 'Borrador',
  pendiente_revision: 'En revisión',
  publicado: 'Publicado',
  rechazado: 'No aprobado',
  finalizado: 'Finalizado',
  cancelado: 'Cancelado',
  retirado: 'Retirado',
}
export const etiquetaEstado = (e: string) => ETIQUETAS_ESTADO[e] ?? e
export const etiquetaGenero = (g: string) => GENEROS.find(x => x.value === g)?.label ?? g
export const etiquetaRol = (r: string) => ROLES.find(x => x.value === r)?.label ?? r
export const etiquetaTipoOpcion = (t: string) => TIPOS_OPCION.find(x => x.value === t)?.label ?? t

// ── Espectáculo ───────────────────────────────────────────────────────────

export type CamposEspectaculo = {
  titulo: string
  compania_nombre: string
  genero_id: string
  sinopsis: string
  duracion_min: string
  edad_minima: string
  idioma: string
}

export const CAMPOS_VACIOS: CamposEspectaculo = {
  titulo: '', compania_nombre: '', genero_id: 'teatro', sinopsis: '', duracion_min: '', edad_minima: '', idioma: 'es',
}

const entero = (v: string) => /^\d+$/.test(v.trim())

export function validarEspectaculo(c: CamposEspectaculo): string | null {
  const t = c.titulo.trim()
  if (t.length < 2) return 'Escribe el título del espectáculo.'
  if (t.length > 160) return 'El título no puede pasar de 160 caracteres.'
  const comp = c.compania_nombre.trim()
  if (comp.length < 2) return 'Escribe el nombre de la compañía o de quien lo presenta.'
  if (comp.length > 160) return 'El nombre de la compañía no puede pasar de 160 caracteres.'
  if (c.sinopsis.length > 4000) return 'La sinopsis no puede pasar de 4.000 caracteres.'
  if (c.duracion_min.trim() && (!entero(c.duracion_min) || +c.duracion_min < 1 || +c.duracion_min > 1440)) {
    return 'La duración va en minutos (por ejemplo, 90).'
  }
  if (c.edad_minima.trim() && (!entero(c.edad_minima) || +c.edad_minima > 21)) {
    return 'La edad mínima va en años, de 0 a 21.'
  }
  return null
}

export function aFilaEspectaculo(c: CamposEspectaculo) {
  const nulo = (v: string) => (v.trim() === '' ? null : v.trim())
  return {
    titulo: c.titulo.trim(),
    compania_nombre: c.compania_nombre.trim(),
    genero_id: c.genero_id,
    sinopsis: nulo(c.sinopsis),
    duracion_min: c.duracion_min.trim() ? Number(c.duracion_min) : null,
    edad_minima: c.edad_minima.trim() ? Number(c.edad_minima) : null,
    idioma: c.idioma,
  }
}

export function camposDesdeFila(f: {
  titulo: string; compania_nombre: string; genero_id: string; sinopsis: string | null
  duracion_min: number | null; edad_minima: number | null; idioma: string
}): CamposEspectaculo {
  return {
    titulo: f.titulo,
    compania_nombre: f.compania_nombre,
    genero_id: f.genero_id,
    sinopsis: f.sinopsis ?? '',
    duracion_min: f.duracion_min == null ? '' : String(f.duracion_min),
    edad_minima: f.edad_minima == null ? '' : String(f.edad_minima),
    idioma: f.idioma,
  }
}

// ── Persona de la ficha artística ─────────────────────────────────────────

/** «Ana López, Luis Pérez; Marta Gil» → tres nombres (se pueden añadir varios de una vez). */
export function separarNombres(texto: string): string[] {
  return texto.split(/[,;\n]+/).map(n => n.replace(/\s+/g, ' ').trim()).filter(Boolean)
}

export function validarPersona(c: { nombre: string; rol: string; personaje: string }): string | null {
  const nombres = separarNombres(c.nombre)
  if (nombres.length === 0) return 'Escribe al menos un nombre.'
  if (nombres.length > 30) return 'Como máximo 30 nombres de una vez.'
  if (nombres.some(n => n.length < 2 || n.length > 120)) return 'Cada nombre debe tener de 2 a 120 caracteres.'
  if (!ROLES.some(r => r.value === c.rol)) return 'Elige el papel en el equipo.'
  if (c.personaje.trim().length > 120) return 'El personaje no puede pasar de 120 caracteres.'
  return null
}

// ── Funciones y fechas ────────────────────────────────────────────────────

/** Diferencia (ms) entre la hora local de `zona` y UTC en el instante dado. */
function desfase(zona: string, instante: number): number {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: zona, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(new Date(instante))
  const v = (t: string) => Number(partes.find(p => p.type === t)?.value)
  return Date.UTC(v('year'), v('month') - 1, v('day'), v('hour'), v('minute'), v('second')) - instante
}

/**
 * «2026-10-20T20:00» en la zona de la sala → instante ISO en UTC.
 * Devuelve null si el texto no es una fecha y hora válidas.
 */
export function localAUtc(local: string, zona: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local.trim())
  if (!m) return null
  const [a, mes, d, h, min] = m.slice(1).map(Number)
  const comoUtc = Date.UTC(a, mes - 1, d, h, min)
  if (Number.isNaN(comoUtc) || new Date(comoUtc).getUTCDate() !== d) return null
  let t = comoUtc - desfase(zona, comoUtc)
  t = comoUtc - desfase(zona, t) // segunda pasada: cambios de hora
  return new Date(t).toISOString()
}

/** Instante → «2026-10-20T20:00» en la zona dada (para rellenar el campo al editar). */
export function utcALocal(iso: string, zona: string): string {
  const t = new Date(iso).getTime()
  return new Date(t + desfase(zona, t)).toISOString().slice(0, 16)
}

/** «mar 20 oct 2026 · 20:00 h» en la zona de la función. */
export function fechaFuncion(iso: string, zona: string): string {
  const d = new Date(iso)
  const dia = new Intl.DateTimeFormat('es-ES', { timeZone: zona, weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).format(d)
  const hora = new Intl.DateTimeFormat('es-ES', { timeZone: zona, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(d)
  return `${dia.replace(/,/g, '')} · ${hora} h`
}

export const MAX_FUNCIONES_DE_UNA_VEZ = 60

/**
 * Fechas de una tanda de funciones: `n` funciones desde `fecha`, cada `cadaDias`
 * días (1 = diaria, 7 = semanal). Fechas «AAAA-MM-DD»; [] si algo no es válido.
 */
export function fechasRepetidas(fecha: string, n: number, cadaDias: number): string[] {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha)
  if (!m || !Number.isInteger(n) || n < 1 || n > MAX_FUNCIONES_DE_UNA_VEZ || ![1, 7].includes(cadaDias)) return []
  const base = Date.UTC(+m[1], +m[2] - 1, +m[3])
  if (new Date(base).getUTCDate() !== +m[3]) return []
  return Array.from({ length: n }, (_, i) => new Date(base + i * cadaDias * 86400_000).toISOString().slice(0, 10))
}

/** Cartel: tamaño mínimo y formato vertical. */
export const CARTEL_MIN_ANCHO = 600
export const CARTEL_MIN_ALTO = 900

export function problemaTamanoCartel(ancho: number, alto: number): string | null {
  if (ancho < CARTEL_MIN_ANCHO || alto < CARTEL_MIN_ALTO) {
    return `El cartel es demasiado pequeño (${ancho} × ${alto} px). Mínimo ${CARTEL_MIN_ANCHO} × ${CARTEL_MIN_ALTO} px.`
  }
  if (alto <= ancho) return `El cartel tiene que ser vertical (más alto que ancho). Este mide ${ancho} × ${alto} px.`
  return null
}

export type CamposFuncion = {
  inicio: string
  zona_horaria: string
  espacio_id: string | null
  lugar_nombre: string
  ciudad: string
  pais_code: string
  nota: string
}

export function validarFuncion(c: CamposFuncion, ahora: number = Date.now()): string | null {
  const iso = localAUtc(c.inicio, c.zona_horaria)
  if (!iso) return 'Indica el día y la hora de la función.'
  if (new Date(iso).getTime() < ahora - 6 * 3600_000) return 'Esa fecha ya ha pasado.'
  if (new Date(iso).getTime() > ahora + 2 * 365 * 86400_000) return 'Solo se pueden programar funciones de los próximos dos años.'
  if (!c.espacio_id) {
    if (c.lugar_nombre.trim().length < 2) return 'Elige una sala o escribe el nombre del lugar.'
    if (!c.ciudad.trim()) return 'Escribe la ciudad.'
    if (!c.pais_code) return 'Elige el país.'
  }
  if (c.nota.trim().length > 200) return 'La nota no puede pasar de 200 caracteres.'
  return null
}

// ── Opciones de compra ────────────────────────────────────────────────────

/** Proveedor a partir del dominio del enlace (para estadísticas y afiliación). */
const DOMINIOS: [RegExp, string][] = [
  [/(^|\.)ticketmaster\./, 'ticketmaster'],
  [/(^|\.)entradas\.com$/, 'entradas_com'],
  [/(^|\.)feverup\.com$/, 'fever'],
  [/(^|\.)tomaticket\.(es|com)$/, 'tomaticket'],
  [/(^|\.)eventbrite\./, 'eventbrite'],
  [/(^|\.)giglon\.com$/, 'giglon'],
  [/(^|\.)taquilla\.com$/, 'taquilla_com'],
  [/(^|\.)ataquilla\.com$/, 'ataquilla'],
  [/(^|\.)atrapalo\.com$/, 'atrapalo'],
  [/(^|\.)elcorteingles\.es$/, 'el_corte_ingles'],
  [/(^|\.)entradium\.com$/, 'entradium'],
  [/(^|\.)ticketek\.com\.ar$/, 'ticketek'],
  [/(^|\.)plateanet\.com$/, 'plateanet'],
  [/(^|\.)alternativateatral\.com$/, 'alternativa_teatral'],
  [/(^|\.)passline\.com$/, 'passline'],
  [/(^|\.)puntoticket\.com$/, 'puntoticket'],
  [/(^|\.)tuboleta\.com$/, 'tuboleta'],
  [/(^|\.)joinnus\.com$/, 'joinnus'],
  [/(^|\.)teleticket\.com\.pe$/, 'teleticket'],
  [/(^|\.)tickantel\.com\.uy$/, 'tickantel'],
]

export function detectarProveedor(url: string): string {
  try {
    const host = new URL(url.trim()).hostname.toLowerCase()
    return DOMINIOS.find(([r]) => r.test(host))?.[1] ?? 'externo'
  } catch {
    return 'externo'
  }
}

export type CamposOpcion = {
  tipo: string
  url: string
  precio_desde: string
  moneda: string
  etiqueta: string
  funcion_id: string
}

export function validarOpcion(c: CamposOpcion): string | null {
  const url = c.url.trim()
  const online = c.tipo === 'venta' || c.tipo === 'reserva'
  if (online && !url) return 'Pega el enlace donde se compran o reservan las entradas.'
  if (url && (!/^https?:\/\/[^\s/?#]+\.[^\s/?#]+[^\s]*$/i.test(url) || url.length > 800)) return 'El enlace no es válido (tiene que empezar por https://).'
  const p = c.precio_desde.trim().replace(',', '.')
  if (p) {
    if (c.tipo === 'gratis') return 'Una entrada gratuita no lleva precio.'
    if (!/^\d{1,7}(\.\d{1,2})?$/.test(p)) return 'El precio va en números (por ejemplo, 15 o 12,50).'
  }
  if (c.etiqueta.trim().length > 80) return 'El texto del botón no puede pasar de 80 caracteres.'
  return null
}

export function aFilaOpcion(c: CamposOpcion) {
  const url = c.url.trim()
  const p = c.precio_desde.trim().replace(',', '.')
  return {
    tipo: c.tipo,
    url: url || null,
    proveedor: url ? detectarProveedor(url) : 'externo',
    precio_desde: p && c.tipo !== 'gratis' ? Number(p) : null,
    moneda: p && c.tipo !== 'gratis' ? c.moneda : null,
    etiqueta: c.etiqueta.trim() || null,
    funcion_id: c.funcion_id || null,
  }
}

/** «Desde 15 €», «Desde 3.500 ARS», «Gratis». */
export function precioTexto(precio: number | null, moneda: string | null, tipo?: string): string | null {
  if (tipo === 'gratis') return 'Gratis'
  if (precio == null || !moneda) return null
  const n = new Intl.NumberFormat('es-ES', { maximumFractionDigits: precio % 1 ? 2 : 0 }).format(precio)
  return `Desde ${n} ${moneda === 'EUR' ? '€' : moneda}`
}

// ── Cartel ────────────────────────────────────────────────────────────────

/** Ruta nueva y no adivinable en la carpeta del usuario. */
export function rutaCartel(userId: string, ext: string, aleatorio: string = crypto.randomUUID()): string {
  return `${userId}/${aleatorio}.${ext}`
}

/**
 * Cartel que se puede enseñar: solo una URL pública del bucket «carteles» y
 * de la carpeta de quien publica (cartel_url la escribe el usuario).
 */
export function cartelValido(url: string | null, supabaseUrl: string, userId: string): string | null {
  if (!url) return null
  const prefijo = `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/${BUCKET_CARTELES}/${userId}/`
  return url.startsWith(prefijo) && !/[\s"'<>]/.test(url) ? url : null
}

// ── Errores de la base ────────────────────────────────────────────────────

export function mensajeErrorCartelera(m?: string): string {
  if (!m) return 'No se pudo guardar. Inténtalo de nuevo.'
  if (m.includes('Tu plan permite') || m.includes('retirado el equipo') || m.includes('no existe o no está publicada')
    || m.includes('no es de este espectáculo')) return m
  if (m.includes('row-level security')) return 'No tienes permiso para cambiar este espectáculo.'
  if (m.includes('funciones_lugar')) return 'Elige una sala o escribe lugar, ciudad y país.'
  if (m.includes('opciones_compra_url')) return 'El enlace de entradas no es válido.'
  if (m.includes('espectaculos_cartel_formato')) return 'El cartel no es válido. Súbelo de nuevo.'
  if (m.includes('Payload too large') || m.includes('exceeded the maximum')) return 'La imagen no puede pasar de 5 MB.'
  return `No se pudo guardar: ${m}`
}
