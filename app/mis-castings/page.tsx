import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import NavAutenticado from '@/components/NavAutenticado'
import Sidebar from '@/components/design-system/Sidebar'
import MisCastingsList from './MisCastingsList'

export const metadata: Metadata = {
  title: 'Mis castings | ObrasDeTeatro',
  robots: { index: false, follow: false },
}

const LIMITES_POR_PLAN: Record<string, number | null> = {
  gratuito: 0,
  premium: 3,
  destacado: 10,
  empresas: null,
}

export default async function MisCastingsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: perfil } = await supabase
    .from('profiles')
    .select('plan')
    .eq('id', user.id)
    .single()

  const plan = perfil?.plan ?? 'gratuito'

  // El filtro por user_id es explícito aunque la RLS ya limite: "Castings
  // públicos" deja ver los publicados de cualquiera, y esta pantalla es la de
  // los propios.
  const { data: castings } = await supabase
    .from('castings')
    .select('id, titulo, nombre_proyecto, estado, fecha_apertura, fecha_cierre, created_at, motivo_filtro, motivo_rechazo')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const lista = castings ?? []
  const publicados = lista.filter(c => c.estado === 'publicado').length
  const enRevision = lista.filter(c => c.estado === 'pendiente_revision').length
  const limite = LIMITES_POR_PLAN[plan] ?? null

  return (
    <div style={{ background: 'var(--off)', minHeight: '100vh' }}>
      <NavAutenticado />
      <div className="app-layout">
        <Sidebar />
        <main className="app-main">

          <div className="page-header">
            <div className="page-title-group">
              <h1 className="page-title">Mis castings</h1>
              <span style={{ fontSize: '13px', color: 'var(--muted)' }}>
                Tus castings y el estado real de cada uno.
              </span>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              {plan !== 'gratuito' && (
                <Link href="/castings/nuevo" className="ds-btn-primary"
                  style={{ width: 'auto', padding: '10px 20px', fontSize: '13px' }}>
                  + Nuevo casting
                </Link>
              )}
            </div>
          </div>

          <div className="obras-stat-grid">
            <div className="obras-stat-card">
              <div className="obras-stat-label">Total</div>
              <div className="obras-stat-value">{lista.length}</div>
            </div>
            <div className="obras-stat-card">
              <div className="obras-stat-label">Publicadas</div>
              <div className="obras-stat-value obras-stat-value--green">
                {publicados}{limite !== null && <span style={{ fontSize: '16px', color: 'var(--muted)' }}> / {limite}</span>}
              </div>
            </div>
            <div className="obras-stat-card">
              <div className="obras-stat-label">En revisión</div>
              <div className="obras-stat-value obras-stat-value--amber">{enRevision}</div>
            </div>
          </div>

          {plan === 'gratuito' && (
            <div className="ds-status-banner ds-status-banner--draft" style={{ marginBottom: '20px' }}>
              <div>
                <div className="ds-status-title">Tu plan no incluye la publicación de castings</div>
                <div className="ds-status-hint">
                  Puedes seguir viendo los que ya tengas, pero no crear nuevos.
                </div>
              </div>
              <Link href="/precios" className="ds-btn-secondary"
                style={{ padding: '8px 16px', fontSize: '13px', flex: 'none' }}>
                Ver planes
              </Link>
            </div>
          )}

          <MisCastingsList castings={lista} />

        </main>
      </div>
    </div>
  )
}
