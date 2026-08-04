import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import NavAutenticado from '@/components/NavAutenticado'
import Sidebar from '@/components/design-system/Sidebar'

// AEC-003 Fase 1: andamiaje. El cambio de correo electrónico llega en la Fase 4.
export default async function CuentaCorreoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  return (
    <div style={{ background: 'var(--off)', minHeight: '100vh' }}>
      <NavAutenticado />
      <div className="app-layout">
        <Sidebar />
        <main className="app-main">
          <Link href="/cuenta" style={{ fontSize: '12px', color: 'var(--muted)', fontFamily: 'var(--sans)', textDecoration: 'none' }}>
            ← Mi cuenta
          </Link>
          <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(22px, 3vw, 28px)', color: 'var(--black)', letterSpacing: '-0.5px', margin: '10px 0 20px' }}>
            Correo electrónico
          </h1>
          <div style={{ background: 'var(--subtle)', border: '1px dashed var(--border)', borderRadius: 'var(--radius)', padding: '16px 20px' }}>
            <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', fontFamily: 'var(--mono)', marginBottom: '4px' }}>
              AEC-003 · Fase 4
            </p>
            <p style={{ fontSize: '13px', color: 'var(--text)', fontFamily: 'var(--sans)' }}>
              El cambio de correo electrónico estará disponible próximamente. Tu correo actual es <strong>{user.email}</strong>.
            </p>
          </div>
        </main>
      </div>
    </div>
  )
}
