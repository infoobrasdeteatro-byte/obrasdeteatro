import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import type { Metadata } from 'next'
import EditarObraForm from './EditarObraForm'
import NavAutenticado from '@/components/NavAutenticado'
import Sidebar from '@/components/design-system/Sidebar'

export const metadata: Metadata = {
  title: 'Editar obra | ObrasDeTeatro',
}

type Props = { params: Promise<{ slug: string }> }

export default async function EditarObraPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: obra } = await supabase
    .from('works')
    .select('*')
    .eq('slug', slug)
    .eq('profile_id', user.id)
    .is('deleted_at', null)
    .single()

  if (!obra) notFound()

  return (
    <div style={{ background: 'var(--off)', minHeight: '100vh' }}>
      <NavAutenticado />
      <div className="app-layout">
        <Sidebar />
        <main className="app-main">
          <div className="page-header">
            <div className="page-title-group">
              <h1 className="page-title">Editar obra</h1>
              <a href="/mis-obras" className="page-back">← Mis obras</a>
            </div>
          </div>
          <EditarObraForm obra={obra} />
        </main>
      </div>
    </div>
  )
}
