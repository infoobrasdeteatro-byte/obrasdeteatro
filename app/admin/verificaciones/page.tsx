import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import NavAutenticado from '@/components/NavAutenticado'
import Sidebar from '@/components/design-system/Sidebar'
import { TIPOS_ENLACE } from '@/lib/perfiles/verificacion'
import ResolverVerificacion from './ResolverVerificacion'

export const metadata: Metadata = {
  title: 'Verificaciones profesionales | ObrasDeTeatro',
  robots: { index: false, follow: false },
}

/**
 * Cola de verificaciones profesionales (sello «✓ Verificado»). Se comprueba
 * el rol con la sesión; los datos del perfil se leen con la clave de servicio
 * porque el solicitante puede no tener aún la ficha pública. Aprobar o
 * rechazar pasa por resolver_verificacion(), que vuelve a exigir el rol.
 */
export default async function VerificacionesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: roles } = await supabase.from('profile_roles').select('role').eq('profile_id', user.id).in('role', ['admin', 'moderator'])

  const Marco = ({ children }: { children: React.ReactNode }) => (
    <div style={{ background: 'var(--off)', minHeight: '100vh' }}>
      <NavAutenticado />
      <div className="app-layout">
        <Sidebar />
        <main className="app-main">{children}</main>
      </div>
    </div>
  )

  if (!roles?.length) {
    return (
      <Marco>
        <div className="page-header"><h1 className="page-title">Acceso restringido</h1></div>
        <div className="obras-empty"><p className="obras-empty-text">Esta página es del equipo de moderación.</p></div>
      </Marco>
    )
  }

  const servicio = createServiceClient()
  const { data: filas } = await servicio
    .from('verificaciones_profesionales')
    .select('id, profile_id, tipo_enlace, enlace, codigo, codigo_detectado, created_at')
    .eq('estado', 'pendiente')
    .order('created_at', { ascending: true })

  const ids = [...new Set((filas ?? []).map(f => f.profile_id))]
  const { data: perfiles } = ids.length
    ? await servicio.from('profiles').select('id, nombre, nombre_artistico, slug, plan, avatar_url').in('id', ids)
    : { data: [] }
  const porId = new Map((perfiles ?? []).map(p => [p.id, p]))

  return (
    <Marco>
      <div className="page-header">
        <div className="page-title-group">
          <h1 className="page-title">Verificaciones profesionales</h1>
          <span style={{ fontSize: '13px', color: 'var(--muted)' }}>
            Abre el enlace y comprueba que el código aparece en la biografía o en la web y que corresponde a la persona u organización del perfil.
          </span>
        </div>
      </div>

      {(filas ?? []).length === 0 ? (
        <div className="obras-empty"><p className="obras-empty-text">No hay solicitudes pendientes.</p></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {(filas ?? []).map(f => {
            const p = porId.get(f.profile_id)
            const nombre = p?.nombre_artistico || p?.nombre || 'Perfil sin nombre'
            const tipo = TIPOS_ENLACE.find(t => t.value === f.tipo_enlace)?.label ?? f.tipo_enlace
            return (
              <div key={f.id} className="account-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                  <strong style={{ fontSize: '15px' }}>
                    {p?.slug ? <Link href={`/perfil/${p.slug}`} target="_blank">{nombre}</Link> : nombre}
                  </strong>
                  <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
                    {new Date(f.created_at).toLocaleDateString('es-ES')} · plan {p?.plan ?? '—'}
                  </span>
                </div>
                <p style={{ fontSize: '14px', margin: 0 }}>
                  {tipo}: <a href={f.enlace} target="_blank" rel="noopener noreferrer nofollow">{f.enlace}</a>
                </p>
                <p style={{ fontSize: '13px', margin: 0, color: 'var(--muted)' }}>
                  Código: <code>{f.codigo}</code> · Comprobación automática:{' '}
                  {f.codigo_detectado === true ? <strong style={{ color: '#166534' }}>código encontrado</strong>
                    : f.codigo_detectado === false ? <strong style={{ color: 'var(--red)' }}>no encontrado</strong>
                    : 'no se pudo comprobar (revísalo a mano)'}
                </p>
                <ResolverVerificacion id={f.id} />
              </div>
            )
          })}
        </div>
      )}
    </Marco>
  )
}
