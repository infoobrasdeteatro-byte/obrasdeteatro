import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import NavAutenticado from '@/components/NavAutenticado'
import Sidebar from '@/components/design-system/Sidebar'
import { permisoFormacion } from '@/lib/formacion/permisos'
import AvisoPermiso from './AvisoPermiso'
import MisFormacionesList, { type FormacionPropia } from './MisFormacionesList'

export const metadata: Metadata = {
  title: 'Mis formaciones | ObrasDeTeatro',
  robots: { index: false, follow: false },
}

type Props = { searchParams: Promise<{ resultado?: string }> }

/** Panel de quien publica cursos, talleres y masterclass. */
export default async function MisFormacionesPage({ searchParams }: Props) {
  const { resultado } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?next=/mis-formaciones')

  const { data: perfil } = await supabase.from('profiles').select('tipo_perfil, plan').eq('id', user.id).single()
  const permiso = permisoFormacion(perfil?.tipo_perfil, perfil?.plan)

  // Filtro explícito por profile_id: la política pública deja ver las
  // publicadas de cualquiera, y esta pantalla es la de las propias.
  const { data } = await supabase
    .from('formaciones')
    .select('id, slug, titulo, tipo, modalidad, ciudad, pais_code, fecha_inicio, fecha_fin, estado, motivo_retirada, created_at')
    .eq('profile_id', user.id)
    .order('created_at', { ascending: false })

  const lista: FormacionPropia[] = data ?? []
  const publicadas = lista.filter(f => f.estado === 'publicado').length
  const borradores = lista.filter(f => f.estado === 'borrador').length

  return (
    <div style={{ background: 'var(--off)', minHeight: '100vh' }}>
      <NavAutenticado />
      <div className="app-layout">
        <Sidebar />
        <main className="app-main">
          <div className="page-header">
            <div className="page-title-group">
              <h1 className="page-title">Mis formaciones</h1>
              <span style={{ fontSize: '13px', color: 'var(--muted)' }}>
                Cursos, talleres, masterclass y demás formaciones que impartes u organizas.
              </span>
            </div>
            {permiso === 'puede' && (
              <Link href="/mis-formaciones/nueva" className="ds-btn-primary"
                style={{ width: 'auto', padding: '10px 20px', fontSize: '13px' }}>
                + Nueva formación
              </Link>
            )}
          </div>

          <AvisoPermiso permiso={permiso} />

          {resultado === 'publicada' && (
            <div className="ds-alert-success" style={{ marginBottom: '20px' }}>Publicada. Tu formación ya se ve en la sección Formación.</div>
          )}
          {resultado === 'borrador' && (
            <div className="ds-alert-success" style={{ marginBottom: '20px' }}>Borrador guardado. Publícala cuando esté lista.</div>
          )}

          <div className="obras-stat-grid">
            <div className="obras-stat-card">
              <div className="obras-stat-label">Total</div>
              <div className="obras-stat-value">{lista.length}</div>
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

          <MisFormacionesList formaciones={lista} puedeCrear={permiso === 'puede'} />
        </main>
      </div>
    </div>
  )
}
