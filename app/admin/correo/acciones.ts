'use server'

import { revalidatePath } from 'next/cache'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { leerAcceso } from '@/lib/admin/acceso'
import { ESTADOS, type EstadoCorreo } from '@/lib/correo/presentacion'

/**
 * Acciones de /admin/correo. Todas con la sesión de quien las pide: la RLS
 * (es_admin()) y los permisos por columna de correos_entrantes son la
 * seguridad; la comprobación de rol de aquí solo da un mensaje claro.
 * Quién y cuándo atendió un correo lo pone el trigger.
 */

type Resultado = { ok: true } | { error: string }

async function sesionAdmin(): Promise<SupabaseClient | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Inicia sesión.' }
  const { esAdmin } = await leerAcceso(supabase as unknown as SupabaseClient, user.id)
  if (!esAdmin) return { error: 'Solo administración puede gestionar el correo.' }
  return supabase as unknown as SupabaseClient
}

async function actualizar(id: string, cambios: Record<string, unknown>): Promise<Resultado> {
  const s = await sesionAdmin()
  if ('error' in s) return s
  const { data, error } = await s.from('correos_entrantes').update(cambios).eq('id', id).select('id')
  if (error) return { error: `No se pudo guardar: ${error.message}` }
  if (!data?.length) return { error: 'Correo no encontrado.' }
  revalidatePath('/admin/correo')
  revalidatePath('/admin')
  return { ok: true }
}

export async function cambiarEstado(id: string, estado: EstadoCorreo): Promise<Resultado> {
  if (!ESTADOS.includes(estado)) return { error: 'Estado no válido.' }
  return actualizar(id, { estado })
}

/** Al abrir un correo nuevo: pasa a leído (si ya no es nuevo, no hace nada). */
export async function marcarLeido(id: string): Promise<Resultado> {
  const s = await sesionAdmin()
  if ('error' in s) return s
  const { error } = await s.from('correos_entrantes').update({ estado: 'leido' }).eq('id', id).eq('estado', 'nuevo')
  if (error) return { error: error.message }
  revalidatePath('/admin')
  return { ok: true }
}

export async function cambiarCategoria(id: string, categoria: 'persona' | 'servicio'): Promise<Resultado> {
  if (categoria !== 'persona' && categoria !== 'servicio') return { error: 'Categoría no válida.' }
  return actualizar(id, { categoria })
}

export async function guardarNota(id: string, nota: string): Promise<Resultado> {
  const limpia = nota.trim()
  if (limpia.length > 4000) return { error: 'La nota no puede pasar de 4000 caracteres.' }
  return actualizar(id, { nota_interna: limpia || null })
}
