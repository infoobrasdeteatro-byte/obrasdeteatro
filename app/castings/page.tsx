import type { Metadata } from 'next'
import Link from 'next/link'
import TopNav from '@/components/design-system/TopNav'
import { createClient } from '@/lib/supabase/server'
import { REMUNERACION_CORTA } from '@/components/castings/vocabulario'
import { InsigniaVerificado } from '@/components/castings/publico'
import { fecha, lugar } from '@/components/shared/formato'

export const metadata: Metadata = {
  title: 'Castings | ObrasDeTeatro',
}

type Props = {
  searchParams: Promise<{ pais?: string; ciudad?: string; cat?: string | string[] }>
}

/**
 * Listado público de castings.
 *
 * Accesible SIN sesión: no lleva guard de usuario, y el middleware no cubre
 * /pruebas. La visibilidad la decide la política RLS "Castings públicos"
 * (publicado = true), de modo que un visitante anónimo ve exactamente lo
 * publicado y nada más.
 *
 * NUNCA se leen aquí email_recepcion, url_externa ni telefono_contacto: la
 * única vía de postulación es el botón de la ficha. No se ocultan en la
 * plantilla, es que no se piden a la base.
 */
export default async function CastingsPublicoPage({ searchParams }: Props) {
  const { pais, ciudad, cat } = await searchParams
  const catsSeleccionadas = cat === undefined ? [] : Array.isArray(cat) ? cat : [cat]

  const supabase = await createClient()

  const { data: categorias } = await supabase
    .from('casting_categorias')
    .select('id, etiqueta')
    .eq('activo', true)
    .order('orden', { ascending: true })

  const etiquetaCategoria = new Map((categorias ?? []).map(c => [c.id, c.etiqueta]))

  // La consulta va por RPC y no por PostgREST a proposito: bajo RLS, el filtro
  // ILIKE de ciudad nunca puede llegar al indice de trigramas, porque
  // PostgreSQL no empuja una clausula no leakproof por debajo de la barrera de
  // seguridad. La funcion es SECURITY DEFINER y acota a 'publicado' en su
  // cuerpo, asi que no expone nada que la politica publica no expusiera.
  const [{ data: castings }, { data: paisesDisponibles }] = await Promise.all([
    supabase.rpc('buscar_castings_publicos', {
      p_pais: pais?.trim() || undefined,
      p_ciudad: ciudad?.trim() || undefined,
      p_categorias: catsSeleccionadas.length > 0 ? catsSeleccionadas : undefined,
      p_limite: 50,
    }),
    supabase.rpc('paises_con_castings'),
  ])

  const lista = castings ?? []
  const hayFiltros = Boolean(pais?.trim() || ciudad?.trim() || catsSeleccionadas.length > 0)

  return (
    <>
      <TopNav />
      <main style={{ background: 'var(--off)', minHeight: '100vh', padding: '32px 24px 64px' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>

          <div className="page-header">
            <div className="page-title-group">
              <h1 className="page-title">Castings abiertos</h1>
              <span style={{ fontSize: '13px', color: 'var(--muted)' }}>
                Castings publicados en la plataforma.
              </span>
            </div>
          </div>

          {/* Filtros como formulario GET: funcionan sin JavaScript y dejan la
              búsqueda en la URL, que así se puede compartir. */}
          <form method="get" className="account-card" style={{ marginBottom: '20px' }}>
            <div className="ds-form-grid" style={{ marginBottom: '14px' }}>
              <div className="ds-form-group">
                <label className="ds-label" htmlFor="pais">País</label>
                <select id="pais" name="pais" className="ds-select" defaultValue={pais ?? ''}>
                  <option value="">Todos</option>
                  {(paisesDisponibles ?? []).map(p => (
                    <option key={p.pais} value={p.pais}>{p.pais}</option>
                  ))}
                </select>
                <p className="ds-form-hint">Coincidencia exacta. La lista sale de los países con castings abiertos.</p>
              </div>
              <div className="ds-form-group">
                <label className="ds-label" htmlFor="ciudad">Ciudad</label>
                <input id="ciudad" name="ciudad" className="ds-input" defaultValue={ciudad ?? ''} placeholder="Madrid" />
              </div>
            </div>

            <span className="ds-label">Categorías</span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px', marginBottom: '16px' }}>
              {(categorias ?? []).map(c => (
                <label key={c.id} htmlFor={`f-${c.id}`}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                  <input type="checkbox" id={`f-${c.id}`} name="cat" value={c.id}
                    defaultChecked={catsSeleccionadas.includes(c.id)}
                    style={{ width: '15px', height: '15px', accentColor: 'var(--black)', cursor: 'pointer' }} />
                  {c.etiqueta}
                </label>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <button type="submit" className="ds-btn-primary" style={{ width: 'auto', padding: '10px 22px', fontSize: '13px' }}>
                Filtrar
              </button>
              {hayFiltros && (
                <Link href="/castings" className="table-link">Quitar filtros</Link>
              )}
            </div>
          </form>

          {lista.length === 0 ? (
            <div className="obras-empty">
              <p className="obras-empty-text" style={{ marginBottom: 0 }}>
                {hayFiltros
                  ? 'Ningún casting coincide con estos filtros.'
                  : 'No hay castings abiertos en este momento.'}
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {lista.map(c => (
                <Link key={c.id} href={`/castings/${c.id}`}
                  style={{ textDecoration: 'none', color: 'inherit' }}>
                  <article className="account-card">

                    <header style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'flex-start' }}>
                      <div style={{ minWidth: 0 }}>
                        <h2 style={{ fontFamily: 'var(--serif)', fontSize: '19px', color: 'var(--black)', letterSpacing: '-0.3px', lineHeight: 1.25 }}>
                          {c.titulo}
                        </h2>
                        <p style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '4px' }}>
                          {c.nombre_proyecto} · {c.entidad_organizadora}
                        </p>
                      </div>
                      <InsigniaVerificado />
                    </header>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '12px' }}>
                      {c.categorias.map(id => (
                        <span key={id} className="status-pill"
                          style={{ background: 'var(--subtle)', color: 'var(--text)' }}>
                          {etiquetaCategoria.get(id) ?? id}
                        </span>
                      ))}
                      {c.tipo_remuneracion && (
                        <span className="status-pill status-pill--published">
                          {REMUNERACION_CORTA[c.tipo_remuneracion] ?? c.tipo_remuneracion}
                        </span>
                      )}
                    </div>

                    <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginTop: '14px' }}>
                      <div>
                        <dt className="obras-stat-label">Lugar</dt>
                        <dd style={{ fontSize: '13px', color: 'var(--text)' }}>{lugar(c.ciudad, c.pais)}</dd>
                      </div>
                      <div>
                        <dt className="obras-stat-label">Plazo</dt>
                        <dd style={{ fontSize: '13px', color: 'var(--text)' }}>
                          {fecha(c.fecha_apertura)} – {fecha(c.fecha_cierre)}
                        </dd>
                      </div>
                    </dl>

                  </article>
                </Link>
              ))}
            </div>
          )}

        </div>
      </main>
    </>
  )
}
