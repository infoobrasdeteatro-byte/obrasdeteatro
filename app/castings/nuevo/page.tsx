import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import NavAutenticado from '@/components/NavAutenticado'
import Sidebar from '@/components/design-system/Sidebar'
import CastingForm from '@/components/castings/CastingForm'

export const metadata: Metadata = {
  title: 'Nuevo casting | ObrasDeTeatro',
  robots: { index: false, follow: false },
}

/**
 * Creación de casting.
 *
 * El gate de plan de esta página NO es la regla: la regla es la política RLS
 * "Casting propio - creación", que ya impide el INSERT a los planes gratuitos.
 * Esto solo se adelanta a ella para que el usuario lea una explicación en vez
 * de un error de permisos.
 */
export default async function CrearCastingPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: perfil } = await supabase
    .from('profiles')
    .select('plan')
    .eq('id', user.id)
    .single()

  const plan = perfil?.plan ?? 'gratuito'

  if (plan === 'gratuito') {
    return (
      <Marco titulo="Nuevo casting">
        <div className="obras-empty">
          <p className="obras-empty-text">
            Publicar castings forma parte de los planes de pago. Con tu plan gratuito puedes
            explorar el directorio y gestionar tus obras, pero no abrir castings.
          </p>
          <Link href="/precios" className="ds-btn-primary"
            style={{ width: 'auto', display: 'inline-flex', padding: '10px 24px' }}>
            Ver planes →
          </Link>
        </div>
      </Marco>
    )
  }

  // Las categorías se leen de la tabla, no del código: ampliarlas es un
  // INSERT en public.casting_categorias.
  const { data: categorias } = await supabase
    .from('casting_categorias')
    .select('id, etiqueta')
    .eq('activo', true)
    .order('orden', { ascending: true })

  return (
    <Marco titulo="Nuevo casting">
      <CastingForm userId={user.id} categorias={categorias ?? []} />
    </Marco>
  )
}

function Marco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--off)', minHeight: '100vh' }}>
      <NavAutenticado />
      <div className="app-layout">
        <Sidebar />
        <main className="app-main">
          <div className="page-header">
            <div className="page-title-group">
              <h1 className="page-title">{titulo}</h1>
              <Link href="/mis-castings" className="page-back">← Mis castings</Link>
            </div>
          </div>
          {children}
        </main>
      </div>
    </div>
  )
}
