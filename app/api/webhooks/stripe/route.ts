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
    .update({ status: 'cancelled', updated_at: now })
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
