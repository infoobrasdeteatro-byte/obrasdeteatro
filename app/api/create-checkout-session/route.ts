import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'

/**
 * Crea la sesión de Stripe Checkout para suscribirse a un plan.
 *
 * El usuario y su email salen SIEMPRE de la sesión autenticada en el
 * servidor, nunca del cuerpo de la petición. Antes se leían del cuerpo: se
 * podía pagar poniendo el `userId` de otra persona, y el webhook
 * (checkout.session.completed, que guarda la suscripción por profile_id)
 * sustituía la suscripción de esa persona por la del que pagaba. Del cuerpo
 * solo se lee `plan`; si llegan `userId` o `email`, se ignoran.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { plan } = await req.json()

    if (!plan) {
      return NextResponse.json({ error: 'Faltan parámetros requeridos' }, { status: 400 })
    }

    const PLANES: Record<string, string | undefined> = {
      premium:   process.env.STRIPE_PRICE_PREMIUM_ID,
      destacado: process.env.STRIPE_PRICE_DESTACADO_ID,
      empresas:  process.env.STRIPE_PRICE_EMPRESAS_ID,
    }

    const priceId = PLANES[plan]
    if (!priceId) {
      return NextResponse.json({ error: 'Plan no válido' }, { status: 400 })
    }

    const session = await getStripe().checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: { userId: user.id, plan },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/precios?cancelled=true`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('Error creando sesión de checkout:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
