import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import NuevaObraForm from './NuevaObraForm'
import NavAutenticado from '@/components/NavAutenticado'
import Sidebar from '@/components/design-system/Sidebar'

export const metadata: Metadata = {
  title: 'Nueva obra | ObrasDeTeatro',
}

export default async function NuevaObraPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  return (
    <div style={{ background: 'var(--off)', minHeight: '100vh' }}>
      <NavAutenticado />
      <div className="app-layout">
        <Sidebar />
        <main className="app-main">
          <div className="page-header">
            <div className="page-title-group">
              <h1 className="page-title">Nueva obra</h1>
              <a href="/mis-obras" className="page-back">← Mis obras</a>
            </div>
          </div>
          <NuevaObraForm userId={user.id} />
        </main>
      </div>
    </div>
  )
}
