import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import TopNav from '@/components/design-system/TopNav'
import { createClient } from '@/lib/supabase/server'
import { etiquetaRemuneracion, etiquetaIdioma, etiquetaEntidad } from '@/components/castings/vocabulario'
import { InsigniaVerificado, fecha, lugar, rangoEdad } from '@/components/castings/publico'
import PostularseForm from './PostularseForm'

export const metadata: Metadata = {
  title: 'Convocatoria | ObrasDeTeatro',
}

type Props = { params: Promise<{ id: string }> }

/**
 * Ficha pública de una convocatoria.
 *
 * Se ve SIN sesión. Lo que cambia con la sesión no es el contenido de la
 * convocatoria, sino solo la llamada a la acción.
 *
 * Los tres campos de contacto (email_recepcion, url_externa,
 * telefono_contacto) NO se piden a la base en ninguna consulta de esta
 * página. La única vía de postulación es el botón, por decisión de negocio:
 * enseñarlos abriría un camino gratuito que evita el pago.
 */
export default async function CastingPublicoPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: casting } = await supabase
    .from('castings')
    .select(`
      id, titulo, nombre_proyecto, entidad_organizadora, tipo_entidad,
      descripcion, sinopsis, categorias, tipo_otro,
      perfil_nombre, perfil_descripcion, edad_min, edad_max, genero_escenico,
      idiomas_requeridos, experiencia_requerida, formacion_requerida, habilidades_especiales,
      tipo_remuneracion, importe,
      fechas_previstas, lugar_trabajo, pais, ciudad, fecha_apertura, fecha_cierre, modalidad,
      descripcion_proceso, forma_candidatura
    `)
    .eq('id', id)
    .eq('estado', 'publicado')
    .single()

  if (!casting) notFound()

  const { data: categorias } = await supabase
    .from('casting_categorias')
    .select('id, etiqueta')
    .eq('activo', true)
    .order('orden', { ascending: true })

  const etiquetaCategoria = new Map((categorias ?? []).map(c => [c.id, c.etiqueta]))

  const { data: { user } } = await supabase.auth.getUser()

  let plan: string | null = null
  let yaPostulado = false

  if (user) {
    const { data: perfil } = await supabase
      .from('profiles').select('plan').eq('id', user.id).single()
    plan = perfil?.plan ?? 'gratuito'

    // Comprobación de comodidad, no de seguridad: si fallara, el UNIQUE de la
    // base seguiría impidiendo la postulación duplicada.
    const { count } = await supabase
      .from('casting_applications')
      .select('id', { count: 'exact', head: true })
      .eq('casting_id', id)
      .eq('applicant_id', user.id)
    yaPostulado = (count ?? 0) > 0
  }

  // El contacto solo existe para quien ya se postuló (o para el dueño y
  // moderación). Las columnas están revocadas: si no se cumple ninguna de esas
  // condiciones, la función devuelve 0 filas y aquí no hay nada que enseñar.
  // No se pide siquiera cuando no hay sesión.
  const { data: contacto } = user
    ? await supabase.rpc('contacto_del_casting', { p_casting_id: id })
    : { data: null }
  const contactoOrganizador = contacto?.[0] ?? null
  const hayContacto =
    contactoOrganizador !== null &&
    (contactoOrganizador.email_recepcion ||
      contactoOrganizador.url_externa ||
      contactoOrganizador.telefono_contacto)

  const edad = rangoEdad(casting.edad_min, casting.edad_max)

  return (
    <>
      <TopNav />
      <main style={{ background: 'var(--off)', minHeight: '100vh', padding: '32px 24px 64px' }}>
        <div style={{ maxWidth: '780px', margin: '0 auto' }}>

          <div className="page-header">
            <div className="page-title-group">
              <h1 className="page-title">{casting.titulo}</h1>
              <Link href="/castings" className="page-back">← Todas las convocatorias</Link>
            </div>
            <InsigniaVerificado />
          </div>

          <article className="account-card" style={{ marginBottom: '20px' }}>

            <p style={{ fontSize: '14px', color: 'var(--muted)' }}>
              {casting.nombre_proyecto} · {casting.entidad_organizadora}
              {casting.tipo_entidad && ` · ${etiquetaEntidad(casting.tipo_entidad)}`}
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '12px' }}>
              {casting.categorias.map(cid => (
                <span key={cid} className="status-pill" style={{ background: 'var(--subtle)', color: 'var(--text)' }}>
                  {etiquetaCategoria.get(cid) ?? cid}
                </span>
              ))}
              {casting.tipo_otro && (
                <span className="status-pill" style={{ background: 'var(--subtle)', color: 'var(--text)' }}>
                  {casting.tipo_otro}
                </span>
              )}
            </div>

            <Bloque titulo="Descripción" texto={casting.descripcion} />
            <Bloque titulo="Sinopsis" texto={casting.sinopsis} />

            <Separador />

            <h2 className="obras-stat-label" style={{ marginBottom: '10px' }}>Perfil buscado</h2>
            <p style={{ fontSize: '15px', color: 'var(--black)', fontWeight: 500 }}>{casting.perfil_nombre}</p>
            <p style={{ fontSize: '14px', color: 'var(--text)', lineHeight: 1.6, whiteSpace: 'pre-wrap', marginTop: '6px' }}>
              {casting.perfil_descripcion}
            </p>

            <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '14px', marginTop: '16px' }}>
              <Dato etiqueta="Edad" valor={edad} />
              <Dato etiqueta="Género escénico" valor={casting.genero_escenico} />
              <Dato
                etiqueta="Idiomas"
                valor={casting.idiomas_requeridos && casting.idiomas_requeridos.length > 0
                  ? casting.idiomas_requeridos.map(etiquetaIdioma).join(', ')
                  : null}
              />
            </dl>

            <Bloque titulo="Experiencia requerida" texto={casting.experiencia_requerida} />
            <Bloque titulo="Formación requerida" texto={casting.formacion_requerida} />
            <Bloque titulo="Habilidades especiales" texto={casting.habilidades_especiales} />

            <Separador />

            <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '14px' }}>
              <Dato etiqueta="Condición económica" valor={etiquetaRemuneracion(casting.tipo_remuneracion)} />
              <Dato etiqueta="Importe" valor={casting.importe} />
              <Dato etiqueta="Lugar" valor={lugar(casting.ciudad, casting.pais)} />
              <Dato etiqueta="Modalidad" valor={casting.modalidad} />
              <Dato etiqueta="Lugar de trabajo" valor={casting.lugar_trabajo} />
              <Dato etiqueta="Fechas previstas" valor={casting.fechas_previstas} />
              <Dato etiqueta="Convocatoria abierta" valor={`${fecha(casting.fecha_apertura)} – ${fecha(casting.fecha_cierre)}`} />
            </dl>

            <Bloque titulo="Proceso de selección" texto={casting.descripcion_proceso} />
            <Bloque titulo="Qué enviar" texto={casting.forma_candidatura} />

          </article>

          <section className="account-card">
            <h2 className="obras-stat-label" style={{ marginBottom: '14px' }}>Presentarse</h2>

            {!user && (
              <>
                <p style={{ fontSize: '14px', color: 'var(--text)', marginBottom: '14px' }}>
                  Para presentarte a esta convocatoria necesitas una cuenta.
                </p>
                <Link href="/auth/login" className="ds-btn-primary"
                  style={{ width: 'auto', display: 'inline-flex', padding: '12px 28px' }}>
                  Inicia sesión para postularte
                </Link>
              </>
            )}

            {user && plan === 'gratuito' && (
              <>
                <p style={{ fontSize: '14px', color: 'var(--text)', marginBottom: '14px' }}>
                  Presentarse a convocatorias forma parte de los planes de pago. Con tu plan gratuito
                  puedes consultarlas, pero no postularte.
                </p>
                <Link href="/precios" className="ds-btn-primary"
                  style={{ width: 'auto', display: 'inline-flex', padding: '12px 28px' }}>
                  Ver planes →
                </Link>
              </>
            )}

            {user && plan !== 'gratuito' && yaPostulado && (
              <>
                <div className="ds-alert-success">
                  <strong style={{ display: 'block', marginBottom: '2px' }}>Ya te postulaste</strong>
                  Tu candidatura está en manos de la organización.
                </div>

                {hayContacto && (
                  <div style={{ marginTop: '18px', paddingTop: '18px', borderTop: '1px solid var(--border)' }}>
                    <h3 className="obras-stat-label" style={{ marginBottom: '8px' }}>Contacto del organizador</h3>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {contactoOrganizador?.email_recepcion && (
                        <li>
                          ✉{' '}
                          <a href={`mailto:${contactoOrganizador.email_recepcion}`}
                            style={{ color: 'var(--red)', textDecoration: 'none' }}>
                            {contactoOrganizador.email_recepcion}
                          </a>
                        </li>
                      )}
                      {contactoOrganizador?.telefono_contacto && (
                        <li>☎ {contactoOrganizador.telefono_contacto}</li>
                      )}
                      {contactoOrganizador?.url_externa && (
                        <li>
                          ↗{' '}
                          <a href={contactoOrganizador.url_externa} target="_blank" rel="noopener noreferrer"
                            style={{ color: 'var(--red)', textDecoration: 'none' }}>
                            {contactoOrganizador.url_externa}
                          </a>
                        </li>
                      )}
                    </ul>
                    <p className="ds-form-hint" style={{ marginTop: '10px' }}>
                      Se muestra porque te has presentado a esta convocatoria.
                    </p>
                  </div>
                )}
              </>
            )}

            {user && plan !== 'gratuito' && !yaPostulado && (
              <PostularseForm castingId={casting.id} applicantId={user.id} />
            )}
          </section>

        </div>
      </main>
    </>
  )
}

function Separador() {
  return <div style={{ borderTop: '1px solid var(--border)', margin: '20px 0' }} />
}

/** Un bloque de texto largo. Si no hay dato, no se pinta nada. */
function Bloque({ titulo, texto }: { titulo: string; texto: string | null }) {
  if (!texto) return null
  return (
    <div style={{ marginTop: '18px' }}>
      <h2 className="obras-stat-label" style={{ marginBottom: '6px' }}>{titulo}</h2>
      <p style={{ fontSize: '14px', color: 'var(--text)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{texto}</p>
    </div>
  )
}

/** Un dato corto. Ausente = no se muestra la fila, en vez de un guion vacío. */
function Dato({ etiqueta, valor }: { etiqueta: string; valor: string | null }) {
  if (!valor || valor === '—') return null
  return (
    <div>
      <dt className="obras-stat-label">{etiqueta}</dt>
      <dd style={{ fontSize: '13px', color: 'var(--text)' }}>{valor}</dd>
    </div>
  )
}
