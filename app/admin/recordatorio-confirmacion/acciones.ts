'use server'

import { revalidatePath } from 'next/cache'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { cargarPendientesConfirmar, enviarLoteConfirmacion } from '@/lib/avisos/confirmacion'

async function administrador(): Promise<{ email: string | null } | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: rol } = await supabase.from('profile_roles').select('role').eq('profile_id', user.id).eq('role', 'admin').maybeSingle()
  return rol ? { email: user.email ?? null } : null
}

/** Una prueba al administrador, tal como llegará. */
export async function enviarPruebaConfirmacion(): Promise<string> {
  const a = await administrador()
  if (!a) return 'Solo administración.'
  if (!a.email) return 'Tu cuenta no tiene correo.'
  const ok = await enviarLoteConfirmacion([{ para: a.email, nombre: 'Renee' }])
  return ok ? `Prueba enviada a ${a.email}.` : 'No se envió: error de Resend.'
}

/** Envía a todos los pendientes si la lista no ha cambiado; cada envío queda anotado. */
export async function enviarConfirmacionATodos(esperados: number): Promise<{ ok: boolean; texto: string }> {
  if (!(await administrador())) return { ok: false, texto: 'Solo administración.' }
  const servicio = createServiceClient() as unknown as SupabaseClient
  const { pendientes } = await cargarPendientesConfirmar(servicio)
  if (pendientes.length === 0) return { ok: false, texto: 'No queda nadie pendiente.' }
  if (pendientes.length !== esperados) {
    return { ok: false, texto: `La lista ha cambiado (ahora son ${pendientes.length}). Recarga la página y revísala antes de enviar.` }
  }

  let enviados = 0
  let fallidos = 0
  for (let i = 0; i < pendientes.length; i += 100) {
    const lote = pendientes.slice(i, i + 100)
    if (await enviarLoteConfirmacion(lote.map(p => ({ para: p.email, nombre: p.nombre })))) {
      const { error } = await servicio.from('avisos_confirmacion_enviados')
        .upsert(lote.map(p => ({ profile_id: p.id })), { onConflict: 'profile_id' })
      if (error) console.error('recordatorio: enviado pero no anotado:', error.message)
      enviados += lote.length
    } else {
      fallidos += lote.length
    }
  }
  revalidatePath('/admin/recordatorio-confirmacion')
  return fallidos === 0
    ? { ok: true, texto: `Recordatorio enviado a ${enviados} cuentas.` }
    : { ok: false, texto: `Enviados: ${enviados}. Sin enviar por error de Resend: ${fallidos}. Puedes volver a intentarlo: solo saldrán los que faltan.` }
}
