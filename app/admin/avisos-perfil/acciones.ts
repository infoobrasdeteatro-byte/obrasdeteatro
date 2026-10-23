'use server'

import { revalidatePath } from 'next/cache'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { cargarDestinatariosAviso, enviarLoteAviso, type CorreoAviso } from '@/lib/avisos/perfil-incompleto-envio'

/** Solo administración (no moderación): es un envío a cuentas reales. */
async function administrador(): Promise<{ email: string | null } | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: rol } = await supabase.from('profile_roles').select('role').eq('profile_id', user.id).eq('role', 'admin').maybeSingle()
  return rol ? { email: user.email ?? null } : null
}

/**
 * Dos correos de prueba al administrador: uno como lo recibe una cuenta de
 * «Público general» y otro como lo recibe una persona con perfil profesional
 * (que es la única que ve el punto de las profesiones).
 */
export async function enviarPruebaAviso(): Promise<string> {
  const a = await administrador()
  if (!a) return 'Solo administración.'
  if (!a.email) return 'Tu cuenta no tiene correo.'
  const ok = await enviarLoteAviso([
    { para: a.email, nombre: 'Renee', tipo: 'publico', faltas: ['tipo', 'foto', 'bio'] },
    { para: a.email, nombre: 'Renee', tipo: 'actor', faltas: ['foto', 'profesiones', 'bio'] },
  ])
  return ok ? `Prueba enviada a ${a.email} (2 correos).` : 'No se envió: error de Resend.'
}

/**
 * Envía el aviso a todos los pendientes. `esperados` es el número que el
 * administrador vio en pantalla: si la lista ha cambiado entre medias, no se
 * envía nada. Cada envío correcto queda anotado, así nadie lo recibe dos veces.
 */
export async function enviarAvisoATodos(esperados: number): Promise<{ ok: boolean; texto: string }> {
  if (!(await administrador())) return { ok: false, texto: 'Solo administración.' }
  const servicio = createServiceClient() as unknown as SupabaseClient
  const { pendientes } = await cargarDestinatariosAviso(servicio)
  if (pendientes.length === 0) return { ok: false, texto: 'No queda nadie pendiente.' }
  if (pendientes.length !== esperados) {
    return { ok: false, texto: `La lista ha cambiado (ahora son ${pendientes.length}). Recarga la página y revísala antes de enviar.` }
  }

  let enviados = 0
  let fallidos = 0
  for (let i = 0; i < pendientes.length; i += 100) {
    const lote = pendientes.slice(i, i + 100)
    const correos: CorreoAviso[] = lote.map(d => ({ para: d.email, nombre: d.nombre, tipo: d.tipo_perfil, faltas: d.faltas }))
    if (await enviarLoteAviso(correos)) {
      const { error } = await servicio.from('avisos_perfil_enviados')
        .upsert(lote.map(d => ({ profile_id: d.id, faltas: d.faltas })), { onConflict: 'profile_id' })
      if (error) console.error('avisos: enviado pero no anotado:', error.message)
      enviados += lote.length
    } else {
      fallidos += lote.length
    }
  }
  revalidatePath('/admin/avisos-perfil')
  return fallidos === 0
    ? { ok: true, texto: `Aviso enviado a ${enviados} cuentas.` }
    : { ok: false, texto: `Enviados: ${enviados}. Sin enviar por error de Resend: ${fallidos}. Puedes volver a intentarlo: solo saldrán los que faltan.` }
}
