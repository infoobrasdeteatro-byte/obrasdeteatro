import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import NavAutenticado from '@/components/NavAutenticado'
import Sidebar from '@/components/design-system/Sidebar'
import ConvocatoriaForm from '@/components/convocatorias/ConvocatoriaForm'
import EstadoPill, { AvisoEstado } from '@/components/shared/EstadoPill'

export const metadata: Metadata = {
  title: 'Editar convocatoria | ObrasDeTeatro',
  robots: { index: false, follow: false },
}

type Props = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ nueva?: string }>
}

const AVISO_RECIEN_CREADA: Record<string, string> = {
  borrador: 'Borrador guardado. Puedes seguir editándolo y publicarlo cuando esté listo.',
  publicado: 'Publicada. Tu convocatoria ya es visible.',
  revision: 'Guardada y enviada a revisión. Se publicará en cuanto la apruebe el equipo.',
}

export default async function EditarConvocatoriaPage({ params, searchParams }: Props) {
  const { id } = await params
  const { nueva } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // El filtro por profile_id es explícito aunque la RLS ya limite la escritura:
  // «Convocatorias públicas» deja LEER las publicadas de cualquiera, así que
  // sin este filtro un usuario podría abrir el editor de una convocatoria
  // ajena que RLS le deja leer pero no modificar. Mismo razonamiento que en el
  // editor de castings.
  const { data: convocatoria } = await supabase
    .from('calls')
    .select(`
      id, profile_id, title, description, category, location, deadline, prize,
      is_featured, is_published, estado, slug, view_count,
      moderacion_entrada_at, fecha_publicacion, motivo_filtro, motivo_rechazo,
      created_at, updated_at, deleted_at
    `)
    .eq('id', id)
    .eq('profile_id', user.id)
    .single()

  if (!convocatoria) notFound()

  const { data: perfil } = await supabase
    .from('profiles')
    .select('plan')
    .eq('id', user.id)
    .single()

  const plan = perfil?.plan ?? 'gratuito'
  const puedeDestacar = plan === 'destacado' || plan === 'empresas'

  return (
    <div style={{ background: 'var(--off)', minHeight: '100vh' }}>
      <NavAutenticado />
      <div className="app-layout">
        <Sidebar />
        <main className="app-main">

          <div className="page-header">
            <div className="page-title-group">
              <h1 className="page-title">Editar convocatoria</h1>
              <Link href="/mis-convocatorias" className="page-back">← Mis convocatorias</Link>
            </div>
            <EstadoPill estado={convocatoria.estado} />
          </div>

          {nueva && AVISO_RECIEN_CREADA[nueva] && (
            <div className="ds-alert-success" style={{ marginBottom: '16px' }}>
              {AVISO_RECIEN_CREADA[nueva]}
            </div>
          )}

          {/* El componente compartido con Castings. Desde la migracion
              20260917170313, `calls` tiene motivo_filtro y motivo_rechazo, asi
              que ya hay algo que mostrar: la retencion del filtro y el rechazo
              de moderacion se cuentan igual en los dos modulos. */}
          <AvisoEstado
            estado={convocatoria.estado}
            motivoFiltro={convocatoria.motivo_filtro}
            motivoRechazo={convocatoria.motivo_rechazo}
          />

          {/* AvisoEstado solo habla cuando hay motivo que dar. Estos dos
              cubren el resto: un rechazo sin motivo escrito, y una espera que
              el filtro no senalo -- que aqui es el caso normal, porque a
              diferencia de Castings el filtro no publica solo. */}
          {convocatoria.estado === 'rechazado' && !convocatoria.motivo_rechazo && (
            <div className="ds-alert-error" style={{ marginBottom: '16px' }}>
              <strong style={{ display: 'block', marginBottom: '2px' }}>Rechazo de moderacion</strong>
              No se dejo un motivo escrito. Puedes corregirla y volver a enviarla a revision.
            </div>
          )}

          {convocatoria.estado === 'pendiente_revision' && !convocatoria.motivo_filtro && (
            <div className="ds-status-banner ds-status-banner--draft" style={{ marginBottom: '16px' }}>
              <div>
                <div className="ds-status-title">En revision</div>
                <div className="ds-status-hint">
                  La revision previa es obligatoria. Se publicara en cuanto alguien del equipo la apruebe.
                </div>
              </div>
            </div>
          )}

          {convocatoria.estado === 'publicado' && (
            <div className="ds-status-banner ds-status-banner--draft" style={{ marginBottom: '16px' }}>
              <div>
                <div className="ds-status-title">Esta convocatoria está publicada</div>
                <div className="ds-status-hint">
                  Si cambias el título o la descripción, volverá a revisión automáticamente. El
                  resto de campos puedes editarlos sin que deje de estar visible.
                </div>
              </div>
            </div>
          )}

          <ConvocatoriaForm
            profileId={user.id}
            puedeDestacar={puedeDestacar}
            convocatoria={convocatoria}
          />

        </main>
      </div>
    </div>
  )
}
