import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import NavAutenticado from '@/components/NavAutenticado'
import Sidebar from '@/components/design-system/Sidebar'
import ConvocatoriaForm from '@/components/convocatorias/ConvocatoriaForm'

export const metadata: Metadata = {
  title: 'Nueva convocatoria | ObrasDeTeatro',
  robots: { index: false, follow: false },
}

/**
 * Creación de convocatoria.
 *
 * NO HAY MURO DE PAGO, y es la diferencia de fondo con Castings. Allí el plan
 * gratuito no puede crear: lo impide la política «Casting propio - creación».
 * Aquí la política «Convocatoria propia - creación» solo exige ser el autor
 * (auth.uid() = profile_id), y el límite del plan gratuito es un CUPO MENSUAL
 * de 3 publicadas que impone el trigger al pasar a 'publicado' -- no al crear.
 *
 * O sea: cualquiera con sesión puede escribir un borrador. El techo aparece al
 * publicar, y lo dice la base con un mensaje ya redactado que el formulario
 * deja pasar tal cual.
 */
export default async function NuevaConvocatoriaPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: perfil } = await supabase
    .from('profiles')
    .select('plan')
    .eq('id', user.id)
    .single()

  const plan = perfil?.plan ?? 'gratuito'
  // Se adelanta la respuesta de plan_destacado_o_superior() solo para pintar
  // la casilla como disponible o no. Quien decide sigue siendo el trigger.
  const puedeDestacar = plan === 'destacado' || plan === 'empresas'

  // Cuántas lleva publicadas este mes, para avisar ANTES de que el trigger
  // aborte. Es la misma cuenta que hace cupo_mensual_convocatorias_agotado(),
  // pero aquí solo sirve para informar: si esta cifra y la de la base se
  // separasen, manda la base.
  const inicioDeMes = new Date()
  inicioDeMes.setDate(1)
  inicioDeMes.setHours(0, 0, 0, 0)

  const { count: publicadasEsteMes } = await supabase
    .from('calls')
    .select('id', { count: 'exact', head: true })
    .eq('profile_id', user.id)
    .eq('estado', 'publicado')
    .gte('fecha_publicacion', inicioDeMes.toISOString())

  const cupoAgotado = plan === 'gratuito' && (publicadasEsteMes ?? 0) >= 3

  return (
    <div style={{ background: 'var(--off)', minHeight: '100vh' }}>
      <NavAutenticado />
      <div className="app-layout">
        <Sidebar />
        <main className="app-main">

          <div className="page-header">
            <div className="page-title-group">
              <h1 className="page-title">Nueva convocatoria</h1>
              <Link href="/mis-convocatorias" className="page-back">← Mis convocatorias</Link>
            </div>
          </div>

          {cupoAgotado && (
            <div className="ds-status-banner ds-status-banner--draft" style={{ marginBottom: '20px' }}>
              <div>
                <div className="ds-status-title">Has agotado tu cupo de este mes</div>
                <div className="ds-status-hint">
                  El plan Gratuito permite 3 convocatorias publicadas por mes natural. Puedes
                  seguir escribiendo borradores y publicarlos el mes que viene, o subir de plan.
                </div>
              </div>
              <Link href="/precios" className="ds-btn-secondary"
                style={{ padding: '8px 16px', fontSize: '13px', flex: 'none' }}>
                Ver planes
              </Link>
            </div>
          )}

          <ConvocatoriaForm profileId={user.id} puedeDestacar={puedeDestacar} />

        </main>
      </div>
    </div>
  )
}
