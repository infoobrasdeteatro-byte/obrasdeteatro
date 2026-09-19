// Crea la configuración del portal de cliente de Stripe que usa
// app/api/stripe/portal/route.ts, y muestra su id para ponerlo en
// STRIPE_PORTAL_CONFIGURATION_ID.
//
// Uso (modo test):
//   node --env-file=.env.local scripts/stripe/crear-configuracion-portal.mjs
//
// Se niega a ejecutarse con una clave live salvo que se pase --live, para que
// el paso a producción sea siempre una decisión explícita.
//
// Qué puede hacer el usuario en el portal:
//   - Cancelar la suscripción, AL FINAL DEL PERIODO ya pagado (sin prorrateo
//     ni reembolso automático), indicando opcionalmente el motivo. Stripe
//     emite customer.subscription.updated (cancel_at_period_end = true) al
//     cancelar y customer.subscription.deleted al terminar el periodo; el
//     webhook ya gestiona los dos.
//   - Cambiar o añadir el método de pago.
//   - Ver y descargar el historial de facturas.
// Qué NO puede hacer:
//   - Cambiar de plan (subscription_update): sube y baja de plan siguen
//     pasando por /precios y Stripe Checkout.
//   - Editar su email, dirección o datos fiscales (customer_update): el email
//     de la cuenta se gestiona en /cuenta/correo.

import Stripe from 'stripe'

const clave = process.env.STRIPE_SECRET_KEY
const appUrl = process.env.PORTAL_APP_URL ?? 'https://www.obrasdeteatro.com'

if (!clave) {
  console.error('Falta STRIPE_SECRET_KEY (¿has pasado --env-file=.env.local?)')
  process.exit(1)
}
if (clave.startsWith('sk_live_') && !process.argv.includes('--live')) {
  console.error('STRIPE_SECRET_KEY es una clave LIVE. Si de verdad quieres crear la configuración en producción, repite con --live.')
  process.exit(1)
}

const stripe = new Stripe(clave)

const configuracion = await stripe.billingPortal.configurations.create({
  business_profile: {
    headline: 'ObrasDeTeatro® — gestiona tu suscripción',
    privacy_policy_url: `${appUrl}/legal/privacidad`,
    terms_of_service_url: `${appUrl}/legal/suscripciones`,
  },
  default_return_url: `${appUrl}/cuenta`,
  features: {
    subscription_cancel: {
      enabled: true,
      mode: 'at_period_end',
      proration_behavior: 'none',
      cancellation_reason: {
        enabled: true,
        options: ['too_expensive', 'missing_features', 'switched_service', 'unused', 'other'],
      },
    },
    payment_method_update: { enabled: true },
    invoice_history: { enabled: true },
    subscription_update: { enabled: false },
    customer_update: { enabled: false },
  },
  metadata: { origen: 'scripts/stripe/crear-configuracion-portal.mjs' },
})

console.log(`Configuración creada (${configuracion.livemode ? 'LIVE' : 'test'}): ${configuracion.id}`)
console.log(`Pon en el entorno: STRIPE_PORTAL_CONFIGURATION_ID=${configuracion.id}`)
