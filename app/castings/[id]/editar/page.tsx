import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import NavAutenticado from '@/components/NavAutenticado'
import Sidebar from '@/components/design-system/Sidebar'
import CastingForm from '@/components/castings/CastingForm'
import EstadoPill, { AvisoEstado } from '@/components/shared/EstadoPill'

export const metadata: Metadata = {
  title: 'Editar casting | ObrasDeTeatro',
  robots: { index: false, follow: false },
}

type Props = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ nuevo?: string }>
}

const AVISO_RECIEN_CREADO: Record<string, string> = {
  borrador: 'Borrador guardado. Puedes seguir editándolo y publicarlo cuando esté listo.',
  publicado: 'Publicado. Tu casting ya es visible.',
  revision: 'Guardado y enviado a revisión. Abajo tienes el motivo si el filtro lo ha retenido.',
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
  // No se puede pedir `*`: email_recepcion, url_externa y telefono_contacto
  // tienen el SELECT revocado para anon y authenticated, y un `*` los incluye.
  // Se enumeran las columnas legibles y el contacto se pide aparte, por la
  // única vía que lo expone.
  const { data: fila } = await supabase
    .from('castings')
    .select(`
      id, user_id, titulo, nombre_proyecto, entidad_organizadora, tipo_entidad,
      descripcion, sinopsis, tipo_otro, perfil_nombre, perfil_descripcion,
      edad_min, edad_max, genero_escenico, idiomas_requeridos,
      experiencia_requerida, formacion_requerida, habilidades_especiales,
      importe, fechas_previstas, lugar_trabajo, pais, ciudad,
      fecha_apertura, fecha_cierre, modalidad, descripcion_proceso,
      forma_candidatura, estado, publicado, destacado, scenaia_activo,
      created_at, updated_at, motivo_rechazo, motivo_filtro,
      tipo_remuneracion, categorias
    `)
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!fila) notFound()

  // Al ser el dueño, la función le devuelve el contacto de su propio casting.
  const { data: contacto } = await supabase.rpc('contacto_del_casting', { p_casting_id: id })
  const c = contacto?.[0]

  const casting = {
    ...fila,
    email_recepcion: c?.email_recepcion ?? null,
    url_externa: c?.url_externa ?? null,
    telefono_contacto: c?.telefono_contacto ?? null,
  }

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
              <h1 className="page-title">Editar casting</h1>
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
                <div className="ds-status-title">Este casting está publicado</div>
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
