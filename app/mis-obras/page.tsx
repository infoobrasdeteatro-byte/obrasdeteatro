import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import MisObrasList from './MisObrasList'
import NavAutenticado from '@/components/NavAutenticado'
import Sidebar from '@/components/design-system/Sidebar'

export const metadata: Metadata = {
  title: 'Mis obras | ObrasDeTeatro',
}

export default async function MisObrasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: obras } = await supabase
    .from('works')
    .select('id, title, author, genre, is_published, created_at, slug')
    .eq('profile_id', user.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  const lista = obras ?? []
  const total = lista.length
  const publicadas = lista.filter(o => o.is_published).length
  const borradores = total - publicadas

  return (
    <div style={{ background: 'var(--off)', minHeight: '100vh' }}>
      <NavAutenticado />
      <div className="app-layout">
        <Sidebar />
        <main className="app-main">

          <div className="page-header">
            <h1 className="page-title">Mis obras</h1>
            <Link href="/obras/nueva" className="ds-btn-primary" style={{ width: 'auto', padding: '10px 20px' }}>
              + Nueva obra
            </Link>
          </div>

          <div className="obras-stat-grid">
            <div className="obras-stat-card">
              <div className="obras-stat-label">Total</div>
              <div className="obras-stat-value">{total}</div>
            </div>
            <div className="obras-stat-card">
              <div className="obras-stat-label">Publicadas</div>
              <div className="obras-stat-value obras-stat-value--green">{publicadas}</div>
            </div>
            <div className="obras-stat-card">
              <div className="obras-stat-label">Borradores</div>
              <div className="obras-stat-value obras-stat-value--amber">{borradores}</div>
            </div>
          </div>

          <MisObrasList obras={lista} />

        </main>
      </div>
    </div>
  )
}
