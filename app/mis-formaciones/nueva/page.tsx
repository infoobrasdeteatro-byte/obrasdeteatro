import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import NavAutenticado from '@/components/NavAutenticado'
import Sidebar from '@/components/design-system/Sidebar'
import FormacionForm from '@/components/formacion/FormacionForm'
import { permisoFormacion } from '@/lib/formacion/permisos'
import AvisoPermiso from '../AvisoPermiso'

export const metadata: Metadata = {
  title: 'Nueva formación | ObrasDeTeatro',
  robots: { index: false, follow: false },
}

export default async function NuevaFormacionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?next=/mis-formaciones/nueva')

  const { data: perfil } = await supabase.from('profiles').select('tipo_perfil, plan').eq('id', user.id).single()
  const permiso = permisoFormacion(perfil?.tipo_perfil, perfil?.plan)

  return (
    <div style={{ background: 'var(--off)', minHeight: '100vh' }}>
      <NavAutenticado />
      <div className="app-layout">
        <Sidebar />
        <main className="app-main">
          <div className="page-header">
            <div className="page-title-group">
              <h1 className="page-title">Nueva formación</h1>
              <Link href="/mis-formaciones" className="page-back">← Mis formaciones</Link>
            </div>
          </div>
          <AvisoPermiso permiso={permiso} />
          {permiso === 'puede' && <FormacionForm profileId={user.id} />}
        </main>
      </div>
    </div>
  )
}
