/**
 * Correo entrante: ¿lo escribió una persona o es un aviso automático de un
 * servicio? Esta lista es el único sitio donde se decide: para añadir un
 * servicio, añade su dominio o un patrón aquí.
 *
 * Un dominio cuenta también con sus subdominios (google.com incluye
 * accounts.google.com). Desde /admin/correo se puede cambiar a mano la
 * categoría de cualquier correo.
 */

import { GMAIL_VERIFICACION } from './direcciones'

export type Categoria = 'persona' | 'servicio'

export const DOMINIOS_SERVICIO = [
  'vercel.com',
  'github.com',
  'make.com',
  'stripe.com',
  'supabase.com',
  'supabase.io',
  'resend.com',
  'google.com',
  'metricool.com',
  'linkedin.com',
]

/** Parte local típica de envíos automáticos: no-reply, notifications, mailer-daemon… */
export const PATRONES_SERVICIO: RegExp[] = [
  /^(no-?reply|do-?not-?reply|donotreply)([+._-].*)?$/,
  /^notifications?([+._-].*)?$/,
  /^(mailer-daemon|postmaster)$/,
]

/** Excepciones que siempre son «persona» (para ver a mano su contenido). */
export const SIEMPRE_PERSONA = [
  // Verificación del reenvío de Gmail: trae el código que hay que copiar.
  GMAIL_VERIFICACION,
]

export function clasificar(remitente: string | null | undefined): Categoria {
  const email = (remitente ?? '').trim().toLowerCase()
  if (!email.includes('@')) return 'persona'
  if (SIEMPRE_PERSONA.includes(email)) return 'persona'
  const [local, dominio] = [email.slice(0, email.lastIndexOf('@')), email.slice(email.lastIndexOf('@') + 1)]
  if (DOMINIOS_SERVICIO.some(d => dominio === d || dominio.endsWith(`.${d}`))) return 'servicio'
  if (PATRONES_SERVICIO.some(p => p.test(local))) return 'servicio'
  return 'persona'
}
