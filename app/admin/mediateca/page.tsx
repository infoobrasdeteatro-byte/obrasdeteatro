import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import NavAutenticado from '@/components/NavAutenticado'
import Sidebar from '@/components/design-system/Sidebar'
import GestionMediateca, { type EpisodioAdmin, type ProgramaAdmin } from './GestionMediateca'

export const metadata: Metadata = {
  title: 'Mediateca | Administración | ObrasDeTeatro',
  robots: { index: false, follow: false },
}

/**
 * Mediateca: alta de programas (podcasts y canales), importación y retirada
 * de episodios. Mismo guard y marco que el resto de /admin; la seguridad la
 * ponen las políticas «Moderación gestiona programas/episodios».
 */
export default async function AdminMediatecaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?next=/admin/mediateca')

  const { data: roles } = await supabase.from('profile_roles').select('role').eq('profile_id', user.id).in('role', ['admin', 'moderator'])
  if ((roles ?? []).length === 0) {
    return (
      <Marco>
        <div className="page-header"><h1 className="page-title">Acceso restringido</h1></div>
        <div className="obras-empty">
          <p className="obras-empty-text">Esta página es del equipo de moderación: tu cuenta no tiene el rol admin ni moderator.</p>
          <Link href="/dashboard" className="ds-btn-secondary" style={{ width: 'auto', display: 'inline-flex', padding: '10px 24px' }}>Volver al inicio</Link>
        </div>
      </Marco>
    )
  }

  const [{ data: programas, error }, { data: episodios }, { data: colaboradores }] = await Promise.all([
    supabase.from('mediateca_programas')
      .select('id, slug, nombre, descripcion, pais_code, url_web, imagen_url, colaborador_id, youtube_channel_id, filtro_titulo, rss_url, spotify_url, activo, orden, ultima_importacion_at, ultimo_error')
      .order('orden', { ascending: true }),
    supabase.from('mediateca_episodios')
      .select('id, slug, titulo, fecha_publicacion, estado, motivo_retirada, programa_id, youtube_video_id, audio_url')
      .order('fecha_publicacion', { ascending: false }).limit(1000),
    supabase.from('colaboradores').select('id, nombre').order('nombre'),
  ])

  return (
    <Marco>
      <div className="page-header">
        <div className="page-title-group">
          <h1 className="page-title">Mediateca</h1>
          <span style={{ fontSize: '13px', color: 'var(--muted)' }}>
            Podcasts y canales de vídeo. Los episodios llegan solos cada día; aquí se dan de alta programas y se retiran episodios.
          </span>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <Link href="/mediateca" className="table-link">Ver la página pública →</Link>
          <Link href="/admin/colaboradores" className="table-link">Colaboradores →</Link>
          <Link href="/admin/boletin" className="table-link">Boletín →</Link>
          <span className="status-pill status-pill--draft" style={{ fontFamily: 'var(--mono)', fontSize: '10px', letterSpacing: '0.04em' }}>ADMINISTRACIÓN</span>
        </div>
      </div>

      {error && <div className="ds-alert-error" style={{ marginBottom: '20px' }}>No se pudieron leer los programas: {error.message}</div>}

      <GestionMediateca
        programas={(programas ?? []) as ProgramaAdmin[]}
        episodios={(episodios ?? []) as EpisodioAdmin[]}
        colaboradores={colaboradores ?? []}
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
