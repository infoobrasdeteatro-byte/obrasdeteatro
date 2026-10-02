import type { Metadata } from 'next'
import Link from 'next/link'
import TopNav from '@/components/design-system/TopNav'
import { createClient } from '@/lib/supabase/server'
import { COUNTRIES } from '@/lib/geo/countries'
import { fecha } from '@/components/shared/formato'
import { enlaceSeguro, nombrePais } from '@/lib/noticias/presentacion'

const TITULO = 'Noticias de artes escénicas | ObrasDeTeatro'
const DESCRIPCION =
  'Selección diaria de noticias de teatro y artes escénicas de los 20 países hispanohablantes: resúmenes breves con enlace a la fuente original.'

export const metadata: Metadata = {
  title: TITULO,
  description: DESCRIPCION,
  alternates: { canonical: '/noticias' },
  openGraph: {
    title: TITULO,
    description: DESCRIPCION,
    url: '/noticias',
    siteName: 'ObrasDeTeatro',
    locale: 'es_ES',
    type: 'website',
  },
}

const POR_PAGINA = 20
const CORREO_RETIRADA = 'legal@obrasdeteatro.com'

type Props = {
  searchParams: Promise<{ pais?: string; cat?: string; pagina?: string }>
}

/**
 * Sección pública de noticias.
 *
 * Accesible SIN sesión. Lee SOLO de la vista noticias_publicas, nunca de la
 * tabla noticias: la vista ya filtra estado = 'publicada' y expone únicamente
 * las columnas de la tarjeta (nada de quién revisó, lotes ni motivos).
 *
 * Solo un listado: sin fichas individuales, sin imágenes y sin HTML de origen
 * externo. Todo el texto se pinta como texto (React lo escapa) y el único
 * enlace externo es la URL original, abierta aparte y con nofollow.
 */
export default async function NoticiasPage({ searchParams }: Props) {
  const { pais, cat, pagina } = await searchParams
  const supabase = await createClient()

  const paisValido = pais && COUNTRIES.some(c => c.code === pais) ? pais : undefined
  const catValida = cat && /^[a-z][a-z0-9_]*$/.test(cat) ? cat : undefined
  const paginaActual = Math.max(1, Number.parseInt(pagina ?? '1', 10) || 1)
  const desde = (paginaActual - 1) * POR_PAGINA

  let consulta = supabase
    .from('noticias_publicas')
    .select('id, titular, resumen, categoria_etiqueta, pais_code, fuente_nombre, url_original, fecha_original, publicado_at', { count: 'exact' })

  if (paisValido) consulta = consulta.eq('pais_code', paisValido)
  if (catValida) consulta = consulta.eq('categoria_id', catValida)

  const [{ data: noticias, count, error }, { data: categorias }] = await Promise.all([
    consulta
      .order('publicado_at', { ascending: false })
      .order('id', { ascending: false })
      .range(desde, desde + POR_PAGINA - 1),
    supabase.from('noticias_categorias').select('id, etiqueta').order('orden', { ascending: true }),
  ])

  if (error) console.error('/noticias: no se pudo leer noticias_publicas:', error.message)

  const lista = noticias ?? []
  const total = count ?? 0
  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA))
  const hayFiltros = Boolean(paisValido || catValida)

  const enlacePagina = (p: number) => {
    const q = new URLSearchParams()
    if (paisValido) q.set('pais', paisValido)
    if (catValida) q.set('cat', catValida)
    if (p > 1) q.set('pagina', String(p))
    const s = q.toString()
    return s ? `/noticias?${s}` : '/noticias'
  }

  return (
    <>
      <TopNav />
      <main style={{ background: 'var(--off)', minHeight: '100vh', padding: '32px 24px 64px' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>

          <div className="page-header">
            <div className="page-title-group">
              <h1 className="page-title">Noticias</h1>
              <span style={{ fontSize: '13px', color: 'var(--muted)' }}>
                Lo más relevante de las artes escénicas en los países hispanohablantes, en resúmenes breves y con enlace a la fuente original.
              </span>
            </div>
          </div>

          {/* Filtros como formulario GET, igual que en convocatorias: funcionan
              sin JavaScript y dejan la búsqueda en la URL. */}
          <form method="get" className="account-card" style={{ marginBottom: '20px' }}>
            <div className="ds-form-grid">
              <div className="ds-form-group">
                <label className="ds-label" htmlFor="pais">País</label>
                <select id="pais" name="pais" className="ds-select" defaultValue={paisValido ?? ''}>
                  <option value="">Todos</option>
                  {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                </select>
              </div>
              <div className="ds-form-group">
                <label className="ds-label" htmlFor="cat">Categoría</label>
                <select id="cat" name="cat" className="ds-select" defaultValue={catValida ?? ''}>
                  <option value="">Todas</option>
                  {(categorias ?? []).map(c => <option key={c.id} value={c.id}>{c.etiqueta}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '14px' }}>
              <button type="submit" className="ds-btn-primary"
                style={{ width: 'auto', padding: '10px 22px', fontSize: '13px' }}>
                Filtrar
              </button>
              {hayFiltros && <Link href="/noticias" className="table-link">Quitar filtros</Link>}
            </div>
          </form>

          {error ? (
            <div className="obras-empty">
              <p className="obras-empty-text" style={{ marginBottom: 0 }}>
                No se han podido cargar las noticias en este momento. Vuelve a intentarlo en unos minutos.
              </p>
            </div>
          ) : lista.length === 0 ? (
            <div className="obras-empty">
              {hayFiltros ? (
                <p className="obras-empty-text" style={{ marginBottom: 0 }}>
                  Ninguna noticia coincide con estos filtros.{' '}
                  <Link href="/noticias" className="table-link">Ver todas</Link>
                </p>
              ) : (
                <>
                  <p style={{ fontFamily: 'var(--serif)', fontSize: '20px', color: 'var(--black)', marginBottom: '8px' }}>
                    La sección de noticias está a punto de levantar el telón.
                  </p>
                  <p className="obras-empty-text" style={{ marginBottom: 0 }}>
                    Cada día seleccionaremos dos o tres noticias de teatro y artes escénicas de los países
                    hispanohablantes, resumidas y revisadas por nuestro equipo, con enlace a su fuente original.
                  </p>
                </>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {lista.map(n => {
                const enlace = enlaceSeguro(n.url_original)
                return (
                  <article key={n.id} className="account-card">
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                      {n.categoria_etiqueta && (
                        <span className="status-pill" style={{ background: 'var(--subtle)', color: 'var(--text)' }}>
                          {n.categoria_etiqueta}
                        </span>
                      )}
                      <span className="status-pill" style={{ background: 'var(--subtle)', color: 'var(--text)' }}>
                        {nombrePais(n.pais_code)}
                      </span>
                    </div>

                    <h2 style={{ fontFamily: 'var(--serif)', fontSize: '20px', color: 'var(--black)', letterSpacing: '-0.3px', lineHeight: 1.25 }}>
                      {n.titular}
                    </h2>

                    <p style={{ fontSize: '14px', color: 'var(--text)', lineHeight: 1.65, marginTop: '10px' }}>
                      {n.resumen}
                    </p>

                    <p style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '12px' }}>
                      {n.fuente_nombre}
                      {' · '}
                      <time dateTime={n.fecha_original ?? n.publicado_at ?? undefined}>
                        {fecha(n.fecha_original ?? n.publicado_at)}
                      </time>
                    </p>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', justifyContent: 'space-between',
                      marginTop: '14px', paddingTop: '14px', borderTop: '1px solid var(--border)' }}>
                      <p style={{ fontSize: '12px', color: 'var(--muted)', fontStyle: 'italic' }}>
                        Resumen elaborado a partir de {n.fuente_nombre}
                      </p>
                      {enlace && (
                        <a href={enlace} target="_blank" rel="noopener noreferrer nofollow"
                          className="ds-btn-secondary" style={{ padding: '8px 16px', fontSize: '13px' }}>
                          Leer noticia original ↗
                        </a>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
          )}

          {totalPaginas > 1 && (
            <nav aria-label="Paginación de noticias"
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px', fontSize: '13px' }}>
              {paginaActual > 1
                ? <Link href={enlacePagina(paginaActual - 1)} className="table-link">← Más recientes</Link>
                : <span />}
              <span style={{ color: 'var(--muted)' }}>Página {paginaActual} de {totalPaginas}</span>
              {paginaActual < totalPaginas
                ? <Link href={enlacePagina(paginaActual + 1)} className="table-link">Anteriores →</Link>
                : <span />}
            </nav>
          )}

          <footer style={{ marginTop: '40px', paddingTop: '20px', borderTop: '1px solid var(--border)',
            display: 'flex', flexWrap: 'wrap', gap: '8px 20px', fontSize: '13px', color: 'var(--muted)' }}>
            <span>Cada noticia es un resumen propio con enlace a su fuente.</span>
            <Link href="/legal/politica-noticias" className="table-link">Política de noticias</Link>
            <a href={`mailto:${CORREO_RETIRADA}?subject=${encodeURIComponent('Solicitud de retirada de una noticia')}`}
              className="table-link">
              Solicitar retirada
            </a>
          </footer>

        </div>
      </main>
    </>
  )
}
