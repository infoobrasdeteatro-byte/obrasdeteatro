import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const { userId, plan } = session.metadata as { userId: string; plan: string }
  if (!userId || !plan) return

  const supabase = getServiceClient()
  const now = new Date().toISOString()

  await supabase.from('subscriptions').upsert({
    profile_id: userId,
    stripe_subscription_id: session.subscription as string,
    stripe_customer_id: session.customer as string,
    plan,
    status: 'active',
    current_period_start: now,
    updated_at: now,
  }, { onConflict: 'profile_id' })

  await supabase.from('profiles')
    .update({ plan, is_premium: plan !== 'gratuito', updated_at: now })
    .eq('id', userId)
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const supabase = getServiceClient()
  const now = new Date().toISOString()

  await supabase.from('subscriptions')
    .update({ status: 'canceled', updated_at: now })
    .eq('stripe_subscription_id', subscription.id)

  // Recuperar profile_id para degradar el plan
  const { data } = await supabase
    .from('subscriptions')
    .select('profile_id')
    .eq('stripe_subscription_id', subscription.id)
    .single()

  if (data?.profile_id) {
    await supabase.from('profiles')
      .update({ plan: 'gratuito', is_premium: false, updated_at: now })
      .eq('id', data.profile_id)
  }
}

// Stripe dejó de enviar current_period_start/end en la suscripción a partir de
// la versión de API 2025-03-31 y los envía en cada línea (items.data[i]). La
// versión con la que llegan los webhooks la decide la configuración del
// endpoint en Stripe, no el SDK (fijado a 2025-02-24.acacia, cuyos tipos aún
// los declaran en la suscripción), así que se aceptan los dos formatos. Sin
// fecha en ninguno de los dos sitios se guarda null: una fecha que falta no
// debe tumbar el evento entero con un 500.
type PeriodoStripe = { current_period_start?: number | null; current_period_end?: number | null }

function fechaDePeriodo(subscription: Stripe.Subscription, campo: keyof PeriodoStripe): string | null {
  const enSuscripcion = (subscription as unknown as PeriodoStripe)[campo]
  const enLinea = (subscription.items?.data[0] as unknown as PeriodoStripe | undefined)?.[campo]
  const segundos = enSuscripcion ?? enLinea
  return typeof segundos === 'number' ? new Date(segundos * 1000).toISOString() : null
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const supabase = getServiceClient()

  const priceId = subscription.items.data[0]?.price.id
  const plan =
    priceId === process.env.STRIPE_PRICE_PREMIUM_ID ? 'premium' :
    priceId === process.env.STRIPE_PRICE_DESTACADO_ID ? 'destacado' :
    priceId === process.env.STRIPE_PRICE_EMPRESAS_ID ? 'empresas' :
    null

  const status = subscription.status

  // 1. subscriptions siempre se actualiza, sea cual sea el estado
  const { data: subRow, error: subError } = await supabase
    .from('subscriptions')
    .update({
      status,
      plan: plan ?? undefined, // si no coincide con ningún price conocido, no se pisa
      stripe_price_id: priceId ?? null,
      current_period_start: fechaDePeriodo(subscription, 'current_period_start'),
      current_period_end: fechaDePeriodo(subscription, 'current_period_end'),
      cancel_at_period_end: subscription.cancel_at_period_end,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id)
    .select('profile_id')
    .maybeSingle()

  if (subError) {
    console.error('Error actualizando subscription:', subError)
    throw subError
  }

  if (!subRow) {
    console.warn(`subscription.updated sin fila en subscriptions: ${subscription.id}`)
    return
  }

  // 2. profiles solo se toca en estados que cambian el acceso de forma definitiva.
  //    past_due / incomplete / paused = periodo de gracia: Stripe sigue reintentando
  //    el cobro, así que todavía no se degrada el acceso.
  const grantsAccess = status === 'active' || status === 'trialing'
  const revokesAccess = status === 'canceled' || status === 'unpaid' || status === 'incomplete_expired'

  if (grantsAccess && plan) {
    const { error } = await supabase.from('profiles')
      .update({ plan, is_premium: true })
      .eq('id', subRow.profile_id)
    if (error) {
      console.error('Error sincronizando profile (grant):', error)
      throw error
    }
  } else if (revokesAccess) {
    const { error } = await supabase.from('profiles')
      .update({ plan: 'gratuito', is_premium: false })
      .eq('id', subRow.profile_id)
    if (error) {
      console.error('Error sincronizando profile (revoke):', error)
      throw error
    }
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const supabase = getServiceClient()
  const subscriptionId = typeof invoice.subscription === 'string'
    ? invoice.subscription
    : invoice.subscription?.id

  if (!subscriptionId) return

  await supabase.from('subscriptions')
    .update({ status: 'past_due', updated_at: new Date().toISOString() })
    .eq('stripe_subscription_id', subscriptionId)
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
        break
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice)
        break
      default:
        // Evento no gestionado — se ignora sin error
        break
    }
  } catch (err) {
    console.error(`Error procesando evento ${event.type}:`, err)
    return NextResponse.json({ error: 'Error interno procesando evento' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
