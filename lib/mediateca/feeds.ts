/**
 * Mediateca: lectura de los RSS de YouTube y de podcast.
 *
 * Funciones puras (sin red ni base): reciben el XML y devuelven episodios
 * normalizados. La red y la escritura están en importar.ts.
 */

import { XMLParser } from 'fast-xml-parser'

export type EpisodioFuente = {
  fuente: 'youtube' | 'audio'
  /** Clave para casar el mismo episodio publicado en YouTube y en el podcast. */
  clave: string
  titulo: string
  descripcion: string | null
  fecha_publicacion: string
  duracion_segundos: number | null
  imagen_url: string | null
  youtube_video_id?: string
  audio_guid?: string
  audio_url?: string
  enlace_audio?: string | null
}

export const MAX_EPISODIOS_POR_FEED = 500
const MAX_DESCRIPCION = 5000
const MAX_TITULO = 300

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  processEntities: true,
  htmlEntities: true,
  trimValues: true,
  parseTagValue: false,
  isArray: nombre => nombre === 'entry' || nombre === 'item',
})

const lista = <T>(x: T | T[] | undefined | null): T[] => (x == null ? [] : Array.isArray(x) ? x : [x])

/** Texto de un nodo que puede venir como cadena o como { '#text': … }. */
function texto(x: unknown): string | null {
  if (x == null) return null
  if (typeof x === 'string' || typeof x === 'number') return String(x).trim() || null
  if (typeof x === 'object' && '#text' in (x as Record<string, unknown>)) return texto((x as Record<string, unknown>)['#text'])
  return null
}

const https = (u: string | null | undefined): string | null =>
  u && /^https:\/\/[^\s/?#]+[^\s]*$/i.test(u.trim()) ? u.trim() : null

/** Quita etiquetas HTML y espacios de sobra; las entidades ya llegan decodificadas. */
export function textoPlano(html: string | null): string | null {
  if (!html) return null
  const t = html
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  return t ? t.slice(0, MAX_DESCRIPCION) : null
}

/** «1:02:03», «42:57», «2577» → segundos. */
export function duracionASegundos(v: string | null): number | null {
  if (!v) return null
  const partes = v.trim().split(':').map(Number)
  if (partes.some(n => !Number.isFinite(n) || n < 0)) return null
  const s = partes.reduce((acc, n) => acc * 60 + n, 0)
  return s >= 1 && s <= 86400 ? Math.round(s) : null
}

/**
 * Clave de emparejamiento. Si el título trae «Episodio N» (o «Ep. N»), la
 * clave es el número: así «Jorge Dubatti - Cartografías teatrales. Episodio 1»
 * (YouTube) y «Cartografías Teatrales. Episodio 1: Jorge Dubatti» (iVoox)
 * son el mismo episodio. Si no, el título normalizado.
 */
export function claveEpisodio(titulo: string): string {
  const plano = titulo.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  const m = plano.match(/\b(?:episodio|ep\.?|capitulo|cap\.?)\s*(?:n[ºo°.]?\s*)?(\d{1,4})\b/)
  if (m) return `ep:${Number(m[1])}`
  return `t:${plano.replace(/[^a-z0-9]+/g, ' ').trim()}`
}

function fechaIso(v: string | null): string | null {
  if (!v) return null
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

/** RSS (Atom) de un canal de YouTube: https://www.youtube.com/feeds/videos.xml?channel_id=… */
export function leerFeedYoutube(xml: string): EpisodioFuente[] {
  const doc = parser.parse(xml) as { feed?: { entry?: unknown } }
  const salida: EpisodioFuente[] = []
  for (const e of lista(doc.feed?.entry as Record<string, unknown>[] | undefined)) {
    const id = texto(e['yt:videoId'])
    const titulo = texto(e.title)
    const fecha = fechaIso(texto(e.published))
    if (!id || !/^[A-Za-z0-9_-]{11}$/.test(id) || !titulo || !fecha) continue
    const grupo = (e['media:group'] ?? {}) as Record<string, unknown>
    salida.push({
      fuente: 'youtube',
      clave: claveEpisodio(titulo),
      titulo: titulo.slice(0, MAX_TITULO),
      descripcion: textoPlano(texto(grupo['media:description'])),
      fecha_publicacion: fecha,
      duracion_segundos: null,
      imagen_url: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      youtube_video_id: id,
    })
  }
  return salida.slice(0, MAX_EPISODIOS_POR_FEED)
}

/** RSS de podcast (iVoox, Spotify for Creators, Anchor, Podbean…). */
export function leerFeedPodcast(xml: string): EpisodioFuente[] {
  const doc = parser.parse(xml) as { rss?: { channel?: Record<string, unknown> } }
  const canal = doc.rss?.channel
  const imagenCanal = https((canal?.['itunes:image'] as Record<string, string> | undefined)?.['@_href'])
  const salida: EpisodioFuente[] = []
  for (const it of lista(canal?.item as Record<string, unknown>[] | undefined)) {
    const titulo = texto(it.title)
    const fecha = fechaIso(texto(it.pubDate))
    const enclosure = (lista(it.enclosure as Record<string, string>[] | undefined)
      .find(x => (x['@_type'] ?? '').startsWith('audio') || /\.(mp3|m4a|aac|ogg)(\?|$)/i.test(x['@_url'] ?? '')))
    const audio = https(enclosure?.['@_url'])
    if (!titulo || !fecha || !audio) continue
    const guid = (texto(it.guid) ?? audio).slice(0, 500)
    salida.push({
      fuente: 'audio',
      clave: claveEpisodio(titulo),
      titulo: titulo.slice(0, MAX_TITULO),
      descripcion: textoPlano(texto(it['content:encoded']) ?? texto(it.description) ?? texto(it['itunes:summary'])),
      fecha_publicacion: fecha,
      duracion_segundos: duracionASegundos(texto(it['itunes:duration'])),
      imagen_url: https((it['itunes:image'] as Record<string, string> | undefined)?.['@_href']) ?? imagenCanal,
      audio_guid: guid,
      audio_url: audio,
      enlace_audio: https(texto(it.link)),
    })
  }
  return salida.slice(0, MAX_EPISODIOS_POR_FEED)
}

/** Portada del programa en su RSS de podcast (itunes:image o image/url). */
export function imagenCanalPodcast(xml: string): string | null {
  const canal = (parser.parse(xml) as { rss?: { channel?: Record<string, unknown> } }).rss?.channel
  if (!canal) return null
  return https((canal['itunes:image'] as Record<string, string> | undefined)?.['@_href'])
    ?? https(texto((canal.image as Record<string, unknown> | undefined)?.url))
}

export const urlFeedYoutube = (channelId: string) =>
  `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`
