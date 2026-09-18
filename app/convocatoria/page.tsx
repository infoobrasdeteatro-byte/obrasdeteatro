import type { Metadata } from 'next'
import Link from 'next/link'
import TopNav from '@/components/design-system/TopNav'
import { createClient } from '@/lib/supabase/server'
import { CATEGORIAS, etiquetaCategoria } from '@/components/convocatorias/vocabulario'
import { fecha } from '@/components/shared/formato'

export const metadata: Metadata = {
  title: 'Convocatorias | ObrasDeTeatro',
}

type Props = {
  searchParams: Promise<{ cat?: string; lugar?: string }>
}

/**
 * Listado público de convocatorias.
 *
 * Accesible SIN sesión. La visibilidad la decide la política RLS
 * «Convocatorias públicas» (is_published = true and deleted_at is null), que
 * viene del baseline; el filtro por `estado` que se añade aquí dice lo mismo
 * por el otro lado y deja la intención escrita en la consulta.
 *
 * VA POR PostgREST, NO POR RPC, a diferencia del listado de Castings. Allí la
 * función existe por un motivo concreto: bajo RLS, el ILIKE de ciudad nunca
 * alcanzaba el índice de trigramas, porque PostgreSQL no empuja una cláusula
 * no leakproof por debajo de la barrera de seguridad. Aquí ese problema no se
 * da: `calls` no tiene índice de trigramas sobre `location`, así que no hay
 * ningún plan que perder. Si algún día se añade uno y el volumen lo justifica,
 * este listado tendrá que mudarse a una función SECURITY DEFINER igual que
 * buscar_castings_publicos.
 */
export default async function ConvocatoriasPublicoPage({ searchParams }: Props) {
  const { cat, lugar } = await searchParams
  const supabase = await createClient()

  let consulta = supabase
    .from('calls')
    .select('id, title, description, category, location, deadline, prize, is_featured, fecha_publicacion')
    .eq('estado', 'publicado')
    .is('deleted_at', null)

  if (cat) consulta = consulta.eq('category', cat)
  if (lugar?.trim()) consulta = consulta.ilike('location', `%${lugar.trim()}%`)

  // Destacadas primero, y dentro de cada grupo lo que antes vence. Las que no
  // declaran fecha límite van al final: no compiten con las que sí corren.
  const { data: convocatorias, error } = await consulta
    .order('is_featured', { ascending: false })
    .order('deadline', { ascending: true, nullsFirst: false })
    .limit(50)

  const lista = convocatorias ?? []
  const hayFiltros = Boolean(cat || lugar?.trim())

  return (
    <>
      <TopNav />
      <main style={{ background: 'var(--off)', minHeight: '100vh', padding: '32px 24px 64px' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>

          <div className="page-header">
            <div className="page-title-group">
              <h1 className="page-title">Convocatorias abiertas</h1>
              <span style={{ fontSize: '13px', color: 'var(--muted)' }}>
                Festivales, premios, residencias y becas publicados en la plataforma.
              </span>
            </div>
          </div>

          {/* Filtros como formulario GET: funcionan sin JavaScript y dejan la
              búsqueda en la URL, que así se puede compartir. */}
          <form method="get" className="account-card" style={{ marginBottom: '20px' }}>
            <div className="ds-form-grid">
              <div className="ds-form-group">
                <label className="ds-label" htmlFor="cat">Categoría</label>
                <select id="cat" name="cat" className="ds-select" defaultValue={cat ?? ''}>
                  <option value="">Todas</option>
                  {CATEGORIAS.map(x => (
                    <option key={x.value} value={x.value}>{x.label}</option>
                  ))}
                </select>
                <p className="ds-form-hint">Una sola categoría: en `calls` es una columna, no una lista.</p>
              </div>
              <div className="ds-form-group">
                <label className="ds-label" htmlFor="lugar">Lugar</label>
                <input id="lugar" name="lugar" className="ds-input" defaultValue={lugar ?? ''} placeholder="Madrid" />
                <p className="ds-form-hint">Coincidencia parcial sobre el lugar declarado.</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '14px' }}>
              <button type="submit" className="ds-btn-primary"
                style={{ width: 'auto', padding: '10px 22px', fontSize: '13px' }}>
                Filtrar
              </button>
              {hayFiltros && (
                <Link href="/convocatoria" className="table-link">Quitar filtros</Link>
              )}
            </div>
          </form>

          {error && (
            <div className="ds-alert-error" style={{ marginBottom: '16px' }}>
              No se pudieron cargar las convocatorias: {error.message}
            </div>
          )}

          {lista.length === 0 ? (
            <div className="obras-empty">
              <p className="obras-empty-text" style={{ marginBottom: 0 }}>
                {hayFiltros
                  ? 'Ninguna convocatoria coincide con estos filtros.'
                  : 'No hay convocatorias abiertas en este momento.'}
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {lista.map(c => (
                <Link key={c.id} href={`/convocatoria/${c.id}`}
                  style={{ textDecoration: 'none', color: 'inherit' }}>
                  <article className="account-card">

                    <header style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'flex-start' }}>
                      <div style={{ minWidth: 0 }}>
                        <h2 style={{ fontFamily: 'var(--serif)', fontSize: '19px', color: 'var(--black)', letterSpacing: '-0.3px', lineHeight: 1.25 }}>
                          {c.title}
                        </h2>
                        {c.location && (
                          <p style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '4px' }}>
                            {c.location}
                          </p>
                        )}
                      </div>
                      {c.is_featured && (
                        <span className="status-pill status-pill--published" style={{ flexShrink: 0 }}>
                          Destacada
                        </span>
                      )}
                    </header>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '12px' }}>
                      <span className="status-pill" style={{ background: 'var(--subtle)', color: 'var(--text)' }}>
                        {etiquetaCategoria(c.category)}
                      </span>
                    </div>

                    {c.description && (
                      <p style={{ fontSize: '13px', color: 'var(--text)', lineHeight: 1.6, marginTop: '12px',
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {c.description}
                      </p>
                    )}

                    <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginTop: '14px' }}>
                      <div>
                        <dt className="obras-stat-label">Fecha límite</dt>
                        <dd style={{ fontSize: '13px', color: 'var(--text)' }}>
                          {c.deadline ? fecha(c.deadline) : 'Sin fecha límite'}
                        </dd>
                      </div>
                      {c.prize && (
                        <div>
                          <dt className="obras-stat-label">Dotación</dt>
                          <dd style={{ fontSize: '13px', color: 'var(--text)' }}>{c.prize}</dd>
                        </div>
                      )}
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
