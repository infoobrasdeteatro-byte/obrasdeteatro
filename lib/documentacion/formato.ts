/**
 * Bloque 8 «Documentación»: utilidades puras para el CV y el dossier en PDF
 * (sin servidor ni red; las prueba lib/documentacion/__tests__).
 */

export const TIPO_PERFIL_LABEL: Record<string, string> = {
  actor: 'Actor / Actriz',
  director: 'Director/a',
  dramaturgo: 'Dramaturgo/a',
  compania: 'Compañía de teatro',
  productora: 'Productora',
  teatro: 'Teatro / Sala',
  festival: 'Festival',
  escuela: 'Escuela de artes escénicas',
  institucion: 'Institución pública',
  profesional: 'Profesional escénico',
  publico: 'Público general',
}

export const TIPO_EXPERIENCIA_LABEL: Record<string, string> = {
  actuacion: 'Actuación',
  direccion: 'Dirección escénica',
  dramaturgia: 'Dramaturgia',
  produccion: 'Producción',
  tecnico: 'Técnico escénico',
  gestion: 'Gestión cultural',
  docencia: 'Docencia',
  otro: 'Otro',
}

export const DISPONIBILIDAD_LABEL: Record<string, string> = {
  disponible: 'Disponible para nuevos proyectos',
  parcialmente_disponible: 'Disponible de forma puntual',
  no_disponible: 'Actualmente en producción',
  buscando_trabajo: 'Buscando proyectos activamente',
  abierto_a_propuestas: 'Abierto/a a propuestas',
}

export const ALCANCE_LABEL: Record<string, string> = {
  local: 'Ámbito local',
  nacional: 'Ámbito nacional',
  internacional: 'Ámbito internacional',
  remoto: 'Remoto / online',
  nacional_internacional: 'Ámbito nacional e internacional',
}

export const REDES_LABEL: Record<string, string> = {
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  twitter: 'X',
  youtube: 'YouTube',
  tiktok: 'TikTok',
  facebook: 'Facebook',
}
export const REDES_ORDEN = ['instagram', 'linkedin', 'twitter', 'youtube', 'tiktok', 'facebook'] as const

/** Letras que no se descomponen en letra + tilde. */
const SIN_DESCOMPOSICION: Record<string, string> = { 'Ł': 'L', 'ł': 'l', 'Đ': 'D', 'đ': 'd', 'Ħ': 'H', 'ħ': 'h', 'ı': 'i' }

/** Caracteres de Windows-1252 por encima de 0x7F que no son Latin-1 (las fuentes estándar del PDF los tienen). */
const EXTRA_CP1252 = new Set('€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ')

/**
 * Deja el texto en lo que pueden pintar las fuentes estándar del PDF
 * (Windows-1252): español, portugués, francés, catalán… sin problema. Lo que
 * no cabe se intenta sin tilde (ł → l no, pero ő → o sí) y, si no, se quita
 * (emojis, flechas, otros alfabetos).
 */
export function textoPdf(v: string | null | undefined): string {
  if (!v) return ''
  let out = ''
  for (const ch of v.normalize('NFC')) {
    const c = ch.codePointAt(0)!
    if (ch === '\n' || ch === '\t' || (c >= 0x20 && c < 0x7f) || (c >= 0xa0 && c <= 0xff) || EXTRA_CP1252.has(ch)) {
      out += ch
      continue
    }
    const base = SIN_DESCOMPOSICION[ch] ?? ch.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    if (base.length === 1 && base.codePointAt(0)! < 0x7f) out += base
  }
  return out.replace(/[ \t]{2,}/g, ' ').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
}

const anio = (fecha: string | null | undefined) => (fecha && /^\d{4}/.test(fecha) ? fecha.slice(0, 4) : null)

/** «2019 – 2022», «2021 – actualidad», «2020», o vacío si no hay fechas. */
export function periodo(inicio: string | null | undefined, fin: string | null | undefined, enCurso: boolean): string {
  const a = anio(inicio)
  const b = enCurso ? 'actualidad' : anio(fin)
  if (a && b && a !== b) return `${a} – ${b}`
  return a ?? b ?? ''
}

/** Nombre del archivo: «CV-Nombre-Apellidos.pdf», sin tildes ni símbolos. */
export function nombreArchivo(tipo: 'cv' | 'dossier', nombre: string): string {
  const limpio = nombre.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)
  return `${tipo === 'cv' ? 'CV' : 'Dossier'}-${limpio || 'perfil'}.pdf`
}

/** Solo http(s); el resto (javascript:, datos raros) no va al PDF. */
export function enlaceSeguro(url: string | null | undefined): string | null {
  if (!url) return null
  const u = url.trim()
  return /^https?:\/\/[^\s]+$/i.test(u) ? u : null
}

/** «instagram.com/usuario» sin el https:// ni la barra final, para que se lea bien impreso. */
export function enlaceLegible(url: string): string {
  return url.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '')
}

/** Redes del perfil en orden, solo las que tienen un enlace válido. */
export function redesDe(social: unknown): { red: string; url: string }[] {
  if (!social || typeof social !== 'object' || Array.isArray(social)) return []
  const raw = social as Record<string, unknown>
  return REDES_ORDEN.flatMap(k => {
    const url = typeof raw[k] === 'string' ? enlaceSeguro(raw[k] as string) : null
    return url ? [{ red: REDES_LABEL[k], url }] : []
  })
}
