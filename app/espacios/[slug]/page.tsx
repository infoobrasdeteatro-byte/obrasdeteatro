import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import TopNav from '@/components/design-system/TopNav'
import AtribucionEspacios from '@/components/espacios/AtribucionEspacios'
import ReclamarFicha from '@/components/espacios/ReclamarFicha'
import { fichaPublicada } from '@/lib/espacios/datos'
import {
  etiquetaTipo,
  jsonLdEspacio,
  rutaFicha,
  rutaMunicipio,
  urlComoLlegar,
  webEnlazable,
  webVisible,
} from '@/lib/espacios/espacios'
import { getCountryByCode } from '@/lib/geo/countries'
import { SITIO } from '@/lib/convocatorias/resumen-semanal'

type Props = { params: Promise<{ slug: string }> }

// Ficha estática que se regenera cada 10 minutos; las que no se generaron en
// el build se generan en la primera visita.
export const revalidate = 600
export async function generateStaticParams() {
  return []
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const e = await fichaPublicada(slug)
  if (!e) return { title: 'Espacio no encontrado | ObrasDeTeatro®', robots: { index: false } }

  const titulo = `${e.nombre} · ${etiquetaTipo(e.tipo)} en ${e.municipio} | ObrasDeTeatro®`
  const descripcion = e.descripcion
    ?? `${etiquetaTipo(e.tipo)} en ${e.municipio}${e.isla ? ` (${e.isla})` : ''}, ${e.region}. Dirección, web y cómo llegar.`
  return {
    title: titulo,
    description: descripcion,
    alternates: { canonical: rutaFicha(e.slug) },
    openGraph: { title: titulo, description: descripcion, url: rutaFicha(e.slug), siteName: 'ObrasDeTeatro', locale: 'es_ES', type: 'website' },
  }
}

/**
 * Ficha pública de un espacio escénico. Solo las publicadas (RLS y filtro);
 * borrador o retirado → 404.
 */
export default async function EspacioPage({ params }: Props) {
  const { slug } = await params
  const e = await fichaPublicada(slug)
  if (!e) notFound()

  const web = webEnlazable(e.web)
  const pais = getCountryByCode(e.pais_code)?.name ?? e.pais_code
  const jsonLd = jsonLdEspacio(e, `${SITIO}${rutaFicha(e.slug)}`)

  return (
    <>
      <TopNav />
      <script
        type="application/ld+json"
        // «<» escapado: el nombre o la descripción no pueden cerrar el <script>.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
      <main style={{ background: 'var(--off)', minHeight: '100vh', padding: '32px 16px 64px' }}>
        <div style={{ maxWidth: '820px', margin: '0 auto' }}>

          <nav aria-label="Migas de pan" style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '16px' }}>
            <Link href="/espacios" className="table-link">Espacios escénicos</Link>
            {' / '}
            <Link href={rutaMunicipio(e.pais_code, e.municipio_slug)} className="table-link">{e.municipio}</Link>
          </nav>

          <article className="account-card">
            <p className="esp-tarjeta-tipo">{etiquetaTipo(e.tipo)}</p>
            <h1 className="page-title" style={{ marginTop: '6px' }}>{e.nombre}</h1>

            {e.descripcion && (
              <p style={{ fontSize: '14px', color: 'var(--text)', lineHeight: 1.65, marginTop: '14px', whiteSpace: 'pre-line' }}>
                {e.descripcion}
              </p>
            )}

            <dl className="esp-ficha-datos">
              <div>
                <dt className="obras-stat-label">{e.direccion ? 'Dirección' : 'Municipio'}</dt>
                <dd>{e.direccion ? `${e.direccion}, ${e.municipio}` : e.municipio}</dd>
              </div>
              {e.isla && (
                <div>
                  <dt className="obras-stat-label">Isla</dt>
                  <dd>{e.isla}</dd>
                </div>
              )}
              <div>
                <dt className="obras-stat-label">Ubicación</dt>
                <dd>{[e.provincia && e.provincia !== e.region ? e.provincia : null, e.region, pais].filter(Boolean).join(', ')}</dd>
              </div>
              {web && (
                <div>
                  <dt className="obras-stat-label">Web</dt>
                  <dd><a href={web} target="_blank" rel="noopener" className="table-link">{webVisible(web)} ↗</a></dd>
                </div>
              )}
              {e.aforo && (
                <div>
                  <dt className="obras-stat-label">Aforo</dt>
                  <dd>{e.aforo.toLocaleString('es-ES')} localidades</dd>
                </div>
              )}
              {e.num_salas && (
                <div>
                  <dt className="obras-stat-label">Salas</dt>
                  <dd>{e.num_salas}</dd>
                </div>
              )}
            </dl>

            <div className="esp-acciones">
              <a href={urlComoLlegar(e.lat, e.lon)} target="_blank" rel="noopener" className="ds-btn-primary"
                style={{ width: 'auto', padding: '10px 18px', fontSize: '13px', display: 'inline-flex' }}>
                Cómo llegar ↗
              </a>
              <ReclamarFicha espacioId={e.id} slug={e.slug} />
            </div>
          </article>

          <AtribucionEspacios />
        </div>
      </main>
    </>
  )
}
