import { normalizarDominio, PAISES_NOTICIAS } from '@/lib/noticias/importacion'

/**
 * Validación del lote que Make envía a POST /api/convocatorias/import.
 *
 * Mismo planteamiento que lib/noticias/importacion.ts: validación manual (sin
 * zod), solo de la FORMA de los datos. Lo que depende de la base (duplicados
 * por URL de bases, perfil de la Redacción) lo resuelve la ruta, y las reglas
 * de estado y de datos obligatorios las vuelve a imponer el trigger
 * calls_sync_estado(), que es quien manda.
 */

export const MAX_CONVOCATORIAS_POR_LOTE = 10
export const MAX_BYTES_CUERPO = 64 * 1024
export const MAX_TITULO = 200
export const MAX_RESUMEN = 600
export const MAX_ENTIDAD = 200
export const MAX_CIUDAD = 100
export const MAX_DOTACION = 200
export const MAX_LOTE = 100
export const MAX_URL = 2000

/** Las cinco categorías de calls_category_check. */
export const CATEGORIAS_IMPORTABLES: ReadonlySet<string> = new Set(['festival', 'premio', 'residencia', 'beca', 'ayuda'])

export const ZONA_HORARIA = 'Europe/Madrid'

export type ConvocatoriaEntrante = {
  titulo: string
  resumen: string
  categoria: string
  pais_code: string
  ciudad: string | null
  entidad_convocante: string
  fecha_limite: string
  dotacion: string | null
  url_bases: string
  fuente_dominio: string
}

export type SobreValidado =
  | { ok: true; lote: string; convocatorias: unknown[] }
  | { ok: false; error: string }

export type ConvocatoriaValidada =
  | { ok: true; convocatoria: ConvocatoriaEntrante }
  | { ok: false; motivo: string }

const esObjeto = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

/** El sobre: { lote, convocatorias: [1..10] }. Si falla, el lote entero es un 400. */
export function validarSobre(cuerpo: unknown): SobreValidado {
  if (!esObjeto(cuerpo)) {
    return { ok: false, error: 'El cuerpo debe ser un objeto JSON con «lote» y «convocatorias».' }
  }

  const { lote, convocatorias } = cuerpo
  if (typeof lote !== 'string' || lote.trim() === '' || lote.trim().length > MAX_LOTE) {
    return { ok: false, error: `«lote» debe ser un texto de 1 a ${MAX_LOTE} caracteres.` }
  }
  if (!Array.isArray(convocatorias) || convocatorias.length === 0) {
    return { ok: false, error: '«convocatorias» debe ser una lista con al menos una convocatoria.' }
  }
  if (convocatorias.length > MAX_CONVOCATORIAS_POR_LOTE) {
    return { ok: false, error: `Como máximo ${MAX_CONVOCATORIAS_POR_LOTE} convocatorias por petición.` }
  }

  return { ok: true, lote: lote.trim(), convocatorias }
}

function textoAcotado(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim()
  return t.length >= 1 && t.length <= max ? t : null
}

function opcional(v: unknown, max: number): { ok: true; valor: string | null } | { ok: false } {
  if (v === undefined || v === null || (typeof v === 'string' && v.trim() === '')) return { ok: true, valor: null }
  const t = textoAcotado(v, max)
  return t === null ? { ok: false } : { ok: true, valor: t }
}

/** Solo https, sin espacios y con host: es lo que admite calls_url_bases_https. */
export function esUrlHttps(v: string): boolean {
  if (v.length > MAX_URL || /\s/.test(v)) return false
  try {
    const u = new URL(v)
    return u.protocol === 'https:' && u.hostname !== ''
  } catch {
    return false
  }
}

/** YYYY-MM-DD que además existe en el calendario (nada de 2026-02-30). */
export function esFechaValida(v: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false
  const [a, m, d] = v.split('-').map(Number)
  const f = new Date(Date.UTC(a, m - 1, d))
  return f.getUTCFullYear() === a && f.getUTCMonth() === m - 1 && f.getUTCDate() === d
}

/** Una convocatoria del lote. Si falla, solo esa se marca como inválida. */
export function validarConvocatoria(item: unknown): ConvocatoriaValidada {
  if (!esObjeto(item)) return { ok: false, motivo: 'La convocatoria no es un objeto.' }

  const titulo = textoAcotado(item.titulo, MAX_TITULO)
  if (!titulo) return { ok: false, motivo: `titulo: obligatorio, de 1 a ${MAX_TITULO} caracteres.` }

  const resumen = textoAcotado(item.resumen, MAX_RESUMEN)
  if (!resumen) return { ok: false, motivo: `resumen: obligatorio, de 1 a ${MAX_RESUMEN} caracteres.` }

  const categoria = typeof item.categoria === 'string' ? item.categoria.trim().toLowerCase() : ''
  if (!CATEGORIAS_IMPORTABLES.has(categoria)) {
    return { ok: false, motivo: 'categoria: debe ser festival, premio, residencia, beca o ayuda.' }
  }

  const pais = typeof item.pais_code === 'string' ? item.pais_code.trim().toUpperCase() : ''
  if (!PAISES_NOTICIAS.has(pais)) return { ok: false, motivo: 'pais_code: no es uno de los 20 países del ámbito.' }

  const ciudad = opcional(item.ciudad, MAX_CIUDAD)
  if (!ciudad.ok) return { ok: false, motivo: `ciudad: si se envía, de 1 a ${MAX_CIUDAD} caracteres.` }

  const entidad = textoAcotado(item.entidad_convocante, MAX_ENTIDAD)
  if (!entidad) return { ok: false, motivo: `entidad_convocante: obligatoria, de 1 a ${MAX_ENTIDAD} caracteres.` }

  const fecha = typeof item.fecha_limite === 'string' ? item.fecha_limite.trim() : ''
  if (!esFechaValida(fecha)) return { ok: false, motivo: 'fecha_limite: obligatoria, con formato YYYY-MM-DD.' }

  const dotacion = opcional(item.dotacion, MAX_DOTACION)
  if (!dotacion.ok) return { ok: false, motivo: `dotacion: si se envía, de 1 a ${MAX_DOTACION} caracteres.` }

  const url = typeof item.url_bases === 'string' ? item.url_bases.trim() : ''
  if (url === '') return { ok: false, motivo: 'url_bases: obligatoria (las bases oficiales).' }
  if (!esUrlHttps(url)) return { ok: false, motivo: 'url_bases: debe ser una URL https válida.' }

  const dominio = typeof item.fuente_dominio === 'string' ? normalizarDominio(item.fuente_dominio) : ''
  if (dominio === '') return { ok: false, motivo: 'fuente_dominio: obligatorio.' }

  return {
    ok: true,
    convocatoria: {
      titulo,
      resumen,
      categoria,
      pais_code: pais,
      ciudad: ciudad.valor,
      entidad_convocante: entidad,
      fecha_limite: fecha,
      dotacion: dotacion.valor,
      url_bases: url,
      fuente_dominio: dominio,
    },
  }
}

/** Fecha de hoy en Madrid, como YYYY-MM-DD. */
export function hoyEnMadrid(ahora: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: ZONA_HORARIA, year: 'numeric', month: '2-digit', day: '2-digit' }).format(ahora)
}

/** Vencida = la fecha límite es hoy o anterior, en hora de Madrid. */
export function estaVencida(fechaLimite: string, ahora: Date = new Date()): boolean {
  return fechaLimite <= hoyEnMadrid(ahora)
}

/**
 * La fecha límite se guarda como el último segundo de ese día en Madrid
 * (deadline es timestamptz). El desfase se calcula para esa fecha concreta,
 * así que respeta el horario de verano.
 */
export function finDelDiaEnMadrid(fechaLimite: string): string {
  const mediodia = new Date(`${fechaLimite}T12:00:00Z`)
  const zona = new Intl.DateTimeFormat('en-US', { timeZone: ZONA_HORARIA, timeZoneName: 'longOffset' })
    .formatToParts(mediodia)
    .find(p => p.type === 'timeZoneName')?.value ?? 'GMT+00:00'
  const desfase = zona === 'GMT' ? '+00:00' : zona.replace('GMT', '')
  return `${fechaLimite}T23:59:59${desfase}`
}

/** Dato de una convocatoria cualquiera, solo para la respuesta. */
export function urlDeEntrada(item: unknown): string | null {
  if (!esObjeto(item) || typeof item.url_bases !== 'string') return null
  return item.url_bases.trim().slice(0, MAX_URL)
}

/** Misma clave que url_bases_normalizada a partir de la forma que da noticias_normalizar_url. */
export function claveDeUrl(normalizada: string): string {
  return normalizada.replace(/^https?:\/\/(www\.)?/i, '')
}
