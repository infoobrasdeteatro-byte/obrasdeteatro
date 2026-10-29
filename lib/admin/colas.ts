/**
 * Colas de pendientes de /admin: un único criterio por cola, compartido por
 * la página de cada sección y por el Master Control, para que el contador del
 * panel y la cola que se ve al entrar no puedan contar cosas distintas.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { cargarDestinatariosAviso } from '@/lib/avisos/perfil-incompleto-envio'
import { cargarPendientesConfirmar } from '@/lib/avisos/confirmacion'
import type { ClaveCola } from './secciones'

/** Estado que marca «pendiente» en cada tabla. */
export const ESTADO_PENDIENTE = {
  noticias: 'candidata',
  castings: 'pendiente_revision',
  reportes: 'pendiente',
  convocatorias: 'pendiente_revision',
  cartelera: 'pendiente_revision',
  verificaciones: 'pendiente',
  reclamaciones: 'pendiente',
  sugerencias: 'pendiente',
} as const

type Cola = {
  clave: ClaveCola
  href: string
  uno: string
  varios: string
  soloAdmin?: boolean
}

export const COLAS: Cola[] = [
  { clave: 'noticias', href: '/admin/noticias', uno: 'noticia candidata', varios: 'noticias candidatas' },
  { clave: 'castings', href: '/admin/castings', uno: 'casting en revisión', varios: 'castings en revisión' },
  { clave: 'reportes', href: '/admin/reportes-castings', uno: 'reporte de casting abierto', varios: 'reportes de castings abiertos' },
  { clave: 'convocatorias', href: '/admin/convocatorias', uno: 'convocatoria en revisión', varios: 'convocatorias en revisión' },
  { clave: 'cartelera', href: '/admin/cartelera', uno: 'espectáculo de cartelera en revisión', varios: 'espectáculos de cartelera en revisión' },
  { clave: 'verificaciones', href: '/admin/verificaciones', uno: 'verificación pendiente', varios: 'verificaciones pendientes' },
  { clave: 'reclamaciones', href: '/admin/espacios', uno: 'reclamación de espacio pendiente', varios: 'reclamaciones de espacios pendientes' },
  { clave: 'sugerencias', href: '/admin/espacios', uno: 'sugerencia de espacio pendiente', varios: 'sugerencias de espacios pendientes' },
  { clave: 'avisos', href: '/admin/avisos-perfil', uno: 'aviso de perfil por enviar', varios: 'avisos de perfil por enviar', soloAdmin: true },
  { clave: 'recordatorios', href: '/admin/recordatorio-confirmacion', uno: 'recordatorio de confirmación por enviar', varios: 'recordatorios de confirmación por enviar', soloAdmin: true },
]

/** null = no se pudo contar (se muestra como aviso, no como cero). */
export type Pendientes = Partial<Record<ClaveCola, number | null>>

export type ElementoAtencion = { clave: ClaveCola; n: number | null; texto: string; href: string }

/** Puro: solo las colas con algo pendiente, o que no se pudieron contar. */
export function elementosAtencion(p: Pendientes, esAdmin: boolean): ElementoAtencion[] {
  return COLAS
    .filter(c => esAdmin || !c.soloAdmin)
    .filter(c => p[c.clave] !== undefined && p[c.clave] !== 0)
    .map(c => {
      const n = p[c.clave] ?? null
      return { clave: c.clave, n, href: c.href, texto: n === null ? `No se pudo contar: ${c.varios}` : `${n} ${n === 1 ? c.uno : c.varios}` }
    })
}

/** Suma de las colas de una sección (null si alguna falló y no hay nada que sumar). */
export function totalColas(p: Pendientes, claves: ClaveCola[] = []): number | null {
  const valores = claves.map(c => p[c]).filter((v): v is number | null => v !== undefined)
  if (valores.length === 0) return null
  const numeros = valores.filter((v): v is number => typeof v === 'number')
  return numeros.length ? numeros.reduce((a, b) => a + b, 0) : null
}

async function contar(q: PromiseLike<{ count: number | null; error: unknown }>): Promise<number | null> {
  const { count, error } = await q
  return error ? null : count ?? 0
}

/**
 * Lee todas las colas. Con la sesión todo lo que las páginas leen con la
 * sesión; con el cliente de servicio lo que ellas ya leen así (verificaciones,
 * avisos y recordatorios). Las de solo administración no se leen a moderación.
 */
export async function cargarPendientes(sesion: SupabaseClient, servicio: SupabaseClient, esAdmin: boolean): Promise<Pendientes> {
  const n = (tabla: string, estado: string) => sesion.from(tabla).select('id', { count: 'exact', head: true }).eq('estado', estado)

  const [noticias, castings, reportes, convocatorias, cartelera, verificaciones, reclamaciones, sugerencias, avisos, recordatorios] = await Promise.all([
    contar(n('noticias', ESTADO_PENDIENTE.noticias)),
    contar(n('castings', ESTADO_PENDIENTE.castings)),
    contar(n('casting_reportes', ESTADO_PENDIENTE.reportes)),
    contar(n('calls', ESTADO_PENDIENTE.convocatorias).is('deleted_at', null)),
    contar(n('espectaculos', ESTADO_PENDIENTE.cartelera)),
    contar(servicio.from('verificaciones_profesionales').select('id', { count: 'exact', head: true }).eq('estado', ESTADO_PENDIENTE.verificaciones)),
    contar(n('espacios_reclamaciones', ESTADO_PENDIENTE.reclamaciones)),
    contar(n('espacios_sugerencias', ESTADO_PENDIENTE.sugerencias)),
    esAdmin ? cargarDestinatariosAviso(servicio).then(r => r.pendientes.length, () => null) : Promise.resolve(undefined),
    esAdmin ? cargarPendientesConfirmar(servicio).then(r => r.pendientes.length, () => null) : Promise.resolve(undefined),
  ])

  const p: Pendientes = { noticias, castings, reportes, convocatorias, cartelera, verificaciones, reclamaciones, sugerencias }
  if (esAdmin) { p.avisos = avisos ?? null; p.recordatorios = recordatorios ?? null }
  return p
}
