import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import NavAutenticado from '@/components/NavAutenticado'
import Sidebar from '@/components/design-system/Sidebar'
import VistaRed, { type Fila } from './VistaRed'

export const metadata: Metadata = {
  title: 'Mi red | ObrasDeTeatro',
  robots: { index: false, follow: false },
}

/**
 * Mi red · Fase 1: solicitudes de contacto recibidas (aceptar / rechazar /
 * retirar acceso) y enviadas (con el contacto que te han compartido).
 */
export default async function MiRedPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?next=/perfil/red')

  const { data } = await supabase.rpc('mis_solicitudes_contacto')

  return (
    <div style={{ background: 'var(--off)', minHeight: '100vh' }}>
      <NavAutenticado />
      <div className="app-layout">
        <Sidebar />
        <main className="app-main">
          <VistaRed filas={(data ?? []) as Fila[]} />
        </main>
      </div>
    </div>
  )
}
