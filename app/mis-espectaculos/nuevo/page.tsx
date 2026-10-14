import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import NavAutenticado from '@/components/NavAutenticado'
import Sidebar from '@/components/design-system/Sidebar'
import EspectaculoForm from '@/components/cartelera/EspectaculoForm'

export const metadata: Metadata = {
  title: 'Nuevo espectáculo | ObrasDeTeatro',
  robots: { index: false, follow: false },
}

export default async function NuevoEspectaculoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?next=/mis-espectaculos/nuevo')

  return (
    <div style={{ background: 'var(--off)', minHeight: '100vh' }}>
      <NavAutenticado />
      <div className="app-layout">
        <Sidebar />
        <main className="app-main">
          <div className="page-header">
            <div className="page-title-group">
              <h1 className="page-title">Nuevo espectáculo</h1>
              <Link href="/mis-espectaculos" className="page-back">← Mis espectáculos</Link>
            </div>
          </div>
          <EspectaculoForm userId={user.id} />
        </main>
      </div>
    </div>
  )
}
