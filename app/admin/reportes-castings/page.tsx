import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import NavAutenticado from '@/components/NavAutenticado'
import Sidebar from '@/components/design-system/Sidebar'
import ColaReportes, { type ReportePendiente } from './ColaReportes'
import { leerCursor, escribirCursor } from '@/components/castings/cursor'

export const metadata: Metadata = {
  title: 'Reportes de castings | ObrasDeTeatro',
  robots: { index: false, follow: false },
}

const TAMANO_PAGINA = 20

type Props = { searchParams: Promise<{ cursor?: string }> }

/**
 * Cola de reportes de usuarios. Ruta de administración, mismo prefijo y mismo
 * guard que /admin/castings: sin enlace en ninguna navegación, se llega por URL.
 *
 * Los datos llegan por public.cola_reportes(), que comprueba es_moderador() en
 * su propio cuerpo. El guard de esta página no es la seguridad -- es la cortesía
 * de explicar por qué no se ve nada; quien no modera recibiría cero filas
 * aunque se saltara la pantalla.
 *
 * Orden ASCENDENTE, al revés que las bandejas: aquí importa lo que lleva más
 * tiempo esperando, no lo último que ha llegado.
 */
export default async function ReportesCastingsPage({ searchParams }: Props) {
  const { cursor } = await searchParams
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: roles } = await supabase
    .from('profile_roles')
    .select('role')
    .eq('profile_id', user.id)
    .in('role', ['admin', 'moderator'])

  if ((roles ?? []).length === 0) {
    return (
      <Marco>
        <div className="page-header">
          <h1 className="page-title">Acceso restringido</h1>
        </div>
        <div className="obras-empty">
          <p className="obras-empty-text">
            Esta página es del equipo de moderación. Tu cuenta no tiene el rol
            <strong style={{ color: 'var(--text)' }}> admin </strong>ni
            <strong style={{ color: 'var(--text)' }}> moderator</strong>.
          </p>
          <Link href="/dashboard" className="ds-btn-secondary"
            style={{ width: 'auto', display: 'inline-flex', padding: '10px 24px' }}>
            Volver al inicio
          </Link>
        </div>
      </Marco>
    )
  }

  const c = leerCursor(cursor)

  const { data: pagina, error } = await supabase.rpc('cola_reportes', {
    p_cursor_created_at: c?.appliedAt,
    p_cursor_id: c?.id,
    p_limite: TAMANO_PAGINA + 1,
  })

  const filas = pagina ?? []
  const haySiguiente = filas.length > TAMANO_PAGINA
  const visibles = haySiguiente ? filas.slice(0, TAMANO_PAGINA) : filas
  const ultima = visibles[visibles.length - 1]

  const reportes: ReportePendiente[] = visibles.map(r => ({
    id: r.id,
    castingId: r.casting_id,
    motivo: r.motivo,
    creadoEn: r.created_at,
    reportante: r.reportante,
    castingTitulo: r.casting_titulo,
    castingEstado: r.casting_estado,
    organizador: r.organizador,
  }))

  const siguienteHref = haySiguiente && ultima?.created_at
    ? `?cursor=${escribirCursor(ultima.created_at, ultima.id)}`
    : null

  return (
    <Marco>
      <div className="page-header">
        <div className="page-title-group">
          <h1 className="page-title">Reportes de castings</h1>
          <span style={{ fontSize: '13px', color: 'var(--muted)' }}>
            Denuncias de usuarios pendientes de resolver, de la más antigua a la más reciente.
          </span>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <Link href="/admin/castings" className="table-link">Cola de moderación →</Link>
          <span className="status-pill status-pill--draft"
            style={{ fontFamily: 'var(--mono)', fontSize: '10px', letterSpacing: '0.04em' }}>
            ADMINISTRACIÓN
          </span>
        </div>
      </div>

      {error && (
        <div className="ds-alert-error" style={{ marginBottom: '16px' }}>
          No se pudieron cargar los reportes: {error.message}
        </div>
      )}

      <ColaReportes reportes={reportes} />

      {siguienteHref && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
          <Link href={siguienteHref} className="ds-btn-secondary" style={{ padding: '10px 24px' }}>
            Ver más recientes →
          </Link>
        </div>
      )}

      {cursor && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '12px' }}>
          <Link href="/admin/reportes-castings" className="table-link">Volver al principio</Link>
        </div>
      )}
    </Marco>
  )
}

function Marco({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--off)', minHeight: '100vh' }}>
      <NavAutenticado />
      <div className="app-layout">
        <Sidebar />
        <main className="app-main">{children}</main>
      </div>
    </div>
  )
}
