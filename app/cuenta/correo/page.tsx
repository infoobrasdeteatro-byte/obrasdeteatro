import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import NavAutenticado from '@/components/NavAutenticado'
import Sidebar from '@/components/design-system/Sidebar'
import CorreoForm from './CorreoForm'

// AEC-003 Fase 4 (DA-002): cambio de correo electrónico.
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
          <Suspense fallback={null}>
            <CorreoForm emailActual={user.email ?? ''} />
          </Suspense>
        </main>
      </div>
    </div>
  )
}
