import { createClient } from '@/lib/supabase/server'
// Perfiles, suscripciones, verificaciones y embajadores se leen con la clave
// de servicio, igual que en sus páginas de /admin, y solo tras comprobar el rol.
import { createServiceClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import type { SupabaseClient } from '@supabase/supabase-js'
import NavAutenticado from '@/components/NavAutenticado'
import Sidebar from '@/components/design-system/Sidebar'
import { leerAcceso } from '@/lib/admin/acceso'
import { cargarPendientes, elementosAtencion } from '@/lib/admin/colas'
import { cargarCifras, cargarSalud } from '@/lib/admin/datos'
import { cargarActividad, inicioPeriodo, LIMITE_EVENTOS, LIMITE_MAXIMO, periodoValido } from '@/lib/admin/actividad'
import MasterControl from './MasterControl'

export const metadata: Metadata = {
  title: 'Master Control | Administración | ObrasDeTeatro',
  robots: { index: false, follow: false },
}
export const dynamic = 'force-dynamic'

type Props = { searchParams: Promise<{ actividad?: string; mas?: string }> }

/**
 * Master Control: la portada de /admin. Qué requiere atención, cómo están las
 * automatizaciones, las cifras de la plataforma, la actividad reciente y el
 * acceso a las 15 secciones. Solo lee: no cambia nada.
 *
 * Como en el resto de /admin, el guard explica y la base protege. Moderación
 * no ve lo que es solo de administración (Embajadores, Avisos de perfil,
 * Recordatorio de confirmación).
 */
export default async function MasterControlPage({ searchParams }: Props) {
  const { actividad, mas } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?next=/admin')

  const { permitido, esAdmin } = await leerAcceso(supabase as unknown as SupabaseClient, user.id)
  if (!permitido) {
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

  const ahora = new Date()
  const periodo = periodoValido(actividad)
  const limite = Math.min(LIMITE_MAXIMO, LIMITE_EVENTOS * Math.max(1, Math.floor(Number(mas) || 1)))
  const sesion = supabase as unknown as SupabaseClient
  const servicio = createServiceClient() as unknown as SupabaseClient

  const [pendientes, salud, cifras, eventos] = await Promise.all([
    cargarPendientes(sesion, servicio, esAdmin),
    cargarSalud(sesion, ahora, esAdmin),
    cargarCifras(sesion, servicio, esAdmin, ahora),
    cargarActividad(sesion, servicio, { desde: inicioPeriodo(periodo, ahora), limite, esAdmin }),
  ])
  const atencion = elementosAtencion(pendientes, esAdmin)

  return (
    <Marco>
      <MasterControl ahora={ahora} esAdmin={esAdmin} pendientes={pendientes} atencion={atencion} salud={salud}
        cifras={cifras} eventos={eventos} periodo={periodo} limite={limite} />
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
