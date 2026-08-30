import { createClient } from '@/lib/supabase/server'

/**
 * Plan vigente del usuario -- el nivel de producto que tiene AHORA, no su
 * historial comercial.
 *
 * Vive en `profiles.plan`: columna NOT NULL con DEFAULT 'gratuito', que el
 * webhook de Stripe actualiza al contratar y al cancelar. Es el mismo campo
 * que ya consultan el dashboard, el directorio y las paginas de perfil.
 *
 * Por que NO se deduce de `subscriptions`: esa tabla es el reflejo local de
 * Stripe y solo existe cuando hay una relacion de pago -- su propio CHECK
 * excluye 'gratuito' porque no hay nada que Stripe suscriba en un plan de
 * 0 euros. Deducir el plan de su presencia equivalia a afirmar que quien no
 * paga no tiene plan, cuando en realidad tiene el plan gratuito. Con datos
 * reales eso dejaba sin plan a 34 de 35 perfiles, incluido uno de plan
 * `empresas`, que es el nivel mas alto.
 *
 * Devuelve `null` unicamente si el perfil no existe o la consulta falla:
 * un perfil real siempre tiene plan.
 */
export async function getProfilePlan(userId: string): Promise<string | null> {
  const supabase = await createClient()

  const { data, error } = await supabase.from('profiles').select('plan').eq('id', userId).single()

  if (error || !data) return null

  return data.plan
}
