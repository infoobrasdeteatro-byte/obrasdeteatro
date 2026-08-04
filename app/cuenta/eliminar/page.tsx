import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import NavAutenticado from '@/components/NavAutenticado'
import Sidebar from '@/components/design-system/Sidebar'
import EliminarCuentaForm from './EliminarCuentaForm'

// AEC-003B Fase 2: transición reversible (DA-004). Sin anonimización, sin
// evento atómico, sin comprobaciones de DA-005 -- se incorporan en fases posteriores.
export default async function CuentaEliminarPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('extincion_solicitada_at')
    .eq('id', user.id)
    .single()

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
            Eliminar cuenta
          </h1>
          <EliminarCuentaForm extincionSolicitadaAt={profile?.extincion_solicitada_at ?? null} />
        </main>
      </div>
    </div>
  )
}
