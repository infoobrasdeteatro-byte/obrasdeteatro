import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import type { SupabaseClient } from '@supabase/supabase-js'
import NavAutenticado from '@/components/NavAutenticado'
import Sidebar from '@/components/design-system/Sidebar'
import Envio from './Envio'
import { cargarPendientesConfirmar } from '@/lib/avisos/confirmacion'

export const metadata: Metadata = { title: 'Recordatorio de confirmación | Administración | ObrasDeTeatro', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

const fecha = (iso: string) => new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Atlantic/Canary' })

/** Recordatorio a las cuentas sin confirmar: lista, prueba y envío. Solo administración. */
export default async function RecordatorioConfirmacionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?next=/admin/recordatorio-confirmacion')
  const { data: rol } = await supabase.from('profile_roles').select('role').eq('profile_id', user.id).eq('role', 'admin').maybeSingle()
  if (!rol) {
    return (
      <Marco>
        <div className="page-header"><h1 className="page-title">Acceso restringido</h1></div>
        <div className="obras-empty"><p className="obras-empty-text">Esta página es de administración.</p></div>
      </Marco>
    )
  }

  const { pendientes, yaEnviados } = await cargarPendientesConfirmar(createServiceClient() as unknown as SupabaseClient)

  return (
    <Marco>
      <div className="page-header">
        <div className="page-title-group">
          <h1 className="page-title">Recordatorio de confirmación</h1>
          <span style={{ fontSize: '13px', color: 'var(--muted)' }}>Correo a las cuentas registradas que nunca confirmaron su dirección.</span>
        </div>
      </div>

      <div className="obras-stat-grid">
        <div className="obras-stat-card"><div className="obras-stat-label">Pendientes</div><div className="obras-stat-value obras-stat-value--amber">{pendientes.length}</div></div>
        <div className="obras-stat-card"><div className="obras-stat-label">Ya avisadas</div><div className="obras-stat-value obras-stat-value--green">{yaEnviados}</div></div>
      </div>

      <Envio pendientes={pendientes.length} />

      <section className="account-card">
        <h2 style={{ fontFamily: 'var(--serif)', fontSize: '20px', color: 'var(--black)', marginBottom: '10px' }}>Destinatarios</h2>
        {pendientes.length === 0 ? (
          <p style={{ fontSize: '13px', color: 'var(--muted)' }}>No queda nadie pendiente.</p>
        ) : (
          <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
            <thead><tr style={{ textAlign: 'left', color: 'var(--muted)' }}><th>Nombre</th><th>Correo</th><th>Registro</th></tr></thead>
            <tbody>
              {pendientes.map(p => (
                <tr key={p.id} style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={{ padding: '8px 8px 8px 0' }}>{p.nombre || '—'}</td>
                  <td style={{ paddingRight: '8px', wordBreak: 'break-all' }}>{p.email}</td>
                  <td>{fecha(p.registro)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
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
