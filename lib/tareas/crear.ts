/**
 * Crear y reasignar tareas (lo que hacen las acciones de /admin/tareas).
 *
 * - No duplica: si ya hay una tarea abierta para el mismo origen, devuelve esa
 *   en vez de crear otra (y la base lo impide igualmente con un índice único).
 * - moderator solo crea tareas para sí mismo y nunca de un correo; asignar a
 *   otros o al agente es de admin. La base lo vuelve a exigir (RLS y trigger).
 * - Al asignar a una persona distinta de quien lo hace, le manda un aviso por
 *   correo. Si el envío falla, la tarea queda creada y se avisa en pantalla.
 *
 * La tarea se escribe con la sesión de quien la crea; la clave de servicio
 * solo se usa para leer la dirección de correo de la persona asignada (la
 * columna email de profiles no la puede leer ninguna sesión).
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { enviarAvisoAsignacion, type AvisoAsignacion } from './aviso'
import { ESTADOS_ABIERTOS, type AsignadoTipo, type DatosNuevaTarea, type Prioridad } from './tareas'

export type Usuario = { id: string; esAdmin: boolean }

export type ResultadoTarea =
  | { ok: true; id: string; aviso: 'enviado' | 'fallo' | null }
  | { existente: { id: string; titulo: string } }
  | { error: string }

type Enviar = (a: AvisoAsignacion) => Promise<boolean>

export async function tareaAbiertaDeOrigen(sesion: SupabaseClient, tipo: string, ref: string | null) {
  if (!ref) return null
  const { data } = await sesion.from('tareas_admin').select('id, titulo')
    .eq('origen_tipo', tipo).eq('origen_ref', ref).in('estado', ESTADOS_ABIERTOS).limit(1).maybeSingle()
  const t = data as { id: string; titulo: string } | null
  return t ? { id: t.id, titulo: t.titulo } : null
}

/** Aviso a la persona asignada si no es quien asigna. null si no toca avisar. */
async function avisar(
  servicio: SupabaseClient, usuario: Usuario,
  t: { id: string; titulo: string; prioridad: Prioridad; fecha_limite: string | null; asignado_tipo: AsignadoTipo; asignado_a: string | null },
  enviar: Enviar,
): Promise<'enviado' | 'fallo' | null> {
  if (t.asignado_tipo !== 'persona' || !t.asignado_a || t.asignado_a === usuario.id) return null
  const { data: p } = await servicio.from('profiles').select('email, nombre, nombre_artistico').eq('id', t.asignado_a).maybeSingle()
  const perfil = p as { email: string | null; nombre: string | null; nombre_artistico: string | null } | null
  if (!perfil?.email) return 'fallo'
  const ok = await enviar({
    para: perfil.email, nombre: perfil.nombre_artistico?.trim() || perfil.nombre?.trim() || '',
    tareaId: t.id, titulo: t.titulo, prioridad: t.prioridad, fechaLimite: t.fecha_limite,
  })
  return ok ? 'enviado' : 'fallo'
}

export async function crearTarea(
  { sesion, servicio, usuario, datos, enviar = enviarAvisoAsignacion }:
  { sesion: SupabaseClient; servicio: SupabaseClient; usuario: Usuario; datos: DatosNuevaTarea; enviar?: Enviar },
): Promise<ResultadoTarea> {
  if (!usuario.esAdmin) {
    if (datos.origen_tipo === 'correo') return { error: 'Las tareas de un correo son solo de administración.' }
    if (datos.asignado_tipo !== 'persona' || datos.asignado_a !== usuario.id) {
      return { error: 'Solo puedes crear tareas para ti. Asignarlas a otras personas o al agente es de administración.' }
    }
  }

  const ya = await tareaAbiertaDeOrigen(sesion, datos.origen_tipo, datos.origen_ref)
  if (ya) return { existente: ya }

  const { data, error } = await sesion.from('tareas_admin').insert(datos).select('id').single()
  if (error) {
    // Otra persona la creó a la vez: el índice único de origen lo impide.
    if ((error as { code?: string }).code === '23505') {
      const otra = await tareaAbiertaDeOrigen(sesion, datos.origen_tipo, datos.origen_ref)
      if (otra) return { existente: otra }
    }
    return { error: `No se pudo crear la tarea: ${error.message}` }
  }
  const id = (data as { id: string }).id
  const aviso = await avisar(servicio, usuario, { id, ...datos }, enviar)
  return { ok: true, id, aviso }
}

export async function reasignarTarea(
  { sesion, servicio, usuario, id, asignado_tipo, asignado_a, enviar = enviarAvisoAsignacion }:
  { sesion: SupabaseClient; servicio: SupabaseClient; usuario: Usuario; id: string; asignado_tipo: AsignadoTipo; asignado_a: string | null; enviar?: Enviar },
): Promise<ResultadoTarea> {
  if (!usuario.esAdmin) return { error: 'Solo administración puede cambiar la asignación.' }
  const { data, error } = await sesion.from('tareas_admin').update({ asignado_tipo, asignado_a })
    .eq('id', id).select('id, titulo, prioridad, fecha_limite, asignado_tipo, asignado_a').maybeSingle()
  if (error) return { error: `No se pudo reasignar: ${error.message}` }
  if (!data) return { error: 'Tarea no encontrada.' }
  const t = data as { id: string; titulo: string; prioridad: Prioridad; fecha_limite: string | null; asignado_tipo: AsignadoTipo; asignado_a: string | null }
  return { ok: true, id, aviso: await avisar(servicio, usuario, t, enviar) }
}
