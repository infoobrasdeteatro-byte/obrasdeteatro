import type { SupabaseClient } from '@supabase/supabase-js'

const RANGO: Record<string, number> = { gratuito: 0, premium: 1, destacado: 2, empresas: 3 }

/** El plan más alto de los dos (nunca baja a nadie). */
export function planMayor(a: string, b: string | null | undefined): string {
  if (!b) return a
  return (RANGO[b] ?? 0) > (RANGO[a] ?? 0) ? b : a
}

/**
 * Embajadores de Escena: el plan que debe quedar en el perfil cuando Stripe
 * concede o retira una suscripción. Si la persona tiene una membresía de
 * cortesía activa, nunca baja de ese plan (ni al cancelar el pago ni al
 * contratar un plan inferior).
 */
export async function planConCortesia(supabase: SupabaseClient, profileId: string, planPagado: string): Promise<string> {
  const { data } = await supabase
    .from('membresias_cortesia')
    .select('plan')
    .eq('profile_id', profileId)
    .gt('hasta', new Date().toISOString())
    .is('renunciada_at', null)
    .maybeSingle()
  return planMayor(planPagado, (data as { plan: string } | null)?.plan)
}
