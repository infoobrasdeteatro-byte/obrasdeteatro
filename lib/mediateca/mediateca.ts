/**
 * Mediateca: presentación (rutas, duración, reproductores).
 */

import { COUNTRIES } from '@/lib/geo/countries'

export const rutaPrograma = (slug: string) => `/mediateca/${slug}`
export const rutaEpisodio = (programa: string, episodio: string) => `/mediateca/${programa}/${episodio}`

export const nombrePais = (code: string | null) => (code ? COUNTRIES.find(c => c.code === code)?.name ?? code : null)

/** 2577 → «43 min» · 3723 → «1 h 2 min». */
export function duracionLegible(s: number | null): string | null {
  if (!s || s < 1) return null
  const min = Math.round(s / 60)
  if (min < 60) return `${Math.max(1, min)} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h} h ${m} min` : `${h} h`
}

const FECHA = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Madrid' })
export const fechaEpisodio = (iso: string) => FECHA.format(new Date(iso))

/**
 * Reproductor de iVoox para un episodio, si su enlace o su audio son de iVoox
 * (…_rf_102958105_1.html / …_mf_102958105_feed_1.mp3). Así las escuchas
 * cuentan en iVoox para el programa. Si no, null y se usa <audio>.
 */
export function reproductorIvoox(e: { enlace_audio: string | null; audio_url: string | null }): string | null {
  for (const u of [e.enlace_audio, e.audio_url]) {
    if (!u || !/^https:\/\/(www\.)?ivoox\.com\//i.test(u)) continue
    const m = u.match(/_(?:rf|mf)_(\d{4,12})_/)
    if (m) return `https://www.ivoox.com/player_ej_${m[1]}_6_1.html`
  }
  return null
}

/** open.spotify.com/show/ID → reproductor incrustado del programa. */
export function reproductorSpotify(url: string | null): string | null {
  const m = url?.match(/^https:\/\/open\.spotify\.com\/show\/([A-Za-z0-9]+)/)
  return m ? `https://open.spotify.com/embed/show/${m[1]}` : null
}

export const urlYoutubeCanal = (id: string) => `https://www.youtube.com/channel/${id}`
export const urlYoutubeVideo = (id: string) => `https://www.youtube.com/watch?v=${id}`

export const COLUMNAS_EPISODIO =
  'id, slug, titulo, descripcion, fecha_publicacion, duracion_segundos, imagen_url, youtube_video_id, audio_url, enlace_audio, programa_id'
export const COLUMNAS_PROGRAMA =
  'id, slug, nombre, descripcion, pais_code, imagen_url, url_web, colaborador_id, youtube_channel_id, rss_url, spotify_url'
