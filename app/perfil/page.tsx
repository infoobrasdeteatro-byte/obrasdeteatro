import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import PerfilForm from './PerfilForm'
import DirectorProSection from './DirectorProSection'
import NavAutenticado from '@/components/NavAutenticado'
import Sidebar from '@/components/design-system/Sidebar'

export default async function PerfilPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, nombre, apellidos, nombre_artistico, bio, pais, ciudad, country_code, region, postal_code, tipo_perfil, perfil_publico, slug, avatar_url')
    .eq('id', user.id)
    .single()

  let perfilDirector: { id: string; biografia: string | null; trayectoria: string | null; formacion: string | null } | null = null

  if (profile?.tipo_perfil === 'director') {
    const { data } = await supabase
      .from('perfil_director')
      .select('id, biografia, trayectoria, formacion')
      .eq('user_id', user.id)
      .maybeSingle()
    perfilDirector = data
  }

  const perfilPublicoUrl = profile?.slug && profile.perfil_publico
    ? `/perfil/${profile.slug}`
    : null

  return (
    <div style={{ background: 'var(--off)', minHeight: '100vh' }}>
      <NavAutenticado />
      <div className="app-layout">
        <Sidebar />
        <main className="app-main">
          <div className="page-header">
            <div className="page-title-group">
              <h1 className="page-title">Mi perfil</h1>
            </div>
            {perfilPublicoUrl && (
              <Link href={perfilPublicoUrl} className="ds-btn-secondary" style={{ width: 'auto', padding: '9px 18px', fontSize: '13px' }}>
                Ver perfil público →
              </Link>
            )}
          </div>
          <PerfilForm profile={profile} />
          {profile?.tipo_perfil === 'director' && (
            <DirectorProSection profileId={profile.id} initialData={perfilDirector} />
          )}
        </main>
      </div>
    </div>
  )
}
