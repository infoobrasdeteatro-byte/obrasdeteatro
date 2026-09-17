import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import NavAutenticado from '@/components/NavAutenticado'
import Sidebar from '@/components/design-system/Sidebar'
import EstadoPostulacion from '@/components/castings/EstadoPostulacion'
import EstadoPill from '@/components/shared/EstadoPill'
import { leerCursor, escribirCursor } from '@/components/shared/cursor'
import { fecha } from '@/components/shared/formato'

export const metadata: Metadata = {
  title: 'Mis postulaciones | ObrasDeTeatro',
  robots: { index: false, follow: false },
}

const TAMANO_PAGINA = 20

type Props = { searchParams: Promise<{ cursor?: string }> }

/**
 * Mis postulaciones — el reverso de /mis-castings/postulaciones.
 *
 * Exige sesión pero NO plan de pago: ver la propia actividad no es un producto
 * de pago. Crear una postulación sí lo exige, y eso lo decide la política
 * "Postulación propia - creación", no esta pantalla.
 *
 * Los datos llegan por public.mis_postulaciones(), que acompaña cada
 * postulación con su casting AUNQUE ESTE YA ESTE CERRADO O CANCELADO. Sin esa
 * función, la RLS de castings deja de mostrar el casting en cuanto el
 * organizador lo cierra, y la fila que más necesita explicación -- la que ya
 * no va a ninguna parte -- aparecería sin título ni entidad.
 */
export default async function MisPostulacionesPage({ searchParams }: Props) {
  const { cursor } = await searchParams
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const c = leerCursor(cursor)

  // Una fila de más que el tamaño de página: si llega, hay siguiente.
  const { data: pagina, error } = await supabase.rpc('mis_postulaciones', {
    p_cursor_applied_at: c?.appliedAt,
    p_cursor_id: c?.id,
    p_limite: TAMANO_PAGINA + 1,
  })

  const filas = pagina ?? []
  const haySiguiente = filas.length > TAMANO_PAGINA
  const visibles = haySiguiente ? filas.slice(0, TAMANO_PAGINA) : filas
  const ultima = visibles[visibles.length - 1]

  // El contacto se pide por contacto_del_casting(), que es la única vía que lo
  // expone y la única autoridad sobre quién puede verlo. Una llamada por
  // casting, en paralelo: son pocas por página y así la regla de exposición no
  // se reescribe en un segundo sitio.
  const contactos = await Promise.all(
    visibles.map(async f => {
      const { data } = await supabase.rpc('contacto_del_casting', { p_casting_id: f.casting_id })
      return [f.casting_id, data?.[0] ?? null] as const
    })
  )
  const porCasting = new Map(contactos)

  const queryBase = new URLSearchParams()
  const siguienteHref = haySiguiente && ultima?.applied_at
    ? `?${new URLSearchParams({ ...Object.fromEntries(queryBase), cursor: escribirCursor(ultima.applied_at, ultima.id) })}`
    : null

  return (
    <div style={{ background: 'var(--off)', minHeight: '100vh' }}>
      <NavAutenticado />
      <div className="app-layout">
        <Sidebar />
        <main className="app-main">

          <div className="page-header">
            <div className="page-title-group">
              <h1 className="page-title">Mis postulaciones</h1>
              <span style={{ fontSize: '13px', color: 'var(--muted)' }}>
                Los castings a los que te has presentado, del más reciente al más antiguo.
              </span>
            </div>
            <Link href="/castings" className="ds-btn-secondary"
              style={{ padding: '10px 20px', fontSize: '13px' }}>
              Ver castings abiertos
            </Link>
          </div>

          {error && (
            <div className="ds-alert-error" style={{ marginBottom: '16px' }}>
              No se pudieron cargar tus postulaciones: {error.message}
            </div>
          )}

          {visibles.length === 0 ? (
            <div className="obras-empty">
              <p className="obras-empty-text">Todavía no te has presentado a ningún casting</p>
              <Link href="/castings" className="ds-btn-primary"
                style={{ width: 'auto', display: 'inline-flex', padding: '10px 24px' }}>
                Explorar castings
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {visibles.map(p => {
                const contacto = porCasting.get(p.casting_id)
                const hayContacto = contacto &&
                  (contacto.email_recepcion || contacto.telefono_contacto || contacto.url_externa)
                const castingTerminado = p.casting_estado === 'cerrado' || p.casting_estado === 'cancelado'

                return (
                  <article key={p.id} className="account-card">

                    <header style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'flex-start' }}>
                      <div style={{ minWidth: 0 }}>
                        <h2 style={{ fontFamily: 'var(--serif)', fontSize: '18px', color: 'var(--black)', letterSpacing: '-0.3px', lineHeight: 1.25 }}>
                          {p.casting_estado === 'publicado' ? (
                            <Link href={`/castings/${p.casting_id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                              {p.casting_titulo}
                            </Link>
                          ) : (
                            p.casting_titulo
                          )}
                        </h2>
                        <p style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '3px' }}>
                          {p.casting_entidad} · {fecha(p.casting_fecha_apertura)} – {fecha(p.casting_fecha_cierre)}
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: '6px', flexShrink: 0, alignItems: 'center' }}>
                        {castingTerminado && <EstadoPill estado={p.casting_estado} />}
                        <EstadoPostulacion status={p.status} />
                      </div>
                    </header>

                    {castingTerminado && (
                      <p style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '10px' }}>
                        {p.casting_estado === 'cerrado'
                          ? 'La organización ha cerrado este casting. Tu candidatura sigue registrada.'
                          : 'La organización ha cancelado este casting.'}
                      </p>
                    )}

                    <p style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '10px' }}>
                      Te presentaste el {fecha(p.applied_at)}
                    </p>

                    {p.cover_letter && (
                      <div style={{ marginTop: '12px' }}>
                        <span className="obras-stat-label">Tu mensaje</span>
                        <p style={{ fontSize: '13px', color: 'var(--text)', lineHeight: 1.6, whiteSpace: 'pre-wrap', marginTop: '4px' }}>
                          {p.cover_letter}
                        </p>
                      </div>
                    )}

                    {p.portfolio_url && (
                      <p style={{ marginTop: '10px', fontSize: '13px' }}>
                        <span className="obras-stat-label">Tu portfolio</span><br />
                        <a href={p.portfolio_url} target="_blank" rel="noopener noreferrer"
                          style={{ color: 'var(--red)', textDecoration: 'none' }}>
                          {p.portfolio_url}
                        </a>
                      </p>
                    )}

                    {hayContacto && (
                      <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid var(--border)' }}>
                        <span className="obras-stat-label">Contacto del organizador</span>
                        <ul style={{ listStyle: 'none', padding: 0, margin: '6px 0 0', fontSize: '13px', display: 'flex', flexWrap: 'wrap', gap: '14px' }}>
                          {contacto?.email_recepcion && (
                            <li>✉ <a href={`mailto:${contacto.email_recepcion}`} style={{ color: 'var(--red)', textDecoration: 'none' }}>{contacto.email_recepcion}</a></li>
                          )}
                          {contacto?.telefono_contacto && <li>☎ {contacto.telefono_contacto}</li>}
                          {contacto?.url_externa && (
                            <li>↗ <a href={contacto.url_externa} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--red)', textDecoration: 'none' }}>{contacto.url_externa}</a></li>
                          )}
                        </ul>
                      </div>
                    )}

                  </article>
                )
              })}
            </div>
          )}

          {siguienteHref && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
              <Link href={siguienteHref} className="ds-btn-secondary" style={{ padding: '10px 24px' }}>
                Ver más antiguas →
              </Link>
            </div>
          )}

          {cursor && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '12px' }}>
              <Link href="/mis-postulaciones" className="table-link">Volver al principio</Link>
            </div>
          )}

        </main>
      </div>
    </div>
  )
}
