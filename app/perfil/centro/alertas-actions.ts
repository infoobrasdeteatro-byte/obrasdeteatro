'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { camposDeFormData, validarAlerta } from '@/lib/alertas/formulario'

export type EstadoGuardado = { ok?: string; error?: string }

const PLANES_DE_PAGO = new Set(['premium', 'destacado', 'empresas'])

/**
 * Guarda la alerta de convocatorias del usuario, con SU sesión: la RLS
 * («Alerta propia», con public.plan_de_pago()) es quien decide. La
 * comprobación de plan de aquí solo sirve para dar un mensaje claro.
 *
 * Sin upsert a propósito: el usuario solo tiene permiso de UPDATE sobre
 * activa, paises, categorias y frecuencia, y un upsert también reescribiría
 * profile_id. Se mira si ya existe la fila y se inserta o se actualiza.
 */
export async function guardarAlertas(_previo: EstadoGuardado, formData: FormData): Promise<EstadoGuardado> {
  const campos = camposDeFormData(formData)
  const problema = validarAlerta(campos)
  if (problema) return { error: problema }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Tu sesión ha caducado. Vuelve a iniciar sesión.' }

  const { data: perfil } = await supabase.from('profiles').select('plan').eq('id', user.id).single()
  if (!perfil || !PLANES_DE_PAGO.has(perfil.plan)) {
    return { error: 'Las alertas de convocatorias están disponibles a partir del plan Premium.' }
  }

  const { data: existente, error: errLectura } = await supabase
    .from('alertas_convocatorias')
    .select('profile_id')
    .eq('profile_id', user.id)
    .maybeSingle()
  if (errLectura) return { error: 'No se pudieron leer tus alertas. Inténtalo de nuevo.' }

  const fila = { activa: campos.activa, paises: campos.paises, categorias: campos.categorias, frecuencia: campos.frecuencia }
  const { error } = existente
    ? await supabase.from('alertas_convocatorias').update(fila).eq('profile_id', user.id)
    : await supabase.from('alertas_convocatorias').insert({ profile_id: user.id, ...fila })

  if (error) {
    console.error('perfil/centro: no se pudo guardar la alerta:', error.message)
    return { error: error.message.includes('row-level security')
      ? 'Las alertas de convocatorias están disponibles a partir del plan Premium.'
      : 'No se pudieron guardar tus alertas. Inténtalo de nuevo.' }
  }

  revalidatePath('/perfil/centro')
  return { ok: campos.activa ? 'Alertas guardadas.' : 'Alertas guardadas y desactivadas.' }
}
