import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import NavAutenticado from '@/components/NavAutenticado'
import Sidebar from '@/components/design-system/Sidebar'
import GestionColaboradores, { type ColaboradorAdmin, type FuenteOpcion } from './GestionColaboradores'

export const metadata: Metadata = {
  title: 'Colaboradores | Administración | ObrasDeTeatro',
  robots: { index: false, follow: false },
}

/**
 * Gestión de colaboradores. Mismo patrón que /admin/convocatorias: sin enlace
 * en la navegación, se llega por URL; el guard de rol solo explica por qué
 * no ve nada quien no modera. La seguridad la ponen la política «Moderación
 * gestiona colaboradores» y las de Storage del bucket «colaboradores».
 *
 * Todo viaja con la sesión del moderador, nunca con la clave de servicio.
 */
export default async function AdminColaboradoresPage() {
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
        <div className="page-header"><h1 className="page-title">Acceso restringido</h1></div>
        <div className="obras-empty">
          <p className="obras-empty-text">Esta página es del equipo de moderación: tu cuenta no tiene el rol admin ni moderator.</p>
          <Link href="/dashboard" className="ds-btn-secondary" style={{ width: 'auto', display: 'inline-flex', padding: '10px 24px' }}>
            Volver al inicio
          </Link>
        </div>
      </Marco>
    )
  }

  const [{ data: colaboradores, error }, { data: fuentes }] = await Promise.all([
    supabase
      .from('colaboradores')
      .select('id, nombre, tipo, descripcion, pais_code, url_web, logo_url, orden, activo, desde, noticias_fuente_id')
      .order('orden', { ascending: true })
      .order('nombre', { ascending: true }),
    supabase.from('noticias_fuentes').select('id, nombre, dominio').order('nombre', { ascending: true }),
  ])

  return (
    <Marco>
      <div className="page-header">
        <div className="page-title-group">
          <h1 className="page-title">Colaboradores</h1>
          <span style={{ fontSize: '13px', color: 'var(--muted)' }}>
            Medios, instituciones y patrocinadores. Nada se muestra en la web hasta activarlo.
          </span>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <Link href="/colaboradores" className="table-link">Ver la página pública →</Link>
          <span className="status-pill status-pill--draft" style={{ fontFamily: 'var(--mono)', fontSize: '10px', letterSpacing: '0.04em' }}>
            ADMINISTRACIÓN
          </span>
        </div>
      </div>

      {error && (
        <div className="ds-alert-error" style={{ marginBottom: '20px' }}>
          No se pudieron leer los colaboradores: {error.message}
        </div>
      )}

      <GestionColaboradores
        inicial={(colaboradores ?? []) as ColaboradorAdmin[]}
        fuentes={(fuentes ?? []) as FuenteOpcion[]}
      />
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
