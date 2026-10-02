import { COUNTRIES } from '@/lib/geo/countries'

/**
 * Validación del lote que Make envía a POST /api/news/import.
 *
 * Validación manual a propósito: el proyecto no usa zod y no se añaden
 * dependencias para una sola ruta. Aquí solo se comprueba la FORMA de los
 * datos; lo que depende de la base (que la categoría exista y esté activa, que
 * el dominio sea una fuente registrada, que la URL no esté ya guardada) lo
 * resuelve la ruta. Las reglas de estado (toda importación entra como
 * candidata) las impone el trigger noticias_guarda(), no este módulo.
 *
 * Los límites repiten los de la tabla noticias (titular ≤ 200, resumen ≤ 400,
 * URL http(s)) para devolver un motivo legible en vez de un error de CHECK.
 */

export const MAX_NOTICIAS_POR_LOTE = 5
export const MAX_BYTES_CUERPO = 64 * 1024
export const MAX_TITULAR = 200
export const MAX_RESUMEN = 400
export const MAX_LOTE = 100
export const MAX_URL = 2000

/** Los 20 países del ámbito: los mismos de lib/geo/countries.ts y de la CHECK de la tabla. */
export const PAISES_NOTICIAS: ReadonlySet<string> = new Set(COUNTRIES.map(c => c.code))

export type NoticiaEntrante = {
  titular: string
  resumen: string
  categoria_id: string
  pais_code: string
  fuente_dominio: string
  url_original: string
  fecha_original: string | null
}

export type SobreValidado =
  | { ok: true; lote: string; noticias: unknown[] }
  | { ok: false; error: string }

export type NoticiaValidada =
  | { ok: true; noticia: NoticiaEntrante }
  | { ok: false; motivo: string }

const esObjeto = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

/** El sobre: { lote, noticias: [1..5] }. Si falla, el lote entero es un 400. */
export function validarSobre(cuerpo: unknown): SobreValidado {
  if (!esObjeto(cuerpo)) {
    return { ok: false, error: 'El cuerpo debe ser un objeto JSON con «lote» y «noticias».' }
  }

  const { lote, noticias } = cuerpo
  if (typeof lote !== 'string' || lote.trim() === '' || lote.trim().length > MAX_LOTE) {
    return { ok: false, error: `«lote» debe ser un texto de 1 a ${MAX_LOTE} caracteres.` }
  }
  if (!Array.isArray(noticias) || noticias.length === 0) {
    return { ok: false, error: '«noticias» debe ser una lista con al menos una noticia.' }
  }
  if (noticias.length > MAX_NOTICIAS_POR_LOTE) {
    return { ok: false, error: `Como máximo ${MAX_NOTICIAS_POR_LOTE} noticias por petición.` }
  }

  return { ok: true, lote: lote.trim(), noticias }
}

function textoAcotado(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim()
  return t.length >= 1 && t.length <= max ? t : null
}

/** Solo http(s), sin espacios y con host. Nada de javascript:, data:, etc. */
export function esUrlHttp(v: string): boolean {
  if (v.length > MAX_URL || /\s/.test(v)) return false
  try {
    const u = new URL(v)
    return (u.protocol === 'http:' || u.protocol === 'https:') && u.hostname !== ''
  } catch {
    return false
  }
}

/** Una noticia del lote. Si falla, solo esa noticia se rechaza. */
export function validarNoticia(item: unknown): NoticiaValidada {
  if (!esObjeto(item)) return { ok: false, motivo: 'La noticia no es un objeto.' }

  const titular = textoAcotado(item.titular, MAX_TITULAR)
  if (!titular) return { ok: false, motivo: `titular: obligatorio, de 1 a ${MAX_TITULAR} caracteres.` }

  const resumen = textoAcotado(item.resumen, MAX_RESUMEN)
  if (!resumen) return { ok: false, motivo: `resumen: obligatorio, de 1 a ${MAX_RESUMEN} caracteres.` }

  const categoria = typeof item.categoria_id === 'string' ? item.categoria_id.trim() : ''
  if (!/^[a-z][a-z0-9_]*$/.test(categoria)) return { ok: false, motivo: 'categoria_id: no válida.' }

  const pais = typeof item.pais_code === 'string' ? item.pais_code.trim().toUpperCase() : ''
  if (!PAISES_NOTICIAS.has(pais)) return { ok: false, motivo: 'pais_code: no es uno de los 20 países del ámbito.' }

  const dominio = typeof item.fuente_dominio === 'string' ? normalizarDominio(item.fuente_dominio) : ''
  if (dominio === '') return { ok: false, motivo: 'fuente_dominio: obligatorio.' }

  const url = typeof item.url_original === 'string' ? item.url_original.trim() : ''
  if (!esUrlHttp(url)) return { ok: false, motivo: 'url_original: debe ser una URL http(s) válida.' }

  let fecha: string | null = null
  if (item.fecha_original !== undefined && item.fecha_original !== null && item.fecha_original !== '') {
    const d = typeof item.fecha_original === 'string' ? new Date(item.fecha_original) : null
    if (!d || Number.isNaN(d.getTime())) return { ok: false, motivo: 'fecha_original: no es una fecha válida.' }
    fecha = d.toISOString()
  }

  return {
    ok: true,
    noticia: {
      titular,
      resumen,
      categoria_id: categoria,
      pais_code: pais,
      fuente_dominio: dominio,
      url_original: url,
      fecha_original: fecha,
    },
  }
}

/**
 * Dominio comparable con noticias_fuentes.dominio: minúsculas, sin esquema,
 * ruta, puerto ni prefijo www. Acepta que Make mande «www.satch.cl» o
 * «https://www.satch.cl/» para la fuente registrada como «satch.cl».
 */
export function normalizarDominio(v: string): string {
  return v
    .trim()
    .toLowerCase()
    .replace(/^[a-z]+:\/\//, '')
    .replace(/[/?#].*$/, '')
    .replace(/:\d+$/, '')
    .replace(/^www\./, '')
}

/** URL de una noticia cualquiera, solo para el registro y la respuesta. */
export function urlDeEntrada(item: unknown): string | null {
  if (!esObjeto(item) || typeof item.url_original !== 'string') return null
  return item.url_original.trim().slice(0, MAX_URL)
}

/**
 * Variantes con las que una URL ya normalizada puede estar guardada. El índice
 * único no distingue http/https ni www; esto reproduce esa equivalencia para
 * encontrar la fila existente cuando el INSERT choca.
 */
export function variantesDeUrl(normalizada: string): string[] {
  const resto = normalizada.replace(/^https?:\/\/(www\.)?/i, '')
  return [
    `https://${resto}`,
    `http://${resto}`,
    `https://www.${resto}`,
    `http://www.${resto}`,
  ]
}
