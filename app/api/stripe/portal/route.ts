import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe'

/**
 * Abre el portal de cliente de Stripe para el usuario autenticado: cambiar
 * el método de pago, ver sus facturas y cancelar la suscripción sin tener
 * que eliminar la cuenta.
 *
 * Se llama desde un <form method="POST"> en /cuenta y responde con una
 * redirección 303, así que el botón funciona sin JavaScript en el cliente.
 *
 * INTERRUPTOR: solo funciona con STRIPE_PORTAL_ENABLED=true. Mientras no se
 * active, el endpoint responde 404 y /cuenta no enseña el botón. Así el paso
 * a producción es una decisión explícita (activar la variable en Vercel), no
 * una consecuencia de fusionar este código.
 *
 * Qué puede hacer el usuario dentro del portal NO se decide aquí sino en la
 * configuración del portal (scripts/stripe/crear-configuracion-portal.mjs),
 * cuyo id se pasa con STRIPE_PORTAL_CONFIGURATION_ID. Sin esa variable,
 * Stripe usa la configuración por defecto guardada en su Dashboard.
 *
 * La cancelación desde el portal llega a la base por el webhook ya existente
 * (customer.subscription.updated y, al final del periodo,
 * customer.subscription.deleted): este endpoint no toca ni `subscriptions`
 * ni `profiles`.
 */
export async function POST() {
  if (process.env.STRIPE_PORTAL_ENABLED !== 'true') {
    return NextResponse.json({ error: 'No disponible' }, { status: 404 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/auth/login', appUrl), 303)
  }

  // El customer de Stripe sale de la fila del propio usuario (política
  // "Suscripcion propia - lectura"), nunca de la petición: así nadie puede
  // abrir el portal de otra persona.
  const { data: suscripcion } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('profile_id', user.id)
    .maybeSingle()

  if (!suscripcion?.stripe_customer_id) {
    return NextResponse.redirect(new URL('/cuenta?portal=sin_suscripcion', appUrl), 303)
  }

  try {
    const configuration = process.env.STRIPE_PORTAL_CONFIGURATION_ID
    const session = await getStripe().billingPortal.sessions.create({
      customer: suscripcion.stripe_customer_id,
      return_url: new URL('/cuenta', appUrl).toString(),
      ...(configuration ? { configuration } : {}),
    })
    return NextResponse.redirect(session.url, 303)
  } catch (err) {
    console.error('[stripe/portal] No se pudo crear la sesión del portal', { profileId: user.id, err })
    return NextResponse.redirect(new URL('/cuenta?portal=error', appUrl), 303)
  }
}
