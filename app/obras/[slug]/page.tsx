import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import TopNav from '@/components/design-system/TopNav'
import { COUNTRIES } from '@/lib/geo/countries'
import { WORK_RIGHTS_LABELS } from '@/lib/obras-system'
import type { WorkRightsStatus } from '@/lib/obras-system'

const IDIOMA_LABEL: Record<string, string> = {
  es: 'Español', ca: 'Catalán', eu: 'Euskera', gl: 'Gallego',
  va: 'Valenciano', en: 'Inglés', fr: 'Francés', pt: 'Portugués',
  de: 'Alemán', it: 'Italiano',
}

const RIGHTS_DOT: Record<string, string> = {
  public_domain: 'obra-rights-dot--green',
  managed:       'obra-rights-dot--yellow',
  restricted:    'obra-rights-dot--red',
}

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from('works')
    .select('title, synopsis_short, synopsis, author')
    .eq('slug', slug)
    .eq('is_published', true)
    .is('deleted_at', null)
    .single()

  if (!data) return { title: 'Obra no encontrada | ObrasDeTeatro' }

  const desc = data.synopsis_short ?? data.synopsis
  return {
    title: `${data.title} | ObrasDeTeatro`,
    description: desc
      ? desc.slice(0, 160)
      : `Ficha de "${data.title}"${data.author ? ` de ${data.author}` : ''} en ObrasDeTeatro.`,
  }
}

export default async function ObraPublicaPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: obra } = await supabase
    .from('works')
    .select('id, title, subtitle, author, synopsis, synopsis_short, synopsis_full, genre, secondary_genres, duration_minutes, min_age, cast_size_min, cast_size_max, language, country_code, year, rights_status, rights_manager, access_type, cover_image_url, source_name, source_url, is_library_work, is_published, deleted_at, created_at, profile_id, institution_id')
    .eq('slug', slug)
    .single()

  if (!obra || !obra.is_published || obra.deleted_at) notFound()

  const { data: institution } = obra.institution_id
    ? await supabase.from('institutions').select('name, slug').eq('id', obra.institution_id).single()
    : { data: null }

  const { data: perfil } = obra.profile_id
    ? await supabase.from('profiles').select('nombre, nombre_artistico, slug').eq('id', obra.profile_id).single()
    : { data: null }

  const { data: scriptFiles } = await supabase
    .from('work_files')
    .select('file_url, file_name')
    .eq('work_id', obra.id)
    .eq('file_type', 'script')
    .eq('is_public', true)

  const { data: obrasMismoAutor } = obra.author
    ? await supabase
        .from('works')
        .select('id, title, slug, genre, year')
        .eq('author', obra.author)
        .eq('is_published', true)
        .is('deleted_at', null)
        .neq('id', obra.id)
        .limit(3)
    : { data: null }

  const { data: obrasMismoGenero } = obra.genre
    ? await supabase
        .from('works')
        .select('id, title, slug, genre, year, author')
        .eq('genre', obra.genre)
        .eq('is_published', true)
        .is('deleted_at', null)
        .neq('id', obra.id)
        .limit(3)
    : { data: null }

  /* ── Derived values ── */

  const countryName = obra.country_code
    ? (COUNTRIES.find(c => c.code === obra.country_code)?.name ?? obra.country_code)
    : null

  const autorDisplay = perfil?.nombre_artistico ?? perfil?.nombre ?? obra.author

  const sinopsisCorta = obra.synopsis_short ?? obra.synopsis
  const sinopsisExtendida =
    obra.synopsis_full && obra.synopsis_full !== sinopsisCorta
      ? obra.synopsis_full
      : null

  let reparto = ''
  if (obra.cast_size_min && obra.cast_size_max) {
    reparto =
      obra.cast_size_min === obra.cast_size_max
        ? `${obra.cast_size_min} personaje${obra.cast_size_min === 1 ? '' : 's'}`
        : `${obra.cast_size_min}–${obra.cast_size_max} personajes`
  } else if (obra.cast_size_min) {
    reparto = `${obra.cast_size_min}+`
  } else if (obra.cast_size_max) {
    reparto = `Hasta ${obra.cast_size_max}`
  }

  const rightsLabel = obra.rights_status
    ? (WORK_RIGHTS_LABELS[obra.rights_status as WorkRightsStatus] ?? obra.rights_status)
    : null

  const rightsDotClass =
    RIGHTS_DOT[obra.rights_status ?? ''] ?? 'obra-rights-dot--gray'

  const scriptFile = scriptFiles?.[0] ?? null
  const hasResources = !!(scriptFile || obra.source_url)
  const hasRelated =
    (obrasMismoAutor?.length ?? 0) > 0 || (obrasMismoGenero?.length ?? 0) > 0

  const showDerechos = !!(rightsLabel || institution || obra.rights_manager)
  const hasTecnica = !!(
    obra.duration_minutes || reparto || obra.language || countryName || obra.min_age !== null
  )

  return (
    <>
      <TopNav />
      <div style={{ background: 'var(--white)', minHeight: '100vh' }}>
        <main className="obra-page">

          {/* Breadcrumb */}
          <nav className="obra-breadcrumb" aria-label="Ruta de navegación">
            <Link href="/obras">← Biblioteca de Obras</Link>
            {obra.genre && (
              <>
                <span className="obra-breadcrumb-sep" aria-hidden="true">/</span>
                <span>{obra.genre}</span>
              </>
            )}
          </nav>

          {/* Cabecera */}
          <header className="obra-header">
            {obra.genre && (
              <p className="obra-header-eyebrow">{obra.genre}</p>
            )}
            <h1 className="obra-titulo">{obra.title}</h1>
            {obra.subtitle && (
              <p className="obra-subtitulo">{obra.subtitle}</p>
            )}
            <div className="obra-meta-line">
              {autorDisplay && (
                perfil?.slug ? (
                  <Link href={`/perfil/${perfil.slug}`} className="obra-meta-author">
                    {autorDisplay}
                  </Link>
                ) : (
                  <span className="obra-meta-author">{autorDisplay}</span>
                )
              )}
              {obra.year && (
                <>
                  <span className="obra-meta-sep" aria-hidden="true">·</span>
                  <span>{obra.year}</span>
                </>
              )}
              {countryName && (
                <>
                  <span className="obra-meta-sep" aria-hidden="true">·</span>
                  <span>{countryName}</span>
                </>
              )}
            </div>
          </header>

          {/* Cuerpo */}
          <div className="obra-body">

            {/* Columna principal */}
            <article className="obra-main">
              {sinopsisCorta && (
                <section>
                  <p className="obra-section-label">Sinopsis</p>
                  <p className="obra-sinopsis">{sinopsisCorta}</p>
                  {sinopsisExtendida && (
                    <p className="obra-sinopsis-full">{sinopsisExtendida}</p>
                  )}
                </section>
              )}

              {obra.cover_image_url && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={obra.cover_image_url}
                  alt={`Portada de ${obra.title}`}
                  className="obra-cover"
                />
              )}

              {obra.secondary_genres && obra.secondary_genres.length > 0 && (
                <div className="obra-tags-section">
                  <p className="obra-section-label">Géneros y categorías</p>
                  <div className="obra-tags">
                    {obra.secondary_genres.map(g => (
                      <span key={g} className="obra-tag">{g}</span>
                    ))}
                  </div>
                </div>
              )}
            </article>

            {/* Sidebar */}
            <aside className="obra-sidebar">

              {/* Ficha técnica */}
              {hasTecnica && (
                <div className="obra-sidebar-block">
                  <p className="obra-sidebar-block-title">Ficha técnica</p>
                  <div className="obra-data-grid">
                    {obra.duration_minutes && (
                      <div>
                        <p className="obra-data-label">Duración</p>
                        <p className="obra-data-value">{obra.duration_minutes} min</p>
                      </div>
                    )}
                    {reparto && (
                      <div>
                        <p className="obra-data-label">Personajes</p>
                        <p className="obra-data-value">{reparto}</p>
                      </div>
                    )}
                    {obra.language && (
                      <div>
                        <p className="obra-data-label">Idioma</p>
                        <p className="obra-data-value">
                          {IDIOMA_LABEL[obra.language] ?? obra.language}
                        </p>
                      </div>
                    )}
                    {countryName && (
                      <div>
                        <p className="obra-data-label">País</p>
                        <p className="obra-data-value">{countryName}</p>
                      </div>
                    )}
                    {obra.min_age !== null && obra.min_age !== undefined && (
                      <div>
                        <p className="obra-data-label">Edad mínima</p>
                        <p className="obra-data-value">+{obra.min_age} años</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Derechos */}
              {showDerechos && (
                <div className="obra-sidebar-block">
                  <p className="obra-sidebar-block-title">Derechos</p>
                  <div className="obra-rights">
                    <div
                      className={`obra-rights-dot ${rightsDotClass}`}
                      aria-hidden="true"
                    />
                    <div>
                      {rightsLabel && (
                        <p className="obra-rights-status">{rightsLabel}</p>
                      )}
                      {obra.rights_manager && (
                        <p className="obra-rights-detail">
                          Gestor: {obra.rights_manager}
                        </p>
                      )}
                      {institution && !obra.rights_manager && (
                        <p className="obra-rights-detail">{institution.name}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Recursos */}
              {hasResources && (
                <div className="obra-sidebar-block">
                  <p className="obra-sidebar-block-title">Recursos</p>

                  {scriptFile && (
                    <>
                      <a
                        href={scriptFile.file_url}
                        className="obra-btn-download"
                        download
                        rel="noopener noreferrer"
                      >
                        <svg
                          width="14" height="14" viewBox="0 0 24 24"
                          fill="none" stroke="currentColor"
                          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                          <polyline points="7 10 12 15 17 10"/>
                          <line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                        {scriptFile.file_name ?? 'Descargar guión'}
                      </a>
                      {obra.rights_status === 'public_domain' && (
                        <p className="obra-access-note">Descarga libre · Dominio público</p>
                      )}
                    </>
                  )}

                  {obra.source_url && (
                    <div className={scriptFile ? 'obra-source' : ''}>
                      <p className="obra-source-lbl">Fuente documental</p>
                      <a
                        href={obra.source_url}
                        className="obra-source-a"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {obra.source_name ?? obra.source_url}
                        <svg
                          width="11" height="11" viewBox="0 0 24 24"
                          fill="none" stroke="currentColor"
                          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                          <polyline points="15 3 21 3 21 9"/>
                          <line x1="10" y1="14" x2="21" y2="3"/>
                        </svg>
                      </a>
                    </div>
                  )}
                </div>
              )}

            </aside>
          </div>

          {/* Obras relacionadas */}
          {hasRelated && (
            <section className="obra-related" aria-label="Obras relacionadas">
              {(obrasMismoAutor?.length ?? 0) > 0 && (
                <div>
                  <p className="obra-related-section-title">
                    Más obras de {obra.author}
                  </p>
                  <div className="obra-related-grid">
                    {(obrasMismoAutor ?? []).filter(r => r.slug).map(r => (
                      <Link
                        key={r.id}
                        href={`/obras/${r.slug}`}
                        className="obra-related-card"
                      >
                        {r.genre && (
                          <span className="obra-related-genre">{r.genre}</span>
                        )}
                        <span className="obra-related-title">{r.title}</span>
                        {r.year && (
                          <span className="obra-related-meta">{r.year}</span>
                        )}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {(obrasMismoGenero?.length ?? 0) > 0 && (
                <div>
                  <p className="obra-related-section-title">
                    Otras obras de {obra.genre}
                  </p>
                  <div className="obra-related-grid">
                    {(obrasMismoGenero ?? []).filter(r => r.slug).map(r => (
                      <Link
                        key={r.id}
                        href={`/obras/${r.slug}`}
                        className="obra-related-card"
                      >
                        {r.genre && (
                          <span className="obra-related-genre">{r.genre}</span>
                        )}
                        <span className="obra-related-title">{r.title}</span>
                        {(r.author || r.year) && (
                          <span className="obra-related-meta">
                            {r.author}{r.author && r.year ? ' · ' : ''}{r.year}
                          </span>
                        )}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

        </main>

        <footer className="app-footer">
          <Link href="/" className="footer-logo">
            obras<span>de</span>teatro.com
          </Link>
          <p className="footer-copy">
            © 2026 obrasdeteatro.com — Ecosistema del teatro en español · 20 países
          </p>
        </footer>
      </div>
    </>
  )
}
