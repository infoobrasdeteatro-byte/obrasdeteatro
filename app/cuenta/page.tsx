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

export default async function CuentaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

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

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
            {SECCIONES.map(s => (
              <Link
                key={s.href}
                href={s.href}
                style={{
                  display: 'block',
                  background: 'var(--white)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '20px',
                  textDecoration: 'none',
                }}
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
