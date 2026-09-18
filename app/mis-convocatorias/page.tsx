import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import NavAutenticado from '@/components/NavAutenticado'
import Sidebar from '@/components/design-system/Sidebar'
import MisConvocatoriasList, { type ConvocatoriaPropia } from './MisConvocatoriasList'

export const metadata: Metadata = {
  title: 'Mis convocatorias | ObrasDeTeatro',
  robots: { index: false, follow: false },
}

/**
 * Panel del organizador de convocatorias.
 *
 * El cupo que se enseña arriba es el ÚNICO límite del módulo, y solo afecta al
 * plan gratuito: 3 publicadas por mes natural. No es una tabla de límites en
 * el cliente como la de /mis-castings -- que además no coincide con
 * lib/plans.ts -- sino la cifra que devuelve la propia base con
 * mis_convocatorias_publicadas_en_mes(), la misma que usa
 * cupo_mensual_convocatorias_agotado() para decidir.
 */
export default async function MisConvocatoriasPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: perfil } = await supabase
    .from('profiles')
    .select('plan')
    .eq('id', user.id)
    .single()

  const plan = perfil?.plan ?? 'gratuito'

  // El filtro por profile_id es explícito aunque la RLS ya limite: la política
  // «Convocatorias públicas» deja ver las publicadas de cualquiera, y esta
  // pantalla es la de las propias.
  const { data: convocatorias } = await supabase
    .from('calls')
    .select('id, title, category, location, deadline, estado, is_featured, fecha_publicacion, motivo_filtro, motivo_rechazo, created_at')
    .eq('profile_id', user.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  const lista: ConvocatoriaPropia[] = convocatorias ?? []

  const publicadas = lista.filter(c => c.estado === 'publicado').length
  const enRevision = lista.filter(c => c.estado === 'pendiente_revision').length

  // La cifra del cupo la da la base (calls_publicaciones): cuenta las
  // primeras publicaciones del mes natural aunque después se hayan cerrado,
  // cancelado o borrado, que no aparecen como 'publicado' en `lista`.
  const { data: publicadasEsteMesRpc } = await supabase.rpc('mis_convocatorias_publicadas_en_mes')
  const publicadasEsteMes = publicadasEsteMesRpc ?? 0

  const limiteMensual = plan === 'gratuito' ? 3 : null
  const cupoAgotado = limiteMensual !== null && publicadasEsteMes >= limiteMensual

  return (
    <div style={{ background: 'var(--off)', minHeight: '100vh' }}>
      <NavAutenticado />
      <div className="app-layout">
        <Sidebar />
        <main className="app-main">

          <div className="page-header">
            <div className="page-title-group">
              <h1 className="page-title">Mis convocatorias</h1>
              <span style={{ fontSize: '13px', color: 'var(--muted)' }}>
                Tus convocatorias y el estado real de cada una.
              </span>
            </div>
            <Link href="/convocatoria/nueva" className="ds-btn-primary"
              style={{ width: 'auto', padding: '10px 20px', fontSize: '13px' }}>
              + Nueva convocatoria
            </Link>
          </div>

          <div className="obras-stat-grid">
            <div className="obras-stat-card">
              <div className="obras-stat-label">Total</div>
              <div className="obras-stat-value">{lista.length}</div>
            </div>
            <div className="obras-stat-card">
              <div className="obras-stat-label">Publicadas</div>
              <div className="obras-stat-value obras-stat-value--green">{publicadas}</div>
            </div>
            <div className="obras-stat-card">
              <div className="obras-stat-label">En revisión</div>
              <div className="obras-stat-value obras-stat-value--amber">{enRevision}</div>
            </div>
            <div className="obras-stat-card">
              <div className="obras-stat-label">Publicadas este mes</div>
              <div className="obras-stat-value">
                {publicadasEsteMes}
                {limiteMensual !== null && (
                  <span style={{ fontSize: '16px', color: 'var(--muted)' }}> / {limiteMensual}</span>
                )}
              </div>
            </div>
          </div>

          {cupoAgotado && (
            <div className="ds-status-banner ds-status-banner--draft" style={{ marginBottom: '20px' }}>
              <div>
                <div className="ds-status-title">Has agotado tu cupo de este mes</div>
                <div className="ds-status-hint">
                  El plan Gratuito permite 3 convocatorias publicadas por mes natural. Puedes seguir
                  escribiendo borradores; se podrán publicar el mes que viene, o antes con un plan superior.
                </div>
              </div>
              <Link href="/precios" className="ds-btn-secondary"
                style={{ padding: '8px 16px', fontSize: '13px', flex: 'none' }}>
                Ver planes
              </Link>
            </div>
          )}

          <MisConvocatoriasList convocatorias={lista} />

        </main>
      </div>
    </div>
  )
}
