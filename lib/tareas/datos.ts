/**
 * Tareas: lecturas para el Master Control y para el formulario. Todo con la
 * sesión (la RLS da a admin todas y a moderator las suyas), salvo la lista
 * de personas asignables, que se lee con la clave de servicio igual que en
 * las demás páginas de /admin (profile_roles solo deja ver los roles propios).
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { claveOrigen, ESTADOS_ABIERTOS, hoyCanarias, type OrigenTipo } from './tareas'

export type Asignable = { id: string; nombre: string; esAdmin: boolean }

const nombre = (p: { nombre: string | null; apellidos: string | null; nombre_artistico: string | null } | undefined) =>
  p?.nombre_artistico?.trim() || [p?.nombre, p?.apellidos].filter(Boolean).join(' ').trim() || 'Sin nombre'

/** Cuentas con rol admin o moderator. */
export async function equipoAsignable(servicio: SupabaseClient): Promise<Asignable[]> {
  const { data: roles } = await servicio.from('profile_roles').select('profile_id, role').in('role', ['admin', 'moderator'])
  const filas = (roles ?? []) as { profile_id: string; role: string }[]
  const ids = [...new Set(filas.map(r => r.profile_id))]
  if (!ids.length) return []
  const { data: perfiles } = await servicio.from('profiles').select('id, nombre, apellidos, nombre_artistico').in('id', ids).is('deleted_at', null)
  const porId = new Map(((perfiles ?? []) as { id: string; nombre: string | null; apellidos: string | null; nombre_artistico: string | null }[]).map(p => [p.id, p]))
  return ids.filter(id => porId.has(id))
    .map(id => ({ id, nombre: nombre(porId.get(id)), esAdmin: filas.some(r => r.profile_id === id && r.role === 'admin') }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
}

/** Tareas abiertas de unos orígenes: «cola:noticias» → { id, titulo }. */
export async function tareasAbiertasPorOrigen(sesion: SupabaseClient, origenes: { tipo: OrigenTipo; ref: string }[]) {
  const mapa: Record<string, { id: string; titulo: string }> = {}
  if (!origenes.length) return mapa
  const refs = [...new Set(origenes.map(o => o.ref))]
  const { data } = await sesion.from('tareas_admin').select('id, titulo, origen_tipo, origen_ref')
    .in('origen_ref', refs).in('estado', ESTADOS_ABIERTOS).limit(500)
  for (const t of (data ?? []) as { id: string; titulo: string; origen_tipo: OrigenTipo; origen_ref: string }[]) {
    mapa[claveOrigen(t.origen_tipo, t.origen_ref)] = { id: t.id, titulo: t.titulo }
  }
  return mapa
}

/** Consultas de recuento de tareas para las colas del Master Control. */
export function consultasRecuentoTareas(sesion: SupabaseClient, ahora = new Date()) {
  const base = () => sesion.from('tareas_admin').select('id', { count: 'exact', head: true }).in('estado', ESTADOS_ABIERTOS)
  return {
    abiertas: base(),
    vencidas: base().lt('fecha_limite', hoyCanarias(ahora)),
    urgentes: base().eq('prioridad', 'urgente'),
  }
}
