import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import TopNav from '@/components/design-system/TopNav'
import { createClient } from '@/lib/supabase/server'
import { etiquetaCategoria } from '@/components/convocatorias/vocabulario'
import { fecha } from '@/components/shared/formato'

export const metadata: Metadata = {
  title: 'Convocatoria | ObrasDeTeatro',
}

type Props = { params: Promise<{ id: string }> }

/**
 * Ficha pública de una convocatoria.
 *
 * Se ve SIN sesión. A diferencia de la ficha de casting, aquí no hay botón de
 * postulación ni datos de contacto reservados: `calls` no tiene columnas de
 * contacto y no existe (todavía) una tabla de candidaturas equivalente a
 * casting_applications. Quien quiera participar lo hace por la vía que la
 * propia descripción indique.
 *
 * NO LLEVA INSIGNIA DE ORGANIZADOR VERIFICADO. En Castings esa insignia es
 * fija porque solo las cuentas de pago pueden publicar, así que se cumple por
 * construcción. Aquí NO: el plan gratuito también publica, con un techo de 3
 * al mes que impone cupo_mensual_convocatorias_agotado(). Poner la misma
 * insignia sería afirmar algo falso.
 */
export default async function ConvocatoriaPublicaPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  // Columnas enumeradas, nunca `select *`: mantiene la consulta explícita y
  // evita arrastrar columnas nuevas a una página pública sin decidirlo.
  const { data: convocatoria } = await supabase
    .from('calls')
    .select('id, title, description, category, location, deadline, prize, is_featured, fecha_publicacion, profile_id')
    .eq('id', id)
    .eq('estado', 'publicado')
    .is('deleted_at', null)
    .single()

  if (!convocatoria) notFound()

  // El organizador, en una segunda consulta. Un perfil ausente se muestra como
  // organizador sin identificar; nunca se inventa un nombre.
  const { data: perfil } = await supabase
    .from('profiles')
    .select('nombre, apellidos, slug')
    .eq('id', convocatoria.profile_id)
    .single()

  const nombreOrganizador = perfil
    ? [perfil.nombre, perfil.apellidos].filter(Boolean).join(' ').trim()
    : ''

  const vencida = convocatoria.deadline !== null && new Date(convocatoria.deadline).getTime() < Date.now()

  return (
    <>
      <TopNav />
      <main style={{ background: 'var(--off)', minHeight: '100vh', padding: '32px 24px 64px' }}>
        <div style={{ maxWidth: '780px', margin: '0 auto' }}>

          <div className="page-header">
            <div className="page-title-group">
              <h1 className="page-title">{convocatoria.title}</h1>
              <Link href="/convocatoria" className="page-back">← Todas las convocatorias</Link>
            </div>
            {convocatoria.is_featured && (
              <span className="status-pill status-pill--published">Destacada</span>
            )}
          </div>

          <article className="account-card" style={{ marginBottom: '20px' }}>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              <span className="status-pill" style={{ background: 'var(--subtle)', color: 'var(--text)' }}>
                {etiquetaCategoria(convocatoria.category)}
              </span>
            </div>

            {/* El cierre por plazo lo hace un job cada 15 minutos
                (cerrar_convocatorias_vencidas). Entre que vence y se ejecuta,
                la convocatoria sigue publicada: se avisa en vez de fingir que
                sigue abierta. */}
            {vencida && (
              <div className="ds-status-banner ds-status-banner--draft" style={{ marginTop: '14px' }}>
                <div>
                  <div className="ds-status-title">El plazo ha terminado</div>
                  <div className="ds-status-hint">
                    La fecha límite de esta convocatoria ya ha pasado.
                  </div>
                </div>
              </div>
            )}

            {convocatoria.description && (
              <div style={{ marginTop: '18px' }}>
                <h2 className="obras-stat-label" style={{ marginBottom: '6px' }}>Descripción</h2>
                <p style={{ fontSize: '14px', color: 'var(--text)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                  {convocatoria.description}
                </p>
              </div>
            )}

            <div style={{ borderTop: '1px solid var(--border)', margin: '20px 0' }} />

            <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '14px' }}>
              <Dato etiqueta="Lugar" valor={convocatoria.location} />
              <Dato etiqueta="Fecha límite" valor={convocatoria.deadline ? fecha(convocatoria.deadline) : 'Sin fecha límite'} />
              <Dato etiqueta="Dotación" valor={convocatoria.prize} />
              <Dato etiqueta="Publicada" valor={convocatoria.fecha_publicacion ? fecha(convocatoria.fecha_publicacion) : null} />
            </dl>

          </article>

          <section className="account-card">
            <h2 className="obras-stat-label" style={{ marginBottom: '10px' }}>Quién convoca</h2>
            {nombreOrganizador.length > 0 ? (
              perfil?.slug ? (
                <Link href={`/perfil/${perfil.slug}`} style={{ fontSize: '15px', color: 'var(--red)', textDecoration: 'none' }}>
                  {nombreOrganizador}
                </Link>
              ) : (
                <p style={{ fontSize: '15px', color: 'var(--black)' }}>{nombreOrganizador}</p>
              )
            ) : (
              <p style={{ fontSize: '14px', color: 'var(--muted)' }}>Organizador sin identificar.</p>
            )}
            <p className="ds-form-hint" style={{ marginTop: '10px' }}>
              La forma de participar la indica la propia convocatoria en su descripción.
            </p>
          </section>

        </div>
      </main>
    </>
  )
}

/** Un dato corto. Ausente = no se pinta la fila, en vez de un guion vacío. */
function Dato({ etiqueta, valor }: { etiqueta: string; valor: string | null }) {
  if (!valor || valor === '—') return null
  return (
    <div>
      <dt className="obras-stat-label">{etiqueta}</dt>
      <dd style={{ fontSize: '13px', color: 'var(--text)' }}>{valor}</dd>
    </div>
  )
}
