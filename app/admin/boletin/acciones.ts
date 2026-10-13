'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { construirHtmlBoletin } from '@/lib/boletin/boletin'
import { cargarContenido, enviarBoletin } from '@/lib/boletin/envio'

async function moderador(): Promise<{ email: string | null } | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: roles } = await supabase.from('profile_roles').select('role').eq('profile_id', user.id).in('role', ['admin', 'moderator'])
  return roles?.length ? { email: user.email ?? null } : null
}

/** Guarda los ajustes con la sesión del moderador (la RLS solo deja a moderación). */
export async function guardarConfig(c: { nombre: string; activo: boolean; acceso: string; dia_envio: number }): Promise<string | null> {
  const supabase = await createClient()
  const nombre = c.nombre.trim()
  if (nombre.length < 2 || nombre.length > 80) return 'El nombre debe tener entre 2 y 80 caracteres.'
  const { data, error } = await supabase.from('boletin_config')
    .update({ nombre, activo: c.activo, acceso: c.acceso, dia_envio: c.dia_envio }).eq('id', true).select('id')
  if (error) return error.message
  if (!data?.length) return 'No tienes permiso para cambiar el boletín.'
  revalidateTag('boletin-config')
  revalidatePath('/admin/boletin')
  return null
}

/** El boletín de esta semana tal como saldría, para verlo antes de enviarlo. */
export async function vistaPrevia(): Promise<{ html: string } | { error: string }> {
  if (!(await moderador())) return { error: 'Solo moderación.' }
  const servicio = createServiceClient()
  const { data: config } = await servicio.from('boletin_config').select('nombre').maybeSingle()
  const ahora = new Date()
  const contenido = await cargarContenido(servicio, ahora)
  return { html: construirHtmlBoletin(config?.nombre ?? 'Boletín', contenido, 'vista-previa', ahora, true) }
}

/** Envía el boletín de esta semana solo al correo del moderador. */
export async function enviarPrueba(): Promise<string> {
  const m = await moderador()
  if (!m) return 'Solo moderación.'
  if (!m.email) return 'Tu cuenta no tiene correo.'
  const servicio = createServiceClient()
  const { data: config } = await servicio.from('boletin_config').select('nombre, activo, acceso, dia_envio').maybeSingle()
  if (!config) return 'Sin configuración.'
  const r = await enviarBoletin(servicio, config, new Date(), { prueba: m.email })
  revalidatePath('/admin/boletin')
  return r.enviado ? `Prueba enviada a ${m.email}.` : `No se envió: ${r.motivo ?? 'error de Resend'}.`
}
