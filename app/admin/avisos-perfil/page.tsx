import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import type { SupabaseClient } from '@supabase/supabase-js'
import NavAutenticado from '@/components/NavAutenticado'
import Sidebar from '@/components/design-system/Sidebar'
import EnvioAviso from './EnvioAviso'
import { cargarDestinatariosAviso } from '@/lib/avisos/perfil-incompleto-envio'
import { textoFalta } from '@/lib/avisos/perfil-incompleto'

export const metadata: Metadata = { title: 'Aviso de perfil incompleto | Administración | ObrasDeTeatro', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

const TIPO: Record<string, string> = {
  publico: 'Público general', profesional: 'Profesional', actor: 'Actor / Actriz', director: 'Director/a',
  dramaturgo: 'Dramaturgo/a', compania: 'Compañía', productora: 'Productora', teatro: 'Teatro / Sala',
  festival: 'Festival', escuela: 'Escuela', institucion: 'Institución',
}

/** Aviso «completa tu perfil»: quién lo recibe, qué le falta, prueba y envío. Solo administración. */
export default async function AvisosPerfilPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?next=/admin/avisos-perfil')
  const { data: rol } = await supabase.from('profile_roles').select('role').eq('profile_id', user.id).eq('role', 'admin').maybeSingle()
  if (!rol) {
    return (
      <Marco>
        <div className="page-header"><h1 className="page-title">Acceso restringido</h1></div>
        <div className="obras-empty"><p className="obras-empty-text">Esta página es de administración.</p></div>
      </Marco>
    )
  }

  const { pendientes, yaEnviados, sinVerificar } = await cargarDestinatariosAviso(createServiceClient() as unknown as SupabaseClient)

  return (
    <Marco>
      <div className="page-header">
        <div className="page-title-group">
          <h1 className="page-title">Aviso de perfil incompleto</h1>
          <span style={{ fontSize: '13px', color: 'var(--muted)' }}>Correo a las cuentas verificadas con el perfil a medias. Cada persona recibe solo lo que le falta.</span>
        </div>
      </div>

      <div className="obras-stat-grid">
        <div className="obras-stat-card"><div className="obras-stat-label">Pendientes</div><div className="obras-stat-value obras-stat-value--amber">{pendientes.length}</div></div>
        <div className="obras-stat-card"><div className="obras-stat-label">Ya avisadas</div><div className="obras-stat-value obras-stat-value--green">{yaEnviados}</div></div>
        <div className="obras-stat-card"><div className="obras-stat-label">Sin verificar (no se envía)</div><div className="obras-stat-value">{sinVerificar}</div></div>
      </div>

      <EnvioAviso pendientes={pendientes.length} />

      <section className="account-card">
        <h2 style={{ fontFamily: 'var(--serif)', fontSize: '20px', color: 'var(--black)', marginBottom: '10px' }}>Destinatarios</h2>
        {pendientes.length === 0 ? (
          <p style={{ fontSize: '13px', color: 'var(--muted)' }}>No queda nadie pendiente.</p>
        ) : (
          <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
            <thead><tr style={{ textAlign: 'left', color: 'var(--muted)' }}><th>Nombre</th><th>Correo</th><th>Tipo</th><th>Le falta</th></tr></thead>
            <tbody>
              {pendientes.map(d => (
                <tr key={d.id} style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={{ padding: '8px 8px 8px 0' }}>{d.nombre || '—'}</td>
                  <td style={{ paddingRight: '8px', wordBreak: 'break-all' }}>{d.email}</td>
                  <td style={{ paddingRight: '8px' }}>{TIPO[d.tipo_perfil] ?? d.tipo_perfil}</td>
                  <td>{d.faltas.map(f => textoFalta(f, d.tipo_perfil)[0].replace(/\.$/, '')).join(' · ')}</td>
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
