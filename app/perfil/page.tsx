import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import PerfilForm from './PerfilForm'
import NavAutenticado from '@/components/NavAutenticado'
import Sidebar from '@/components/design-system/Sidebar'

export default async function PerfilPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, nombre, apellidos, nombre_artistico, bio, pais, ciudad, country_code, region, postal_code, tipo_perfil, perfil_publico, slug')
    .eq('id', user.id)
    .single()

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
        </main>
      </div>
    </div>
  )
}
