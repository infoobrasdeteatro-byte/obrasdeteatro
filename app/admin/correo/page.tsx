import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import type { SupabaseClient } from '@supabase/supabase-js'
import NavAutenticado from '@/components/NavAutenticado'
import Sidebar from '@/components/design-system/Sidebar'
import { leerAcceso } from '@/lib/admin/acceso'
import { leerFiltros } from '@/lib/correo/presentacion'
import { Bandeja, Detalle, POR_PAGINA } from './Vistas'

export const metadata: Metadata = {
  title: 'Correo entrante | Administración | ObrasDeTeatro',
  robots: { index: false, follow: false },
}
export const dynamic = 'force-dynamic'

type Props = { searchParams: Promise<{ buzon?: string; categoria?: string; estado?: string; id?: string; mas?: string }> }

/**
 * Correo entrante: copias de hola@ (y las direcciones que redirigen a él) y
 * del Gmail que llegan por Resend. Solo administración: la RLS (es_admin())
 * no devuelve nada a nadie más. El HTML solo se ve saneado y en un iframe
 * aislado; las respuestas se escriben en el buzón original.
 */
export default async function CorreoEntrantePage({ searchParams }: Props) {
  const p = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?next=/admin/correo')
  const sesion = supabase as unknown as SupabaseClient
  const { esAdmin } = await leerAcceso(sesion, user.id)
  if (!esAdmin) {
    return (
      <Marco>
        <div className="page-header"><h1 className="page-title">Acceso restringido</h1></div>
        <div className="obras-empty"><p className="obras-empty-text">Esta página es de administración.</p></div>
      </Marco>
    )
  }

  const filtros = leerFiltros(p)
  const limite = POR_PAGINA * Math.min(10, Math.max(1, Math.floor(Number(p.mas) || 1)))

  return (
    <Marco>
      <div className="page-header">
        <div className="page-title-group">
          <h1 className="page-title">Correo entrante</h1>
          <span style={{ fontSize: '13px', color: 'var(--muted)' }}>
            Copias de hola@ y de info.obrasdeteatro@gmail.com. Se responde desde el buzón original; aquí se conservan 12 meses.
          </span>
        </div>
        <div className="admin-header-actions">
          <Link href="/admin" className="table-link">← Master Control</Link>
          <span className="status-pill status-pill--draft" style={{ fontFamily: 'var(--mono)', fontSize: '10px', letterSpacing: '0.04em' }}>ADMINISTRACIÓN</span>
        </div>
      </div>

      {p.id ? await Detalle({ sesion, id: p.id, filtros }) : await Bandeja({ sesion, filtros, limite })}
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
