'use server'

import { revalidatePath } from 'next/cache'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { PLAZAS_FUNDADORAS, esOficio } from '@/lib/embajadores/textos'
import { telefonoValido, emailValido } from '@/lib/red/contacto'

async function administrador(): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data } = await supabase.from('profile_roles').select('role').eq('profile_id', user.id).eq('role', 'admin').maybeSingle()
  return !!data
}

const servicio = () => createServiceClient() as unknown as SupabaseClient

export async function crearInvitacion(datos: {
  nombre: string; genero: string; oficio: string; telefono: string; email: string; nota: string
}): Promise<{ ok: true; token: string } | { ok: false; error: string }> {
  if (!(await administrador())) return { ok: false, error: 'Solo administración.' }
  const nombre = datos.nombre.trim()
  if (!nombre || nombre.length > 120) return { ok: false, error: 'Escribe el nombre.' }
  if (datos.genero !== 'f' && datos.genero !== 'm') return { ok: false, error: 'Elige si es Embajadora o Embajador.' }
  if (!esOficio(datos.oficio)) return { ok: false, error: 'Elige el oficio.' }
  const telefono = datos.telefono.trim(), email = datos.email.trim(), nota = datos.nota.trim().slice(0, 500)
  if (telefono && !telefonoValido(telefono)) return { ok: false, error: 'Revisa el teléfono (con prefijo, p. ej. +34…).' }
  if (email && !emailValido(email)) return { ok: false, error: 'Revisa el correo.' }

  const s = servicio()
  // Plazas: aceptadas + pendientes sin caducar.
  const { count } = await s.from('embajadores_invitaciones').select('id', { count: 'exact', head: true })
    .or(`estado.eq.aceptada,and(estado.eq.pendiente,caduca_at.gt.${new Date().toISOString()})`)
  if ((count ?? 0) >= PLAZAS_FUNDADORAS) return { ok: false, error: `Ya están ocupadas las ${PLAZAS_FUNDADORAS} plazas (aceptadas o pendientes).` }

  const { data, error } = await s.from('embajadores_invitaciones')
    .insert({ nombre, genero: datos.genero, oficio: datos.oficio, telefono: telefono || null, email: email || null, nota: nota || null })
    .select('token').single()
  if (error || !data) return { ok: false, error: 'No se pudo crear la invitación.' }
  revalidatePath('/admin/embajadores')
  return { ok: true, token: data.token }
}

export async function anularInvitacion(id: string): Promise<{ ok: boolean }> {
  if (!(await administrador())) return { ok: false }
  const { error } = await servicio().from('embajadores_invitaciones').update({ estado: 'anulada' }).eq('id', id).eq('estado', 'pendiente')
  revalidatePath('/admin/embajadores')
  return { ok: !error }
}
