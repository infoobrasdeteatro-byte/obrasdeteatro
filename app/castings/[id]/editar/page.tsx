import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import NavAutenticado from '@/components/NavAutenticado'
import Sidebar from '@/components/design-system/Sidebar'
import CastingForm from '@/components/castings/CastingForm'
import EstadoPill, { AvisoEstado } from '@/components/castings/EstadoPill'

export const metadata: Metadata = {
  title: 'Editar convocatoria | ObrasDeTeatro',
  robots: { index: false, follow: false },
}

type Props = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ nuevo?: string }>
}

const AVISO_RECIEN_CREADO: Record<string, string> = {
  borrador: 'Borrador guardado. Puedes seguir editándolo y publicarlo cuando esté listo.',
  publicado: 'Publicada. Tu convocatoria ya es visible.',
  revision: 'Guardada y enviada a revisión. Abajo tienes el motivo si el filtro la ha retenido.',
}

export default async function EditarCastingPage({ params, searchParams }: Props) {
  const { id } = await params
  const { nuevo } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // No se filtra por user_id: la política "Casting propio - lectura" ya limita
  // lo visible a lo propio (y deja ver los publicados de otros). El filtro
  // explícito evita que un organizador abra el editor de un casting ajeno
  // publicado, que RLS le dejaría leer pero no modificar.
  const { data: casting } = await supabase
    .from('castings')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!casting) notFound()

  const { data: categorias } = await supabase
    .from('casting_categorias')
    .select('id, etiqueta')
    .eq('activo', true)
    .order('orden', { ascending: true })

  return (
    <div style={{ background: 'var(--off)', minHeight: '100vh' }}>
      <NavAutenticado />
      <div className="app-layout">
        <Sidebar />
        <main className="app-main">

          <div className="page-header">
            <div className="page-title-group">
              <h1 className="page-title">Editar convocatoria</h1>
              <Link href="/mis-castings" className="page-back">← Mis castings</Link>
            </div>
            <EstadoPill estado={casting.estado} />
          </div>

          {nuevo && AVISO_RECIEN_CREADO[nuevo] && (
            <div className="ds-alert-success" style={{ marginBottom: '16px' }}>
              {AVISO_RECIEN_CREADO[nuevo]}
            </div>
          )}

          <AvisoEstado
            estado={casting.estado}
            motivoFiltro={casting.motivo_filtro}
            motivoRechazo={casting.motivo_rechazo}
          />

          {casting.estado === 'publicado' && (
            <div className="ds-status-banner ds-status-banner--draft" style={{ marginBottom: '16px' }}>
              <div>
                <div className="ds-status-title">Esta convocatoria está publicada</div>
                <div className="ds-status-hint">
                  Si cambias la descripción, la sinopsis o el perfil buscado, volverá a revisión
                  automáticamente. El resto de campos puedes editarlos sin que deje de estar visible.
                </div>
              </div>
            </div>
          )}

          <CastingForm userId={user.id} categorias={categorias ?? []} casting={casting} />

        </main>
      </div>
    </div>
  )
}
