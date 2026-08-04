import { createClient as createServiceClient } from '@supabase/supabase-js'
import { getStripe } from '@/lib/stripe'

/**
 * AEC-003B Fase 3 (DA-005): motor de verificación de solo lectura. Nunca
 * corrige, cancela ni ejecuta nada -- únicamente diagnostica si una
 * identidad reúne las condiciones previas verificables sin intervención
 * humana (reautenticación y consentimiento informado son procedimentales,
 * se verifican en el momento de la confirmación, no aquí).
 */
export interface CondicionPrevia {
  id: 'stripe_suscripcion' | 'stripe_cobros_pendientes' | 'credit_reservations'
  cumple: boolean
  detalle: string
}

export interface DiagnosticoCondicionesPrevias {
  cumpleTodas: boolean
  condiciones: CondicionPrevia[]
}

function serviceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function verificarCondicionesPrevias(profileId: string): Promise<DiagnosticoCondicionesPrevias> {
  const supabase = serviceClient()
  const condiciones: CondicionPrevia[] = []

  // Principio de Integridad Externa (DA-005) -- estado local de la suscripción
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('status, stripe_customer_id')
    .eq('profile_id', profileId)
    .maybeSingle()

  if (!subscription) {
    condiciones.push({ id: 'stripe_suscripcion', cumple: true, detalle: 'Sin suscripción registrada.' })
  } else if (subscription.status === 'canceled') {
    condiciones.push({ id: 'stripe_suscripcion', cumple: true, detalle: 'Suscripción cancelada.' })
  } else {
    condiciones.push({
      id: 'stripe_suscripcion',
      cumple: false,
      detalle: `Suscripción en estado "${subscription.status}" -- debe resolverse antes de continuar.`,
    })
  }

  // Verificación cruzada de solo lectura contra Stripe (fuente externa real),
  // no solo el reflejo local -- fail-closed si Stripe no responde.
  if (subscription?.stripe_customer_id) {
    try {
      const stripeSubs = await getStripe().subscriptions.list({
        customer: subscription.stripe_customer_id,
        status: 'all',
        limit: 10,
      })
      const abiertas = stripeSubs.data.filter(s =>
        ['active', 'trialing', 'past_due', 'unpaid'].includes(s.status)
      )
      condiciones.push(
        abiertas.length === 0
          ? { id: 'stripe_cobros_pendientes', cumple: true, detalle: 'Sin suscripciones abiertas en Stripe.' }
          : {
              id: 'stripe_cobros_pendientes',
              cumple: false,
              detalle: `Stripe reporta ${abiertas.length} suscripción(es) abierta(s): ${abiertas.map(s => s.status).join(', ')}.`,
            }
      )
    } catch {
      condiciones.push({
        id: 'stripe_cobros_pendientes',
        cumple: false,
        detalle: 'No se pudo verificar el estado real en Stripe -- tratado como impedimento por precaución.',
      })
    }
  }

  // credit_reservations -- condición candidata (DA-005), solo se reporta;
  // la decisión final corresponde al Credit Manager, no a esta fase.
  const { count } = await supabase
    .from('credit_reservations')
    .select('id', { count: 'exact', head: true })
    .eq('profile_id', profileId)
    .eq('status', 'active')

  const reservasActivas = count ?? 0
  condiciones.push({
    id: 'credit_reservations',
    cumple: reservasActivas === 0,
    detalle:
      reservasActivas === 0
        ? 'Sin reservas de crédito activas.'
        : `${reservasActivas} reserva(s) de crédito activas -- condición candidata (DA-005), pendiente de decisión del Credit Manager.`,
  })

  return {
    cumpleTodas: condiciones.every(c => c.cumple),
    condiciones,
  }
}
