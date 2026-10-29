/**
 * API del agente automático (desactivada mientras no exista ADMIN_AGENT_TOKEN).
 *
 * - Sin variable configurada: 404, como si las rutas no existieran.
 * - Token en «Authorization: Bearer <token>», comparado en tiempo constante.
 *   Inválido o ausente: 401.
 * - El agente solo ve y toca tareas con asignado_tipo = 'agente'. Recibe solo
 *   título, descripción, prioridad, fecha límite, estado y origen_enlace;
 *   nunca el origen (p. ej. el correo). Solo puede pasar el estado a
 *   en_curso, resuelta o descartada y añadir una nota. No crea, no reasigna
 *   ni borra; y aunque lo intentara, el trigger de la base solo le deja
 *   cambiar el estado.
 *
 * La clave de servicio la pasa la ruta, solo después de validar el token.
 */

import { createHash, timingSafeEqual } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { ESTADOS_ABIERTOS, MAX_TEXTO, type EstadoTarea } from './tareas'

export type Autorizacion = 'desactivada' | 'denegada' | 'ok'

export function autorizarAgente(cabecera: string | null, token: string | null | undefined): Autorizacion {
  if (!token?.trim()) return 'desactivada'
  if (!cabecera) return 'denegada'
  const a = createHash('sha256').update(cabecera, 'utf8').digest()
  const b = createHash('sha256').update(`Bearer ${token.trim()}`, 'utf8').digest()
  return timingSafeEqual(a, b) ? 'ok' : 'denegada'
}

export type Respuesta = { status: number; cuerpo: unknown }

const RESPUESTA_AUTH: Record<Exclude<Autorizacion, 'ok'>, Respuesta> = {
  desactivada: { status: 404, cuerpo: { error: 'No encontrado' } },
  denegada: { status: 401, cuerpo: { error: 'No autorizado' } },
}

/** Lo único que ve el agente de una tarea. */
export const COLUMNAS_AGENTE = 'id, titulo, descripcion, prioridad, fecha_limite, estado, origen_enlace, created_at'

export async function listarTareasAgente(auth: Autorizacion, servicio: () => SupabaseClient): Promise<Respuesta> {
  if (auth !== 'ok') return RESPUESTA_AUTH[auth]
  const { data, error } = await servicio()
    .from('tareas_admin')
    .select(COLUMNAS_AGENTE)
    .eq('asignado_tipo', 'agente')
    .in('estado', ESTADOS_ABIERTOS)
    .order('created_at', { ascending: true })
    .limit(200)
  if (error) return { status: 500, cuerpo: { error: 'Error interno' } }
  return { status: 200, cuerpo: { tareas: data ?? [] } }
}

export const ESTADOS_AGENTE: EstadoTarea[] = ['en_curso', 'resuelta', 'descartada']

export async function actualizarTareaAgente(
  auth: Autorizacion,
  servicio: () => SupabaseClient,
  id: string,
  cuerpo: unknown,
): Promise<Respuesta> {
  if (auth !== 'ok') return RESPUESTA_AUTH[auth]
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { status: 404, cuerpo: { error: 'No encontrado' } }

  const b = (cuerpo && typeof cuerpo === 'object' ? cuerpo : {}) as { estado?: unknown; nota?: unknown }
  const estado = b.estado === undefined ? undefined : String(b.estado)
  const nota = b.nota === undefined ? undefined : String(b.nota).trim()
  if (estado === undefined && !nota) return { status: 400, cuerpo: { error: 'Indica un estado o una nota.' } }
  if (estado !== undefined && !(ESTADOS_AGENTE as string[]).includes(estado)) {
    return { status: 400, cuerpo: { error: `Estado no válido: usa ${ESTADOS_AGENTE.join(', ')}.` } }
  }
  if (nota !== undefined && nota.length > MAX_TEXTO) return { status: 400, cuerpo: { error: `La nota no puede pasar de ${MAX_TEXTO} caracteres.` } }

  const s = servicio()
  // Solo tareas del agente y todavía abiertas.
  const { data: tarea, error: errorLectura } = await s.from('tareas_admin').select('id, estado')
    .eq('id', id).eq('asignado_tipo', 'agente').in('estado', ESTADOS_ABIERTOS).maybeSingle()
  if (errorLectura) return { status: 500, cuerpo: { error: 'Error interno' } }
  if (!tarea) return { status: 404, cuerpo: { error: 'No encontrado' } }

  if (estado !== undefined && estado !== (tarea as { estado: string }).estado) {
    const { error } = await s.from('tareas_admin').update({ estado })
      .eq('id', id).eq('asignado_tipo', 'agente')
    if (error) return { status: 500, cuerpo: { error: 'Error interno' } }
  }
  if (nota) {
    const { error } = await s.from('tareas_admin_notas').insert({ tarea_id: id, autor: null, autor_tipo: 'agente', tipo: 'comentario', texto: nota })
    if (error) return { status: 500, cuerpo: { error: 'Error interno' } }
  }
  const { data: final } = await s.from('tareas_admin').select(COLUMNAS_AGENTE).eq('id', id).eq('asignado_tipo', 'agente').maybeSingle()
  return { status: 200, cuerpo: { tarea: final } }
}
