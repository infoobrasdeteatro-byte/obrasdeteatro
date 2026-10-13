'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { camposDeFormData, validarAlerta } from '@/lib/alertas/formulario'

export type EstadoGuardado = { ok?: string; error?: string }

const PLANES_DE_PAGO = new Set(['premium', 'destacado', 'empresas'])

/**
 * Guarda las alertas de convocatorias y de castings del usuario, con SU sesión: la RLS
 * («Alerta propia», con public.plan_de_pago()) es quien decide. La
 * comprobación de plan de aquí solo sirve para dar un mensaje claro.
 *
 * Sin upsert a propósito: el usuario solo tiene permiso de UPDATE sobre
 * las columnas de filtros (no sobre profile_id ni ultimo_envio_at), y un upsert también reescribiría
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
    return { error: 'Las alertas están disponibles a partir del plan Premium.' }
  }

  // Las disciplinas viven en casting_categorias (ampliable sin migración): se comprueba aquí que existan.
  if (campos.castings_disciplinas.length > 0) {
    const { data: validas } = await supabase.from('casting_categorias').select('id').in('id', campos.castings_disciplinas)
    if ((validas ?? []).length !== campos.castings_disciplinas.length) return { error: 'Hay una disciplina desconocida.' }
  }

  const { data: existente, error: errLectura } = await supabase
    .from('alertas_convocatorias')
    .select('profile_id')
    .eq('profile_id', user.id)
    .maybeSingle()
  if (errLectura) return { error: 'No se pudieron leer tus alertas. Inténtalo de nuevo.' }

  const fila = {
    activa: campos.activa, paises: campos.paises, categorias: campos.categorias, frecuencia: campos.frecuencia,
    castings_activa: campos.castings_activa, castings_paises: campos.castings_paises, castings_disciplinas: campos.castings_disciplinas,
    castings_edad: campos.castings_edad, castings_genero: campos.castings_genero, castings_solo_remunerados: campos.castings_solo_remunerados,
  }
  const { error } = existente
    ? await supabase.from('alertas_convocatorias').update(fila).eq('profile_id', user.id)
    : await supabase.from('alertas_convocatorias').insert({ profile_id: user.id, ...fila })

  if (error) {
    console.error('perfil/centro: no se pudo guardar la alerta:', error.message)
    return { error: error.message.includes('row-level security')
      ? 'Las alertas están disponibles a partir del plan Premium.'
      : 'No se pudieron guardar tus alertas. Inténtalo de nuevo.' }
  }

  revalidatePath('/perfil/centro')
  return { ok: campos.activa || campos.castings_activa ? 'Alertas guardadas.' : 'Alertas guardadas y desactivadas.' }
}
