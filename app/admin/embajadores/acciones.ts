'use server'

import { revalidatePath } from 'next/cache'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { PLAZAS_FUNDADORAS, esOficio } from '@/lib/embajadores/textos'
import { formaCodigoPersonal, normalizarCodigoPersonal } from '@/lib/codigo-personal'
import { telefonoValido, emailValido } from '@/lib/red/contacto'

async function administrador(): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data } = await supabase.from('profile_roles').select('role').eq('profile_id', user.id).eq('role', 'admin').maybeSingle()
  return !!data
}

const servicio = () => createServiceClient() as unknown as SupabaseClient

/** ¿Está libre este código personal? Para el aviso en vivo del formulario. */
export async function comprobarCodigoEmbajador(texto: string): Promise<{ codigo: string; libre: boolean; aviso: string }> {
  const codigo = normalizarCodigoPersonal(texto)
  if (!(await administrador())) return { codigo, libre: false, aviso: '' }
  if (!formaCodigoPersonal(codigo)) {
    return { codigo, libre: false, aviso: codigo.length < 3 ? 'Mínimo 3 letras o números.' : codigo.length > 30 ? 'Máximo 30 caracteres.' : 'Necesita al menos una letra.' }
  }
  const { data } = await servicio().rpc('embajadores_codigo_disponible', { p_codigo: codigo })
  const fila = (data as { libre: boolean; motivo: string | null }[] | null)?.[0]
  if (fila?.libre) return { codigo, libre: true, aviso: '' }
  return { codigo, libre: false, aviso: fila?.motivo === 'ocupado' ? 'Ya lo tiene otro embajador: elige otra variante (segundo apellido, ciudad, nombre artístico…).' : 'Ese código no se puede usar.' }
}

export async function crearInvitacion(datos: {
  nombre: string; codigo: string; genero: string; oficio: string; telefono: string; email: string; nota: string
}): Promise<{ ok: true; token: string; codigo: string } | { ok: false; error: string }> {
  if (!(await administrador())) return { ok: false, error: 'Solo administración.' }
  const nombre = datos.nombre.trim()
  if (!nombre || nombre.length > 120) return { ok: false, error: 'Escribe el nombre.' }
  if (datos.genero !== 'f' && datos.genero !== 'm') return { ok: false, error: 'Elige si es Embajadora o Embajador.' }
  if (!esOficio(datos.oficio)) return { ok: false, error: 'Elige el oficio.' }
  const telefono = datos.telefono.trim(), email = datos.email.trim(), nota = datos.nota.trim().slice(0, 500)
  if (telefono && !telefonoValido(telefono)) return { ok: false, error: 'Revisa el teléfono (con prefijo, p. ej. +34…).' }
  if (email && !emailValido(email)) return { ok: false, error: 'Revisa el correo.' }
  const codigo = normalizarCodigoPersonal(datos.codigo || nombre)
  if (!formaCodigoPersonal(codigo)) return { ok: false, error: 'Revisa el código personal: de 3 a 30 letras o números.' }

  const s = servicio()
  // Plazas: aceptadas + pendientes sin caducar.
  const { count } = await s.from('embajadores_invitaciones').select('id', { count: 'exact', head: true })
    .or(`estado.eq.aceptada,and(estado.eq.pendiente,caduca_at.gt.${new Date().toISOString()})`)
  if ((count ?? 0) >= PLAZAS_FUNDADORAS) return { ok: false, error: `Ya están ocupadas las ${PLAZAS_FUNDADORAS} plazas (aceptadas o pendientes).` }

  const { data: disponible } = await s.rpc('embajadores_codigo_disponible', { p_codigo: codigo })
  if (!(disponible as { libre: boolean }[] | null)?.[0]?.libre) {
    return { ok: false, error: `El código «${codigo}» ya lo tiene otro embajador: elige otra variante.` }
  }

  const { data, error } = await s.from('embajadores_invitaciones')
    .insert({ nombre, codigo, genero: datos.genero, oficio: datos.oficio, telefono: telefono || null, email: email || null, nota: nota || null })
    .select('token, codigo').single()
  if (error || !data) {
    return { ok: false, error: error?.code === '23505' ? `El código «${codigo}» ya lo tiene otro embajador: elige otra variante.` : 'No se pudo crear la invitación.' }
  }
  revalidatePath('/admin/embajadores')
  return { ok: true, token: data.token, codigo: data.codigo }
}

export async function anularInvitacion(id: string): Promise<{ ok: boolean }> {
  if (!(await administrador())) return { ok: false }
  const { error } = await servicio().from('embajadores_invitaciones').update({ estado: 'anulada' }).eq('id', id).eq('estado', 'pendiente')
  revalidatePath('/admin/embajadores')
  return { ok: !error }
}
