import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import NavAutenticado from '@/components/NavAutenticado'
import Sidebar from '@/components/design-system/Sidebar'

// AEC-003 Fase 1: andamiaje. La gestión de sesiones llega en la Fase 3.
export default async function CuentaSesionesPage() {
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
            Sesiones
          </h1>
          <div style={{ background: 'var(--subtle)', border: '1px dashed var(--border)', borderRadius: 'var(--radius)', padding: '16px 20px' }}>
            <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', fontFamily: 'var(--mono)', marginBottom: '4px' }}>
              AEC-003 · Fase 3
            </p>
            <p style={{ fontSize: '13px', color: 'var(--text)', fontFamily: 'var(--sans)' }}>
              El cierre de todas las sesiones estará disponible próximamente. Para cerrar la sesión actual, usa &ldquo;Cerrar sesión&rdquo; en el menú.
            </p>
          </div>
        </main>
      </div>
    </div>
  )
}
