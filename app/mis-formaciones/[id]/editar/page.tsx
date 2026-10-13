import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import NavAutenticado from '@/components/NavAutenticado'
import Sidebar from '@/components/design-system/Sidebar'
import FormacionForm from '@/components/formacion/FormacionForm'
import { camposDesdeFila } from '@/lib/formacion/formacion'

export const metadata: Metadata = {
  title: 'Editar formación | ObrasDeTeatro',
  robots: { index: false, follow: false },
}

type Props = { params: Promise<{ id: string }> }

export default async function EditarFormacionPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/auth/login?next=/mis-formaciones/${id}/editar`)

  const { data: f } = await supabase
    .from('formaciones')
    .select('*')
    .eq('id', id)
    .eq('profile_id', user.id)
    .maybeSingle()
  if (!f) notFound()

  return (
    <div style={{ background: 'var(--off)', minHeight: '100vh' }}>
      <NavAutenticado />
      <div className="app-layout">
        <Sidebar />
        <main className="app-main">
          <div className="page-header">
            <div className="page-title-group">
              <h1 className="page-title">Editar formación</h1>
              <Link href="/mis-formaciones" className="page-back">← Mis formaciones</Link>
            </div>
          </div>
          {f.estado === 'retirado' ? (
            <div className="obras-empty">
              <p className="obras-empty-text">
                El equipo de ObrasDeTeatro ha retirado esta formación y ya no se puede editar.
                Escríbenos a hola@obrasdeteatro.com si crees que es un error.
              </p>
            </div>
          ) : (
            <FormacionForm profileId={user.id} inicial={camposDesdeFila(f)}
              formacion={{ id: f.id, estado: f.estado, slug: f.slug }} />
          )}
        </main>
      </div>
    </div>
  )
}
