'use server'

import { revalidatePath } from 'next/cache'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { leerAcceso } from '@/lib/admin/acceso'
import { crearTarea, reasignarTarea, type ResultadoTarea, type Usuario } from '@/lib/tareas/crear'
import { ESTADOS_TAREA, leerAsignacion, MAX_TEXTO, validarNuevaTarea, type EstadoTarea } from '@/lib/tareas/tareas'

/**
 * Acciones de /admin/tareas. Todo se escribe con la sesión de quien actúa: la
 * RLS y el trigger de tareas_admin son la seguridad (moderator solo cambia el
 * estado de las suyas). La clave de servicio solo se usa, tras comprobar el
 * rol, para leer el correo de la persona a la que se asigna una tarea.
 */

type Contexto = { sesion: SupabaseClient; usuario: Usuario }

async function contexto(): Promise<Contexto | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Inicia sesión.' }
  const sesion = supabase as unknown as SupabaseClient
  const { permitido, esAdmin } = await leerAcceso(sesion, user.id)
  if (!permitido) return { error: 'Las tareas son del equipo de administración y moderación.' }
  return { sesion, usuario: { id: user.id, esAdmin } }
}

const refrescar = (id?: string) => {
  revalidatePath('/admin/tareas')
  if (id) revalidatePath(`/admin/tareas/${id}`)
  revalidatePath('/admin')
}

export async function crearTareaAccion(campos: Record<string, string>): Promise<ResultadoTarea> {
  const c = await contexto()
  if ('error' in c) return c
  const v = validarNuevaTarea(campos)
  if ('error' in v) return v
  const r = await crearTarea({ sesion: c.sesion, servicio: createServiceClient() as unknown as SupabaseClient, usuario: c.usuario, datos: v.datos })
  if ('ok' in r) refrescar(r.id)
  return r
}

export async function reasignarTareaAccion(id: string, asignacion: string): Promise<ResultadoTarea> {
  const c = await contexto()
  if ('error' in c) return c
  const a = leerAsignacion(asignacion)
  if (!a) return { error: 'Asignación no válida.' }
  const r = await reasignarTarea({ sesion: c.sesion, servicio: createServiceClient() as unknown as SupabaseClient, usuario: c.usuario, id, ...a })
  if ('ok' in r) refrescar(id)
  return r
}

export async function cambiarEstadoTareaAccion(id: string, estado: EstadoTarea): Promise<{ ok: true } | { error: string }> {
  const c = await contexto()
  if ('error' in c) return c
  if (!ESTADOS_TAREA.includes(estado)) return { error: 'Estado no válido.' }
  const { data, error } = await c.sesion.from('tareas_admin').update({ estado }).eq('id', id).select('id')
  if (error) return { error: `No se pudo cambiar el estado: ${error.message}` }
  if (!data?.length) return { error: 'Tarea no encontrada.' }
  refrescar(id)
  return { ok: true }
}

export async function anadirNotaAccion(id: string, texto: string): Promise<{ ok: true } | { error: string }> {
  const c = await contexto()
  if ('error' in c) return c
  const limpio = texto.trim()
  if (!limpio) return { error: 'Escribe la nota.' }
  if (limpio.length > MAX_TEXTO) return { error: `La nota no puede pasar de ${MAX_TEXTO} caracteres.` }
  const { error } = await c.sesion.from('tareas_admin_notas')
    .insert({ tarea_id: id, autor: c.usuario.id, autor_tipo: 'persona', tipo: 'comentario', texto: limpio })
  if (error) return { error: `No se pudo guardar la nota: ${error.message}` }
  refrescar(id)
  return { ok: true }
}
