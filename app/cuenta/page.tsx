import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import NavAutenticado from '@/components/NavAutenticado'
import Sidebar from '@/components/design-system/Sidebar'

/**
 * AEC-003 Fase 1: área de cuenta -- andamiaje. Cada tarjeta enlaza a su
 * subsección; el contenido real de cada una llega en su propia fase
 * (2: seguridad, 3: sesiones, 4: correo, 5: eliminar cuenta).
 */
const SECCIONES = [
  { href: '/cuenta/seguridad', titulo: 'Seguridad', desc: 'Cambia tu contraseña.' },
  { href: '/cuenta/sesiones', titulo: 'Sesiones', desc: 'Gestiona dónde tienes la sesión iniciada.' },
  { href: '/cuenta/correo', titulo: 'Correo electrónico', desc: 'Cambia la dirección asociada a tu cuenta.' },
  { href: '/cuenta/eliminar', titulo: 'Eliminar cuenta', desc: 'Solicita la eliminación de tu cuenta.' },
]

const TARJETA = {
  display: 'block',
  background: 'var(--white)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-lg)',
  padding: '20px',
  textDecoration: 'none',
} as const

const AVISOS_PORTAL: Record<string, string> = {
  sin_suscripcion: 'No encontramos ninguna suscripción de pago asociada a tu cuenta.',
  error: 'No se pudo abrir la gestión de la suscripción. Inténtalo de nuevo en unos minutos.',
}

type Props = { searchParams: Promise<{ portal?: string }> }

export default async function CuentaPage({ searchParams }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Portal de cliente de Stripe (app/api/stripe/portal): solo si está activado
  // y el usuario tiene cliente en Stripe, que es lo único que el portal necesita.
  const portalActivo = process.env.STRIPE_PORTAL_ENABLED === 'true'
  let tieneClienteStripe = false
  if (portalActivo) {
    const { data: suscripcion } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('profile_id', user.id)
      .maybeSingle()
    tieneClienteStripe = Boolean(suscripcion?.stripe_customer_id)
  }

  const { portal } = await searchParams
  const avisoPortal = portal ? AVISOS_PORTAL[portal] : undefined

  return (
    <div style={{ background: 'var(--off)', minHeight: '100vh' }}>
      <NavAutenticado />
      <div className="app-layout">
        <Sidebar />
        <main className="app-main">
          <div style={{ marginBottom: '20px' }}>
            <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', fontFamily: 'var(--sans)', marginBottom: '4px' }}>
              Mi cuenta
            </p>
            <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(22px, 3vw, 28px)', color: 'var(--black)', letterSpacing: '-0.5px', lineHeight: 1.1 }}>
              Gestión de cuenta
            </h1>
          </div>

          {avisoPortal && (
            <p className="auth-message auth-message--error" style={{ marginBottom: '16px' }}>{avisoPortal}</p>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
            {portalActivo && tieneClienteStripe && (
              <form action="/api/stripe/portal" method="POST" style={{ margin: 0 }}>
                <button
                  type="submit"
                  style={{ ...TARJETA, width: '100%', height: '100%', textAlign: 'left', cursor: 'pointer', font: 'inherit' }}
                >
                  <h2 style={{ fontFamily: 'var(--serif)', fontSize: '17px', color: 'var(--black)', letterSpacing: '-0.3px', marginBottom: '6px' }}>
                    Suscripción y facturación
                  </h2>
                  <p style={{ fontSize: '13px', color: 'var(--muted)', fontFamily: 'var(--sans)', lineHeight: 1.5 }}>
                    Cambia tu método de pago, descarga tus facturas o cancela tu suscripción.
                  </p>
                </button>
              </form>
            )}
            {SECCIONES.map(s => (
              <Link
                key={s.href}
                href={s.href}
                style={TARJETA}
              >
                <h2 style={{ fontFamily: 'var(--serif)', fontSize: '17px', color: 'var(--black)', letterSpacing: '-0.3px', marginBottom: '6px' }}>
                  {s.titulo}
                </h2>
                <p style={{ fontSize: '13px', color: 'var(--muted)', fontFamily: 'var(--sans)', lineHeight: 1.5 }}>
                  {s.desc}
                </p>
              </Link>
            ))}
          </div>
        </main>
      </div>
    </div>
  )
}
