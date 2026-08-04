import { createClient as createServiceClient } from '@supabase/supabase-js'
import { getStripe } from '@/lib/stripe'

/**
 * AEC-003B Fase 5 (DA-005, Principio de Integridad Externa): cancelación
 * real de la suscripción de Stripe asociada a una cuenta. Verificable
 * (devuelve el resultado exacto de la operación), auditable (registro
 * estructurado en el log del servidor) e idempotente (comprueba el estado
 * real en Stripe antes de actuar -- una segunda invocación tras una
 * cancelación ya realizada, o tras un fallo de comunicación posterior a una
 * cancelación real, nunca reintenta cancelar dos veces: solo completa la
 * sincronización local pendiente).
 *
 * No forma parte todavía de ningún flujo accesible por el usuario -- se
 * invoca únicamente como función de librería, para no completar la cadena
 * hacia el Evento Arquitectónico Atómico antes de que esa fase esté
 * autorizada.
 */
export type AccionCancelacionStripe =
  | 'cancelada_ahora'
  | 'ya_estaba_cancelada'
  | 'sin_suscripcion'
  | 'error'

export interface ResultadoCancelacionStripe {
  ok: boolean
  accion: AccionCancelacionStripe
  detalle: string
}

function serviceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

async function sincronizarLocal(
  supabase: ReturnType<typeof serviceClient>,
  profileId: string,
  stripeSubscriptionId: string
): Promise<void> {
  const now = new Date().toISOString()
  await supabase
    .from('subscriptions')
    .update({ status: 'canceled', updated_at: now })
    .eq('stripe_subscription_id', stripeSubscriptionId)
  await supabase
    .from('profiles')
    .update({ plan: 'gratuito', is_premium: false, updated_at: now })
    .eq('id', profileId)
}

export async function cancelarSuscripcionStripe(profileId: string): Promise<ResultadoCancelacionStripe> {
  const supabase = serviceClient()

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('stripe_subscription_id')
    .eq('profile_id', profileId)
    .maybeSingle()

  if (!subscription?.stripe_subscription_id) {
    return {
      ok: true,
      accion: 'sin_suscripcion',
      detalle: 'No hay ninguna suscripción de Stripe asociada a esta cuenta.',
    }
  }

  const stripeSubscriptionId = subscription.stripe_subscription_id
  const stripe = getStripe()

  // Comprobación de idempotencia: el estado real en Stripe, no el reflejo local.
  let estadoActual: string
  try {
    const remota = await stripe.subscriptions.retrieve(stripeSubscriptionId)
    estadoActual = remota.status
  } catch (err) {
    console.error('[AEC-003B Fase 5] Error consultando la suscripción en Stripe', { profileId, stripeSubscriptionId, err })
    return { ok: false, accion: 'error', detalle: 'No se pudo consultar el estado de la suscripción en Stripe.' }
  }

  if (estadoActual === 'canceled') {
    await sincronizarLocal(supabase, profileId, stripeSubscriptionId)
    console.log('[AEC-003B Fase 5] Suscripción ya estaba cancelada en Stripe; estado local sincronizado', { profileId, stripeSubscriptionId })
    return {
      ok: true,
      accion: 'ya_estaba_cancelada',
      detalle: 'La suscripción ya estaba cancelada en Stripe. Estado local sincronizado.',
    }
  }

  try {
    await stripe.subscriptions.cancel(stripeSubscriptionId)
  } catch (err) {
    console.error('[AEC-003B Fase 5] Error cancelando la suscripción en Stripe', { profileId, stripeSubscriptionId, err })
    return { ok: false, accion: 'error', detalle: 'No se pudo cancelar la suscripción en Stripe.' }
  }

  await sincronizarLocal(supabase, profileId, stripeSubscriptionId)
  console.log('[AEC-003B Fase 5] Suscripción cancelada en Stripe; estado local sincronizado', { profileId, stripeSubscriptionId })
  return {
    ok: true,
    accion: 'cancelada_ahora',
    detalle: 'Suscripción cancelada correctamente en Stripe. Estado local sincronizado.',
  }
}
