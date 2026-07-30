import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import NavAutenticado from '@/components/NavAutenticado'
import Sidebar from '@/components/design-system/Sidebar'
import ScenaiaClient from './ScenaiaClient'

export default async function ScenaiaPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  return (
    <div style={{ background: 'var(--off)', minHeight: '100vh' }}>
      <NavAutenticado />
      <div className="app-layout">
        <Sidebar />
        <main className="app-main">
          <div style={{ marginBottom: '14px' }}>
            <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', fontFamily: 'var(--sans)', marginBottom: '4px' }}>
              Módulo VI · Centro Profesional
            </p>
            <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(20px, 2.6vw, 26px)', color: 'var(--black)', letterSpacing: '-0.5px', lineHeight: 1.1, marginBottom: '4px' }}>
              ScenaIA
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--muted)', fontFamily: 'var(--sans)' }}>
              Interpretación basada en la evidencia actualmente disponible en ScenaIA — no representa todavía tu trayectoria profesional completa.
            </p>
          </div>

          <ScenaiaClient />
        </main>
      </div>
    </div>
  )
}
