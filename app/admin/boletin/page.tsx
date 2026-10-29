import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import NavAutenticado from '@/components/NavAutenticado'
import Sidebar from '@/components/design-system/Sidebar'
import GestionBoletin from './GestionBoletin'
import type { ConfigBoletin } from '@/lib/boletin/boletin'

export const metadata: Metadata = { title: 'Boletín | Administración | ObrasDeTeatro', robots: { index: false, follow: false } }

/** Ajustes, cifras y envíos del boletín. Mismo guard y marco que el resto de /admin. */
export default async function AdminBoletinPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?next=/admin/boletin')
  const { data: roles } = await supabase.from('profile_roles').select('role').eq('profile_id', user.id).in('role', ['admin', 'moderator'])
  if ((roles ?? []).length === 0) {
    return (
      <Marco>
        <div className="page-header"><h1 className="page-title">Acceso restringido</h1></div>
        <div className="obras-empty"><p className="obras-empty-text">Esta página es del equipo de moderación.</p></div>
      </Marco>
    )
  }

  const contar = (estado: string) => supabase.from('boletin_suscriptores').select('id', { count: 'exact', head: true }).eq('estado', estado)
  const [{ data: config }, conf, pend, baja, { data: envios }] = await Promise.all([
    supabase.from('boletin_config').select('nombre, activo, acceso, dia_envio').maybeSingle(),
    contar('confirmado'), contar('pendiente'), contar('baja'),
    supabase.from('boletin_envios').select('id, enviado_at, destinatarios, errores, noticias, convocatorias, formaciones, episodios, es_prueba')
      .order('enviado_at', { ascending: false }).limit(20),
  ])

  return (
    <Marco>
      <div className="page-header">
        <div className="page-title-group">
          <h1 className="page-title">Boletín</h1>
          <span style={{ fontSize: '13px', color: 'var(--muted)' }}>El boletín semanal por correo: se arma solo con lo publicado en la semana.</span>
        </div>
        <div className="admin-header-actions">
          <Link href="/admin" className="table-link">← Master Control</Link>
          <Link href="/boletin" className="table-link">Ver la página pública →</Link>
          <span className="status-pill status-pill--draft" style={{ fontFamily: 'var(--mono)', fontSize: '10px', letterSpacing: '0.04em' }}>ADMINISTRACIÓN</span>
        </div>
      </div>

      <div className="obras-stat-grid">
        <div className="obras-stat-card"><div className="obras-stat-label">Suscriptores</div><div className="obras-stat-value obras-stat-value--green">{conf.count ?? 0}</div></div>
        <div className="obras-stat-card"><div className="obras-stat-label">Sin confirmar</div><div className="obras-stat-value obras-stat-value--amber">{pend.count ?? 0}</div></div>
        <div className="obras-stat-card"><div className="obras-stat-label">Bajas</div><div className="obras-stat-value">{baja.count ?? 0}</div></div>
      </div>

      {config && <GestionBoletin inicial={config as ConfigBoletin} />}

      <section className="account-card">
        <h2 style={{ fontFamily: 'var(--serif)', fontSize: '20px', color: 'var(--black)', marginBottom: '10px' }}>Envíos</h2>
        {(envios ?? []).length === 0 ? (
          <p style={{ fontSize: '13px', color: 'var(--muted)' }}>Todavía no se ha enviado ningún boletín.</p>
        ) : (
          <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
            <thead><tr style={{ textAlign: 'left', color: 'var(--muted)' }}><th>Fecha</th><th>Tipo</th><th>Enviados</th><th>Errores</th><th>Contenido</th></tr></thead>
            <tbody>
              {(envios ?? []).map(e => (
                <tr key={e.id} style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={{ padding: '8px 0' }}>{new Date(e.enviado_at).toLocaleString('es-ES', { timeZone: 'Atlantic/Canary' })}</td>
                  <td>{e.es_prueba ? 'Prueba' : 'Semanal'}</td>
                  <td>{e.destinatarios}</td>
                  <td>{e.errores}</td>
                  <td>{e.noticias} noticias · {e.convocatorias} convocatorias · {e.formaciones} formaciones · {e.episodios} episodios</td>
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
