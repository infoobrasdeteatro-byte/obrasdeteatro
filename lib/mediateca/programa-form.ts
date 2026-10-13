/** Formulario de programa de la Mediateca (/admin/mediateca). */

import { COUNTRIES } from '@/lib/geo/countries'

export type CamposPrograma = {
  nombre: string
  descripcion: string
  pais_code: string
  url_web: string
  imagen_url: string
  colaborador_id: string
  youtube: string
  rss_url: string
  spotify_url: string
}

export const PROGRAMA_VACIO: CamposPrograma = {
  nombre: '', descripcion: '', pais_code: '', url_web: '', imagen_url: '',
  colaborador_id: '', youtube: '', rss_url: '', spotify_url: '',
}

const HTTPS = /^https:\/\/[^\s/?#]+[^\s]*$/i

/** «UC…», «https://www.youtube.com/channel/UC…» → «UC…». Un @usuario no vale: hace falta el ID. */
export function idCanalYoutube(v: string): string | null {
  const t = v.trim()
  const m = t.match(/(?:^|\/channel\/)(UC[A-Za-z0-9_-]{22})(?:[/?#]|$)/)
  return m ? m[1] : null
}

/** Enlace de Spotify del programa, sin parámetros de seguimiento (?si=…). */
export function spotifyLimpio(v: string): string | null {
  const m = v.trim().match(/^https:\/\/open\.spotify\.com\/(?:intl-[a-z-]+\/)?show\/([A-Za-z0-9]+)/)
  return m ? `https://open.spotify.com/show/${m[1]}` : null
}

export function validarPrograma(c: CamposPrograma): string | null {
  const n = c.nombre.trim()
  if (n.length < 1 || n.length > 120) return 'El nombre es obligatorio (máx. 120 caracteres).'
  if (c.descripcion.trim().length > 600) return 'La descripción no puede pasar de 600 caracteres.'
  if (c.pais_code && !COUNTRIES.some(x => x.code === c.pais_code)) return 'País no válido.'
  for (const [campo, etiqueta] of [['url_web', 'La web'], ['imagen_url', 'La imagen'], ['rss_url', 'El RSS del podcast']] as const) {
    const v = c[campo].trim()
    if (v && !HTTPS.test(v)) return `${etiqueta} debe empezar por https://`
  }
  if (c.youtube.trim() && !idCanalYoutube(c.youtube)) {
    return 'Para YouTube pega el ID del canal (empieza por UC, 24 caracteres) o el enlace youtube.com/channel/UC…; un @usuario no sirve.'
  }
  if (c.spotify_url.trim() && !spotifyLimpio(c.spotify_url)) {
    return 'El enlace de Spotify debe ser el del programa: https://open.spotify.com/show/…'
  }
  if (!c.youtube.trim() && !c.rss_url.trim()) return 'Indica al menos el canal de YouTube o el RSS del podcast: de ahí salen los episodios.'
  return null
}

export function filaPrograma(c: CamposPrograma) {
  const v = (s: string) => (s.trim() === '' ? null : s.trim())
  return {
    nombre: c.nombre.trim(),
    descripcion: v(c.descripcion),
    pais_code: v(c.pais_code),
    url_web: v(c.url_web),
    imagen_url: v(c.imagen_url),
    colaborador_id: v(c.colaborador_id),
    youtube_channel_id: c.youtube.trim() ? idCanalYoutube(c.youtube) : null,
    rss_url: v(c.rss_url),
    spotify_url: c.spotify_url.trim() ? spotifyLimpio(c.spotify_url) : null,
  }
}
