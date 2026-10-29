/**
 * Correo entrante: textos y enlaces del panel. Funciones puras.
 */

import { GMAIL_PROPIO, type Buzon } from './direcciones'

export type EstadoCorreo = 'nuevo' | 'leido' | 'atendido' | 'archivado'
export const ESTADOS: EstadoCorreo[] = ['nuevo', 'leido', 'atendido', 'archivado']
export const ETIQUETA_ESTADO: Record<EstadoCorreo, string> = { nuevo: 'Nuevo', leido: 'Leído', atendido: 'Atendido', archivado: 'Archivado' }

/** Lo que cuenta como «sin atender» (Master Control). */
export const ESTADOS_SIN_ATENDER: EstadoCorreo[] = ['nuevo', 'leido']

export type FiltroBuzon = 'todos' | 'hola' | 'gmail'
export type FiltroCategoria = 'persona' | 'servicio' | 'todos'
export type FiltroEstado = 'todos' | 'pendientes' | EstadoCorreo

export type Filtros = { buzon: FiltroBuzon; categoria: FiltroCategoria; estado: FiltroEstado }

/** Lee los filtros de la URL; por defecto, personas de todos los buzones sin archivar. */
export function leerFiltros(p: { buzon?: string; categoria?: string; estado?: string }): Filtros {
  const buzon = (['todos', 'hola', 'gmail'] as const).find(x => x === p.buzon) ?? 'todos'
  const categoria = (['persona', 'servicio', 'todos'] as const).find(x => x === p.categoria) ?? 'persona'
  const estado = (['todos', 'pendientes', ...ESTADOS] as const).find(x => x === p.estado) ?? 'todos'
  return { buzon, categoria, estado }
}

/** Query string de unos filtros (sin los valores por defecto). */
export function queryFiltros(f: Filtros, extra: Record<string, string> = {}): string {
  const q = new URLSearchParams()
  if (f.buzon !== 'todos') q.set('buzon', f.buzon)
  if (f.categoria !== 'persona') q.set('categoria', f.categoria)
  if (f.estado !== 'todos') q.set('estado', f.estado)
  for (const [k, v] of Object.entries(extra)) q.set(k, v)
  const s = q.toString()
  return s ? `?${s}` : ''
}

/** «Re: asunto», sin repetir el «Re:». */
export const asuntoRespuesta = (asunto: string | null) => {
  const a = (asunto ?? '').trim()
  return /^re:/i.test(a) ? a : `Re: ${a}`.trim()
}

/**
 * Enlace «Responder». hola@: mailto: (abre el programa de correo con el que se
 * gestiona Arsys). Gmail: la redacción de Gmail en la cuenta
 * info.obrasdeteatro@gmail.com. Nada se envía desde la web.
 */
export function enlaceResponder(c: { buzon: Buzon; remitente_email: string | null; asunto: string | null }): string | null {
  if (!c.remitente_email) return null
  const asunto = asuntoRespuesta(c.asunto)
  if (c.buzon === 'gmail') {
    const q = new URLSearchParams({ authuser: GMAIL_PROPIO, view: 'cm', fs: '1', to: c.remitente_email, su: asunto })
    return `https://mail.google.com/mail/?${q.toString()}`
  }
  return `mailto:${encodeURIComponent(c.remitente_email).replace(/%40/g, '@')}?subject=${encodeURIComponent(asunto)}`
}

/** 1536 → «1,5 KB». */
export function tamano(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined) return 'tamaño desconocido'
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toLocaleString('es-ES', { maximumFractionDigits: 1 })} KB`
  return `${(kb / 1024).toLocaleString('es-ES', { maximumFractionDigits: 1 })} MB`
}
