'use server'

import { revalidatePath } from 'next/cache'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { esTipoFundador, leerCodigoElenco, normalizarCodigoElenco } from '@/lib/elenco/textos'
import { telefonoValido, emailValido } from '@/lib/red/contacto'

async function administrador(): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data } = await supabase.from('profile_roles').select('role').eq('profile_id', user.id).eq('role', 'admin').maybeSingle()
  return !!data
}

const servicio = () => createServiceClient() as unknown as SupabaseClient

/**
 * ¿Está libre este código personal? Para el aviso en vivo del formulario.
 * Devuelve el código ya normalizado (sin tildes, espacios ni signos).
 */
export async function comprobarCodigoElenco(texto: string): Promise<{ codigo: string; libre: boolean; aviso: string }> {
  const codigo = normalizarCodigoElenco(texto)
  if (!(await administrador())) return { codigo, libre: false, aviso: '' }
  if (!leerCodigoElenco(codigo)) {
    return { codigo, libre: false, aviso: codigo.length < 3 ? 'Mínimo 3 letras o números.' : codigo.length > 30 ? 'Máximo 30 caracteres.' : 'Necesita al menos una letra.' }
  }
  const { data } = await servicio().rpc('elenco_codigo_disponible', { p_codigo: codigo })
  const fila = (data as { libre: boolean; motivo: string | null }[] | null)?.[0]
  if (fila?.libre) return { codigo, libre: true, aviso: '' }
  return { codigo, libre: false, aviso: fila?.motivo === 'ocupado' ? 'Ya lo tiene otro fundador: elige otra variante (segundo apellido, ciudad, nombre artístico…).' : 'Ese código no se puede usar.' }
}

export async function crearInvitacionElenco(datos: {
  nombre: string; codigo: string; tipo: string; oficio: string; telefono: string; email: string; nota: string
}): Promise<{ ok: true; numero: number; codigo: string } | { ok: false; error: string }> {
  if (!(await administrador())) return { ok: false, error: 'Solo administración.' }
  const nombre = datos.nombre.trim()
  if (!nombre || nombre.length > 120) return { ok: false, error: 'Escribe el nombre.' }
  if (!esTipoFundador(datos.tipo)) return { ok: false, error: 'Elige si es persona u organización.' }
  const oficio = datos.oficio.trim()
  if (!oficio || oficio.length > 80) return { ok: false, error: 'Indica el oficio o el tipo de organización.' }
  const telefono = datos.telefono.trim(), email = datos.email.trim(), nota = datos.nota.trim().slice(0, 500)
  if (!telefono && !email) return { ok: false, error: 'Indica un teléfono o un correo.' }
  if (telefono && !telefonoValido(telefono)) return { ok: false, error: 'Revisa el teléfono (con prefijo, p. ej. +34…).' }
  if (email && !emailValido(email)) return { ok: false, error: 'Revisa el correo.' }
  const codigo = leerCodigoElenco(datos.codigo || nombre)
  if (!codigo) return { ok: false, error: 'Revisa el código personal: de 3 a 30 letras o números.' }

  const { data, error } = await servicio().rpc('elenco_crear_invitacion', {
    p_nombre: nombre, p_tipo: datos.tipo, p_oficio: oficio, p_telefono: telefono, p_email: email, p_nota: nota, p_codigo: codigo,
  })
  if (error) {
    const m = error.message
    return {
      ok: false,
      error: /sin_plazas/.test(m) ? 'Ya están ocupadas las 100 plazas del Elenco Fundador.'
        : /codigo_ocupado/.test(m) ? `El código «${codigo}» ya lo tiene otro fundador: elige otra variante.`
        : /codigo_no_valido/.test(m) ? 'Revisa el código personal: de 3 a 30 letras o números.'
        : 'No se pudo crear la invitación.',
    }
  }
  const fila = (data as { numero: number; codigo: string }[] | null)?.[0]
  revalidatePath('/admin/elenco')
  return fila ? { ok: true, numero: fila.numero, codigo: fila.codigo } : { ok: false, error: 'No se pudo crear la invitación.' }
}

export async function anularInvitacionElenco(id: string): Promise<{ ok: boolean }> {
  if (!(await administrador())) return { ok: false }
  const { error } = await servicio().from('elenco_fundadores').update({ estado: 'anulada' }).eq('id', id).eq('estado', 'pendiente')
  revalidatePath('/admin/elenco')
  return { ok: !error }
}

/**
 * Aplica semanas de destacado en Cartelera de la recompensa de 25 puntos a un
 * espectáculo de la organización fundadora: una fila de cartelera_destacados
 * por semana (origen «moderacion»), consecutivas desde `desde`.
 */
export async function aplicarSemanasCartelera(datos: {
  fundadorId: string; espectaculoId: string; desde: string; semanas: number
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!(await administrador())) return { ok: false, error: 'Solo administración.' }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datos.desde)) return { ok: false, error: 'Elige la fecha de inicio.' }
  const semanas = Math.floor(datos.semanas)
  if (!(semanas >= 1 && semanas <= 4)) return { ok: false, error: 'Entre 1 y 4 semanas.' }

  const s = servicio()
  const [{ data: f }, { data: recompensas }, { count: usadas }] = await Promise.all([
    s.from('elenco_fundadores').select('aceptada_por').eq('id', datos.fundadorId).eq('estado', 'aceptada').maybeSingle(),
    s.from('elenco_recompensas').select('semanas_cartelera').eq('fundador_id', datos.fundadorId),
    s.from('elenco_cartelera_usos').select('id', { count: 'exact', head: true }).eq('fundador_id', datos.fundadorId),
  ])
  const titular = (f as { aceptada_por: string | null } | null)?.aceptada_por
  if (!titular) return { ok: false, error: 'Fundador no encontrado.' }
  const total = ((recompensas ?? []) as { semanas_cartelera: number }[]).reduce((t, r) => t + r.semanas_cartelera, 0)
  if (semanas > total - (usadas ?? 0)) return { ok: false, error: 'No le quedan tantas semanas.' }

  const { data: esp } = await s.from('espectaculos').select('id').eq('id', datos.espectaculoId).eq('user_id', titular).maybeSingle()
  if (!esp) return { ok: false, error: 'Ese espectáculo no es de esta organización.' }

  const base = new Date(`${datos.desde}T00:00:00Z`)
  const dia = (n: number) => new Date(base.getTime() + n * 86400e3).toISOString().slice(0, 10)
  const filas = Array.from({ length: semanas }, (_, i) => ({
    espectaculo_id: datos.espectaculoId, desde: dia(i * 7), hasta: dia(i * 7 + 6), ambito: 'ciudad', origen: 'moderacion',
  }))
  const { data: creados, error } = await s.from('cartelera_destacados').insert(filas).select('id')
  if (error || !creados) return { ok: false, error: 'No se pudo aplicar el destacado.' }
  const { error: e2 } = await s.from('elenco_cartelera_usos')
    .insert((creados as { id: string }[]).map(c => ({ fundador_id: datos.fundadorId, destacado_id: c.id })))
  if (e2) {
    await s.from('cartelera_destacados').delete().in('id', (creados as { id: string }[]).map(c => c.id))
    return { ok: false, error: 'No se pudo registrar el uso de las semanas.' }
  }
  revalidatePath('/admin/elenco')
  revalidatePath('/cartelera')
  return { ok: true }
}
