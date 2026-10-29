/**
 * Master Control: lecturas de los bloques «Salud de las automatizaciones» y
 * «La plataforma en cifras». Con la sesión lo que las páginas de /admin ya
 * leen con la sesión; con el cliente de servicio solo lo que ellas ya leen
 * así (perfiles, suscripciones, embajadores). Nunca se usa en el navegador.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { PLAZAS_FUNDADORAS } from '@/lib/embajadores/textos'
import { plazasOcupadas } from '@/lib/embajadores/plazas'
import { leerEstadoMake } from './make'
import {
  PATRON_BDNS, PATRON_LATAM, saludConvocatorias, saludCorreo, saludMake, saludMediateca, saludNoticias, saludProscenio,
  type ProgramaSalud, type Semaforo,
} from './salud'

/** Lotes con que la Redacción importa desde Make (ver /api/convocatorias/import). */
export const LOTE_BDNS = 'BDNS-'
export const LOTE_LATAM = 'GALERTAS-'

/** Estados de Stripe que dan acceso al plan (mismo criterio que el webhook). */
export const ESTADOS_SUSCRIPCION_ACTIVA = ['active', 'trialing'] as const

/** Meta del catálogo de espacios escénicos. */
export const META_ESPACIOS = 10_000

async function ultimaFecha(q: PromiseLike<{ data: unknown; error: unknown }>, columna: string): Promise<string | null> {
  const { data } = await q
  const fila = (data as Record<string, string | null>[] | null)?.[0]
  return fila?.[columna] ?? null
}

/** esAdmin: el semáforo del correo entrante solo lo ve administración. */
export async function cargarSalud(sesion: SupabaseClient, ahora: Date, esAdmin = false): Promise<Semaforo[]> {
  const ultimaConvocatoria = (lote: string) => ultimaFecha(
    sesion.from('calls').select('created_at').like('lote', `${lote}%`).order('created_at', { ascending: false }).limit(1), 'created_at')

  const [make, ultimaNoticia, fuentes, bdns, latam, programas, config, envio, ultimoCorreo] = await Promise.all([
    leerEstadoMake(),
    ultimaFecha(sesion.from('noticias').select('created_at').order('created_at', { ascending: false }).limit(1), 'created_at'),
    sesion.from('noticias_fuentes').select('activa'),
    ultimaConvocatoria(LOTE_BDNS),
    ultimaConvocatoria(LOTE_LATAM),
    sesion.from('mediateca_programas').select('id, nombre, ultima_importacion_at, ultimo_error').eq('activo', true).order('orden', { ascending: true }),
    sesion.from('boletin_config').select('nombre, activo, dia_envio').maybeSingle(),
    sesion.from('boletin_envios').select('enviado_at, destinatarios, errores').eq('es_prueba', false).order('enviado_at', { ascending: false }).limit(1),
    esAdmin ? ultimaFecha(sesion.from('correos_entrantes').select('recibido_at').order('recibido_at', { ascending: false }).limit(1), 'recibido_at') : Promise.resolve(null),
  ])

  const listaFuentes = (fuentes.data ?? []) as { activa: boolean }[]
  const semaforos: Semaforo[] = [
    saludNoticias({ ultima: ultimaNoticia, fuentesActivas: listaFuentes.filter(f => f.activa).length, fuentesTotal: listaFuentes.length }, ahora),
    saludConvocatorias({ clave: 'bdns', titulo: 'Convocatorias España (BDNS)', ultimaImportada: bdns, patron: PATRON_BDNS, maxDias: 8 }, make, ahora),
    saludConvocatorias({ clave: 'latam', titulo: 'Convocatorias Latinoamérica (Google Alertas)', ultimaImportada: latam, patron: PATRON_LATAM, maxDias: 2 }, make, ahora),
    ...saludMediateca((programas.data ?? []) as ProgramaSalud[], ahora),
  ]
  if (programas.error) {
    semaforos.push({ clave: 'mediateca', titulo: 'Mediateca', color: 'ambar', ultimoDato: null, frase: `No se pudieron leer los programas: ${programas.error.message}`, href: '/admin/mediateca' })
  }
  const c = config.data as { nombre: string; activo: boolean; dia_envio: number } | null
  if (c) {
    const ultimo = ((envio.data ?? []) as { enviado_at: string; destinatarios: number; errores: number }[])[0] ?? null
    semaforos.push(saludProscenio({ ...c, ultimo }, ahora))
  }
  if (esAdmin) {
    semaforos.push(saludCorreo({ configurado: !!process.env.RESEND_INBOUND_WEBHOOK_SECRET?.trim(), ultimo: ultimoCorreo, sinAtender: null }, ahora))
  }
  semaforos.push(saludMake(make, ahora))
  return semaforos
}

export type Cifras = {
  usuarios: number | null
  usuariosNuevos7d: number | null
  suscripcionesPorPlan: { plan: string; n: number }[] | null
  espaciosPublicados: number | null
  suscriptoresProscenio: number | null
  /** Solo admin. */
  embajadores?: { ocupadas: number; total: number } | null
}

export async function cargarCifras(sesion: SupabaseClient, servicio: SupabaseClient, esAdmin: boolean, ahora: Date): Promise<Cifras> {
  const cuenta = async (q: PromiseLike<{ count: number | null; error: unknown }>) => {
    const { count, error } = await q
    return error ? null : count ?? 0
  }
  const perfiles = () => servicio.from('profiles').select('id', { count: 'exact', head: true }).is('deleted_at', null)
  const hace7d = new Date(ahora.getTime() - 7 * 86_400_000).toISOString()

  const [usuarios, nuevos, subs, espacios, proscenio, invitaciones] = await Promise.all([
    cuenta(perfiles()),
    cuenta(perfiles().gte('created_at', hace7d)),
    servicio.from('subscriptions').select('plan').in('status', [...ESTADOS_SUSCRIPCION_ACTIVA]).limit(10000),
    cuenta(sesion.from('espacios_escenicos').select('id', { count: 'exact', head: true }).eq('estado', 'publicado')),
    cuenta(sesion.from('boletin_suscriptores').select('id', { count: 'exact', head: true }).eq('estado', 'confirmado')),
    esAdmin ? servicio.from('embajadores_invitaciones').select('estado, caduca_at').limit(5000) : Promise.resolve(null),
  ])

  const porPlan = new Map<string, number>()
  for (const s of (subs.data ?? []) as { plan: string }[]) porPlan.set(s.plan, (porPlan.get(s.plan) ?? 0) + 1)

  const cifras: Cifras = {
    usuarios,
    usuariosNuevos7d: nuevos,
    suscripcionesPorPlan: subs.error ? null : [...porPlan.entries()].map(([plan, n]) => ({ plan, n })).sort((a, b) => b.n - a.n),
    espaciosPublicados: espacios,
    suscriptoresProscenio: proscenio,
  }
  if (esAdmin) {
    cifras.embajadores = invitaciones && !invitaciones.error
      ? { ocupadas: plazasOcupadas((invitaciones.data ?? []) as { estado: string; caduca_at: string }[], ahora.getTime()), total: PLAZAS_FUNDADORAS }
      : null
  }
  return cifras
}
