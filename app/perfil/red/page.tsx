import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import NavAutenticado from '@/components/NavAutenticado'
import Sidebar from '@/components/design-system/Sidebar'
import VistaRed, { type Fila, type FilaConexion, type FilaSeguimiento } from './VistaRed'

export const metadata: Metadata = {
  title: 'Mi red | ObrasDeTeatro',
  robots: { index: false, follow: false },
}

/**
 * Mi red: contadores, conexiones (Fase 2), seguidores y seguidos, y las
 * solicitudes de teléfono y WhatsApp (Fase 1). Todo solo para el titular.
 */
export default async function MiRedPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?next=/perfil/red')

  const [{ data }, { data: conexiones }, { data: seguimientos }] = await Promise.all([
    supabase.rpc('mis_solicitudes_contacto'),
    supabase.rpc('mis_conexiones'),
    supabase.rpc('mis_seguimientos'),
  ])

  return (
    <div style={{ background: 'var(--off)', minHeight: '100vh' }}>
      <NavAutenticado />
      <div className="app-layout">
        <Sidebar />
        <main className="app-main">
          <VistaRed filas={(data ?? []) as Fila[]} conexiones={(conexiones ?? []) as FilaConexion[]} seguimientos={(seguimientos ?? []) as FilaSeguimiento[]} />
        </main>
      </div>
    </div>
  )
}
