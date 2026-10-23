/**
 * Red profesional · Fase 1: contacto y permisos.
 *
 * El correo de contacto se ve si el titular lo hace público. El teléfono y el
 * WhatsApp nunca se ven directamente: otro usuario los pide y el titular
 * acepta (tabla solicitudes_contacto, función contacto_de). Mismas reglas que
 * los CHECK de la migración 20261023160000.
 */

export const TELEFONO_RE = /^\+?[0-9 ().-]{6,24}$/
export const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
export const MAX_MENSAJE_SOLICITUD = 300

/** Estado que devuelve contacto_de() para quien mira. */
export type EstadoContacto = 'propio' | 'aceptada' | 'pendiente' | 'ninguna' | 'anonimo'

export function telefonoValido(v: string): boolean {
  const t = v.trim()
  return TELEFONO_RE.test(t) && t.replace(/\D/g, '').length >= 6
}

export function emailValido(v: string): boolean {
  const t = v.trim()
  return t.length <= 254 && EMAIL_RE.test(t)
}

/** Solo dígitos (y el + inicial) para enlaces tel:. */
export function hrefTelefono(v: string): string {
  const t = v.trim()
  return `tel:${t.startsWith('+') ? '+' : ''}${t.replace(/\D/g, '')}`
}

/**
 * Enlace de WhatsApp. wa.me exige el número internacional sin + ni ceros
 * iniciales; si el número no lleva prefijo (+ o 00), no se puede adivinar el
 * país y se devuelve null (se muestra el número sin enlace).
 */
export function hrefWhatsapp(v: string): string | null {
  const t = v.trim()
  let digitos: string
  if (t.startsWith('+')) digitos = t.replace(/\D/g, '')
  else if (t.startsWith('00')) digitos = t.replace(/\D/g, '').slice(2)
  else return null
  return digitos.length >= 8 ? `https://wa.me/${digitos}` : null
}

export function estadoContacto(v: string | null | undefined): EstadoContacto {
  return v === 'propio' || v === 'aceptada' || v === 'pendiente' || v === 'anonimo' ? v : 'ninguna'
}
