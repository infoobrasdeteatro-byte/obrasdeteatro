/**
 * Elenco Fundador: textos, enlaces y reglas que se enseñan en la web.
 * Las reglas que deciden (puntos, escalones, plazos) viven en la base
 * (migración 20261031120000_elenco_fundador); aquí solo se describen.
 * En ningún mensaje se menciona el número de plazas ni a otros invitados.
 */
import { SITIO } from '@/lib/embajadores/textos'

export { SITIO }

/** Plazas del Elenco Fundador (números 001–100). */
export const PLAZAS_ELENCO = 100

export type TipoFundador = 'persona' | 'organizacion'

export const OFICIOS_PERSONA = [
  'Interpretación', 'Dirección', 'Dramaturgia', 'Producción', 'Escenografía', 'Iluminación', 'Sonido',
  'Vestuario', 'Caracterización', 'Música', 'Danza', 'Técnica', 'Gestión cultural', 'Docencia', 'Otro oficio',
] as const

export const TIPOS_ORGANIZACION_ELENCO = ['Compañía', 'Sala', 'Escuela', 'Productora', 'Festival', 'Otra organización'] as const

export function esTipoFundador(v: unknown): v is TipoFundador {
  return v === 'persona' || v === 'organizacion'
}

/** 7 → «007». */
export function numeroFundador(n: number): string {
  return String(n).padStart(3, '0')
}

/** «007», «7» o «07» → 7, si está entre 1 y 100; si no, null. */
export function leerNumero(v: string | null | undefined): number | null {
  if (!v || !/^\d{1,3}$/.test(v)) return null
  const n = Number(v)
  return n >= 1 && n <= 100 ? n : null
}

/**
 * Número escrito a mano en el registro («007», «7», «nº 7», «#007») → 7, o
 * null si no es un número de fundador posible.
 */
export function normalizarNumeroElenco(v: unknown): number | null {
  if (typeof v !== 'string') return null
  return leerNumero(v.trim().replace(/^(n\.?\s*[º°o]?\.?|#)\s*/i, ''))
}

export function distintivo(n: number): string {
  return `Elenco Fundador nº ${numeroFundador(n)}`
}

export function enlaceInvitacionElenco(token: string): string {
  return `${SITIO}/elenco/invitacion/${token}`
}

export function enlaceElenco(n: number): string {
  return `${SITIO}/elenco/${numeroFundador(n)}`
}

/** Token de una ruta /elenco/invitacion/<token> (32 hex), o null. */
export function tokenDeInvitacionElenco(ruta: string | null | undefined): string | null {
  const m = /^\/elenco\/invitacion\/([0-9a-f]{32})$/.exec(ruta ?? '')
  return m ? m[1] : null
}

/** Cookie del enlace /elenco/<nº> entre la visita y el registro (30 días). */
export const COOKIE_ELENCO = 'odt_elenco'
export const ELENCO_MAX_AGE_S = 60 * 60 * 24 * 30

export const PROPOSITO = 'Estamos construyendo entre todos la casa del teatro en español.'

const primerNombre = (nombre: string) => nombre.trim().split(/\s+/)[0] || nombre.trim()

/** Punto 13: invitación de Renee a una persona. */
export function mensajeInvitacionPersona(nombre: string, enlace: string): string {
  return `Hola ${primerNombre(nombre)}, soy Renee Bausson, de ObrasDeTeatro®, la plataforma profesional del teatro en español. `
    + 'Quiero invitarte personalmente a formar parte del Elenco Fundador, los primeros profesionales que construyen con nosotros esta casa del teatro. '
    + 'Tu perfil aparecerá en el directorio que consultan productores, directores y compañías de 20 países, con tu número de fundador, '
    + 'y tendrás tres meses de Premium para activar cuando quieras durante el primer año. '
    + `Es gratuito, para siempre y sin compromiso. Tu invitación: ${enlace}`
}

/** Punto 14: invitación de Renee a una organización (mismo tono, en «ustedes»: vale en los 20 países). */
export function mensajeInvitacionOrganizacion(nombre: string, enlace: string): string {
  return `Hola ${nombre.trim()}, soy Renee Bausson, de ObrasDeTeatro®, la plataforma profesional del teatro en español. `
    + 'Quiero invitarles personalmente a formar parte del Elenco Fundador, los primeros que construyen con nosotros esta casa del teatro. '
    + 'Su compañía, sala o escuela tendrá visibilidad en el directorio que consultan profesionales, programadores y público de 20 países, con su número de fundador; '
    + 'podrán publicar su cartelera y sus castings, y tendrán tres meses del plan Empresas para activar cuando quieran durante el primer año. '
    + `Es gratuito, para siempre y sin compromiso. Su invitación: ${enlace}`
}

export function mensajeInvitacion(tipo: TipoFundador, nombre: string, token: string): string {
  const enlace = enlaceInvitacionElenco(token)
  return tipo === 'organizacion' ? mensajeInvitacionOrganizacion(nombre, enlace) : mensajeInvitacionPersona(nombre, enlace)
}

/** Punto 15: mensaje del fundador a sus colegas. */
export function mensajeColegasElenco(nombre: string, numero: number): string {
  return `Hola, soy ${nombre.trim()} y formo parte del Elenco Fundador de ObrasDeTeatro®, la plataforma profesional del teatro en español. `
    + 'Estamos construyendo entre todos la casa del oficio: directorio de profesionales, castings, convocatorias, salas de 20 países y una biblioteca de miles de obras. '
    + `Cuantos más estemos, más oportunidades habrá para todos. Unirte es gratis: ${enlaceElenco(numero)}`
}

/** Escalera de recompensas, tal como se aplica en elenco_revisar(). */
export const ESCALONES = [5, 10, 25, 50] as const

export function recompensaEscalon(escalon: number, tipo: TipoFundador): string {
  const base = tipo === 'organizacion' ? 'Empresas' : 'Premium'
  switch (escalon) {
    case 5: return `3 meses más de ${base}`
    case 10: return `Un año de ${base} y ${tipo === 'organizacion' ? 'su' : 'tu'} nombre en la página del Elenco Fundador`
    case 25: return tipo === 'organizacion'
      ? 'Un año de Empresas, 4 semanas de destacado en Cartelera y presentación destacada en redes y en la página del Elenco'
      : 'Un año de Destacado y presentación destacada en redes y en la página del Elenco'
    case 50: return `Miembro de Honor: ${base} para siempre`
    default: return ''
  }
}

/** Siguiente escalón y progreso (0–1) hacia él. null si ya alcanzó el último. */
export function progresoEscalera(puntos: number): { siguiente: number; anterior: number; progreso: number } | null {
  const siguiente = ESCALONES.find(e => puntos < e)
  if (siguiente === undefined) return null
  const anterior = [...ESCALONES].reverse().find(e => e <= puntos) ?? 0
  return { siguiente, anterior, progreso: Math.min(1, Math.max(0, (puntos - anterior) / (siguiente - anterior))) }
}

/** Puntos que vale cada colega activo según su tipo de perfil (público general: ninguno). */
export function puntosColega(tipoPerfil: string): number {
  if (tipoPerfil === 'publico') return 0
  return ['compania', 'productora', 'teatro', 'festival', 'escuela', 'institucion'].includes(tipoPerfil) ? 3 : 1
}

export const ESTADO_BONO: Record<string, string> = {
  disponible: 'Disponible',
  activo: 'Activo',
  usado: 'Disfrutado',
  caducado: 'Caducado',
  pendiente: '—',
}
