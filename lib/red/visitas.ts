/**
 * PP2-E.3B · Visitas al perfil y apariciones en el directorio.
 *
 * Se registran desde el servidor (service_role) después de responder, con
 * after(): no retrasan la página. Nunca se guarda quién visita: solo una
 * huella anónima (hash de la sesión o de IP + navegador, mezclado con la
 * fecha) para contar una visita por persona y día.
 */
import { createHash } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'

/** Buscadores, vistas previas de redes y herramientas automáticas. */
const BOT_RE = /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|whatsapp|telegram|discord|slack|preview|embed|headless|lighthouse|pagespeed|vercel|curl|wget|python|axios|node-fetch|go-http|java\//i

export function esBot(userAgent: string | null | undefined): boolean {
  return !userAgent || BOT_RE.test(userAgent)
}

/** Día en UTC (AAAA-MM-DD), el mismo que usa la base. */
export function diaUtc(fecha = new Date()): string {
  return fecha.toISOString().slice(0, 10)
}

/**
 * Huella anónima del visitante para hoy: con sesión, su id; sin ella, la IP y
 * el navegador. Con la fecha mezclada, no sirve para seguir a nadie entre días.
 */
export function huellaVisitante(opts: { userId?: string | null; ip?: string | null; userAgent?: string | null; dia?: string }): string {
  const base = opts.userId ? `u:${opts.userId}` : `a:${opts.ip ?? ''}|${opts.userAgent ?? ''}`
  return createHash('sha256').update(`${opts.dia ?? diaUtc()}|${base}`).digest('hex')
}

/** Primera IP de x-forwarded-for (la del visitante en Vercel). */
export function ipDe(cabeceras: Headers): string | null {
  return cabeceras.get('x-forwarded-for')?.split(',')[0]?.trim() || cabeceras.get('x-real-ip') || null
}

export async function registrarVisita(servicio: SupabaseClient, perfilId: string, huella: string): Promise<void> {
  const { error } = await servicio.rpc('registrar_visita', { p_perfil: perfilId, p_huella: huella })
  if (error) console.error('visitas: no se pudo registrar:', error.message)
}

export async function registrarApariciones(servicio: SupabaseClient, perfilIds: string[]): Promise<void> {
  if (perfilIds.length === 0) return
  const { error } = await servicio.rpc('registrar_apariciones', { p_perfiles: perfilIds })
  if (error) console.error('apariciones: no se pudieron registrar:', error.message)
}

/** Variación en % respecto al periodo anterior (null si no hay base para comparar). */
export function variacion(actual: number, anterior: number): number | null {
  if (anterior <= 0) return null
  return Math.round(((actual - anterior) / anterior) * 100)
}
