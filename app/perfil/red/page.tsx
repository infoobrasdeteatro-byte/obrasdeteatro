import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import NavAutenticado from '@/components/NavAutenticado'
import Sidebar from '@/components/design-system/Sidebar'
import VistaRed, { type Fila, type FilaConexion, type FilaSeguimiento } from './VistaRed'
import TuElenco, { type DatosElenco } from '@/components/elenco/TuElenco'

export const metadata: Metadata = {
  title: 'Mi red | ObrasDeTeatro',
  robots: { index: false, follow: false },
}

/**
 * Mi red: contadores, conexiones (Fase 2), seguidores y seguidos, y las
 * solicitudes de teléfono y WhatsApp (Fase 1) y, si es fundador, el bloque
 * «Tu elenco». Todo solo para el titular.
 */
export default async function MiRedPage({ searchParams }: { searchParams: Promise<{ elenco?: string }> }) {
  const { elenco: bienvenidaElenco } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?next=/perfil/red')

  const [{ data }, { data: conexiones }, { data: seguimientos }, { data: elencoDb }, { data: yo }] = await Promise.all([
    supabase.rpc('mis_solicitudes_contacto'),
    supabase.rpc('mis_conexiones'),
    supabase.rpc('mis_seguimientos'),
    // Elenco Fundador: bloque «Tu elenco» (vacío si no es fundador).
    supabase.rpc('mi_elenco'),
    supabase.from('profiles').select('nombre, nombre_artistico').eq('id', user.id).maybeSingle(),
  ])
  const elenco = (elencoDb?.[0] ?? null) as DatosElenco | null
  const nombre = yo?.nombre_artistico?.trim() || yo?.nombre?.trim() || ''

  return (
    <div style={{ background: 'var(--off)', minHeight: '100vh' }}>
      <NavAutenticado />
      <div className="app-layout">
        <Sidebar />
        <main className="app-main">
          {elenco && <TuElenco datos={elenco} nombre={nombre} bienvenida={bienvenidaElenco === '1'} />}
          <VistaRed filas={(data ?? []) as Fila[]} conexiones={(conexiones ?? []) as FilaConexion[]} seguimientos={(seguimientos ?? []) as FilaSeguimiento[]} />
        </main>
      </div>
    </div>
  )
}
