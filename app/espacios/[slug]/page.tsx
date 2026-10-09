import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import TopNav from '@/components/design-system/TopNav'
import AtribucionEspacios from '@/components/espacios/AtribucionEspacios'
import MapaDiferido from '@/components/espacios/MapaDiferido'
import ReclamarFicha from '@/components/espacios/ReclamarFicha'
import SugerirCorreccion from '@/components/espacios/SugerirCorreccion'
import TarjetaEspacio from '@/components/espacios/TarjetaEspacio'
import { espaciosPublicados, fichaPublicada } from '@/lib/espacios/datos'
import { puntosDe } from '@/lib/espacios/mapa'
import {
  creditoImagen,
  etiquetaAccesibilidad,
  etiquetaTipo,
  etiquetaTitularidad,
  hrefTelefono,
  imagenSegura,
  jsonLdEspacio,
  otrosDelMunicipio,
  redesDe,
  rutaFicha,
  rutaMunicipio,
  textoAforo,
  textoCredito,
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
    ?? `${etiquetaTipo(e.tipo)} en ${e.municipio}${e.isla ? ` (${e.isla})` : ''}, ${e.region}. Dirección, contacto, aforo y cómo llegar.`
  const foto = creditoImagen(e) ? imagenSegura(e.imagen_url) : null
  return {
    title: titulo,
    description: descripcion,
    alternates: { canonical: rutaFicha(e.slug) },
    openGraph: {
      title: titulo, description: descripcion, url: rutaFicha(e.slug), siteName: 'ObrasDeTeatro', locale: 'es_ES', type: 'website',
      ...(foto ? { images: [{ url: foto }] } : {}),
    },
  }
}

/** Fila de datos: etiqueta y valor, solo si hay valor. */
function Dato({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="obras-stat-label">{etiqueta}</dt>
      <dd>{children}</dd>
    </div>
  )
}

/**
 * Ficha pública de un espacio escénico. Solo las publicadas (RLS y filtro);
 * borrador o retirado → 404. Cada bloque sale solo si tiene datos.
 */
export default async function EspacioPage({ params }: Props) {
  const { slug } = await params
  const e = await fichaPublicada(slug)
  if (!e) notFound()

  const credito = creditoImagen(e)
  const foto = credito ? imagenSegura(e.imagen_url) : null
  const web = webEnlazable(e.web)
  const redes = redesDe(e.redes)
  const pais = getCountryByCode(e.pais_code)?.name ?? e.pais_code
  const otros = otrosDelMunicipio(await espaciosPublicados(), e)
  const jsonLd = jsonLdEspacio(e, `${SITIO}${rutaFicha(e.slug)}`)
  const direccion = [e.direccion, [e.codigo_postal, e.municipio].filter(Boolean).join(' ')].filter(Boolean).join(', ')
  const hayHistoria = Boolean(e.anio_inauguracion || e.arquitecto || e.titularidad)

  return (
    <>
      <TopNav />
      <script
        type="application/ld+json"
        // «<» escapado: el nombre o la descripción no pueden cerrar el <script>.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
      <main style={{ background: 'var(--off)', minHeight: '100vh', padding: '32px 16px 64px' }}>
        <div style={{ maxWidth: '860px', margin: '0 auto' }}>

          <nav aria-label="Migas de pan" style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '16px' }}>
            <Link href="/espacios" className="table-link">Espacios escénicos</Link>
            {' / '}
            <Link href={rutaMunicipio(e.pais_code, e.municipio_slug)} className="table-link">{e.municipio}</Link>
          </nav>

          <div className="esp-cabecera">
            {foto && <Image src={foto} alt={`${e.nombre}`} fill priority sizes="(max-width: 900px) 100vw, 860px" />}
          </div>
          {credito
            ? (
              <p className="esp-credito">
                <a href={credito.fuente} target="_blank" rel="noopener">{textoCredito(credito)}</a>
              </p>
            )
            : <div style={{ height: '12px' }} />}

          <article className="account-card">
            <p className="esp-tarjeta-tipo">{etiquetaTipo(e.tipo)}</p>
            <h1 className="page-title" style={{ marginTop: '6px' }}>{e.nombre}</h1>
            <p style={{ fontSize: '14px', color: 'var(--muted)', marginTop: '6px' }}>
              {[e.municipio, e.isla, e.region !== e.municipio ? e.region : null, pais].filter(Boolean).join(' · ')}
            </p>
            {e.verificado && <p style={{ marginTop: '10px' }}><span className="esp-sello">Ficha verificada</span></p>}

            <section className="esp-bloque" aria-labelledby="esp-practicos">
              <h2 id="esp-practicos" className="esp-bloque-titulo">Datos prácticos</h2>
              <dl className="esp-ficha-datos" style={{ marginTop: 0 }}>
                <Dato etiqueta={e.direccion ? 'Dirección' : 'Municipio'}>{direccion}</Dato>
                {e.telefono && <Dato etiqueta="Teléfono"><a href={hrefTelefono(e.telefono)} className="table-link">{e.telefono}</a></Dato>}
                {e.email && <Dato etiqueta="Email"><a href={`mailto:${e.email}`} className="table-link">{e.email}</a></Dato>}
                {web && <Dato etiqueta="Web"><a href={web} target="_blank" rel="noopener" className="table-link">{webVisible(web)} ↗</a></Dato>}
                {redes.length > 0 && (
                  <Dato etiqueta="Redes">
                    <span className="esp-redes">
                      {redes.map(r => <a key={r.clave} href={r.url} target="_blank" rel="noopener" className="table-link">{r.label} ↗</a>)}
                    </span>
                  </Dato>
                )}
                {e.aforo && <Dato etiqueta="Aforo">{textoAforo(e.aforo)}</Dato>}
                {e.num_salas && <Dato etiqueta="Salas">{e.num_salas}</Dato>}
                {e.accesibilidad && <Dato etiqueta="Accesibilidad">{etiquetaAccesibilidad(e.accesibilidad)}</Dato>}
              </dl>
            </section>

            {hayHistoria && (
              <section className="esp-bloque" aria-labelledby="esp-historia">
                <h2 id="esp-historia" className="esp-bloque-titulo">Historia</h2>
                <dl className="esp-ficha-datos" style={{ marginTop: 0 }}>
                  {e.anio_inauguracion && <Dato etiqueta="Inauguración">{e.anio_inauguracion}</Dato>}
                  {e.arquitecto && <Dato etiqueta="Arquitectura">{e.arquitecto}</Dato>}
                  {e.titularidad && <Dato etiqueta="Titularidad">{etiquetaTitularidad(e.titularidad)}</Dato>}
                </dl>
              </section>
            )}

            {e.descripcion && (
              <section className="esp-bloque" aria-labelledby="esp-descripcion">
                <h2 id="esp-descripcion" className="esp-bloque-titulo">Sobre el espacio</h2>
                <p style={{ fontSize: '14px', color: 'var(--text)', lineHeight: 1.7, whiteSpace: 'pre-line' }}>{e.descripcion}</p>
              </section>
            )}

            <section className="esp-bloque" aria-labelledby="esp-ubicacion">
              <h2 id="esp-ubicacion" className="esp-bloque-titulo">Ubicación</h2>
              <MapaDiferido puntos={puntosDe([e])} alto={260} />
              <div className="esp-acciones">
                <a href={urlComoLlegar(e.lat, e.lon)} target="_blank" rel="noopener" className="ds-btn-primary"
                  style={{ width: 'auto', padding: '10px 18px', fontSize: '13px', display: 'inline-flex' }}>
                  Cómo llegar ↗
                </a>
              </div>
            </section>

            <section className="esp-bloque" aria-labelledby="esp-tu-espacio">
              {e.verificado ? (
                <>
                  <h2 id="esp-tu-espacio" className="esp-bloque-titulo">Ficha verificada</h2>
                  <p style={{ fontSize: '13px', color: 'var(--text)', lineHeight: 1.6 }}>
                    <span className="esp-sello">Ficha verificada</span>{' '}
                    El equipo del espacio gestiona esta ficha en ObrasDeTeatro®.
                  </p>
                </>
              ) : (
                <div className="esp-reclama">
                  <h2 id="esp-tu-espacio" className="esp-bloque-titulo" style={{ marginBottom: '4px' }}>¿Es tu espacio?</h2>
                  <p style={{ fontSize: '13px', color: 'var(--text)', lineHeight: 1.6 }}>
                    Si diriges o gestionas {e.nombre}, reclama la ficha para tenerla al día tú mismo:
                  </p>
                  <ul>
                    <li>tus propias fotos;</li>
                    <li>la ficha técnica del espacio, para que las compañías sepan qué pueden montar;</li>
                    <li>tu programación;</li>
                    <li>y, más adelante, la venta de entradas.</li>
                  </ul>
                  <ReclamarFicha espacioId={e.id} slug={e.slug} />
                </div>
              )}
            </section>

            <section className="esp-bloque" aria-label="Sugerir una corrección">
              <SugerirCorreccion espacioId={e.id} />
            </section>
          </article>

          {otros.length > 0 && (
            <section className="esp-seccion" aria-labelledby="esp-otros">
              <h2 id="esp-otros" className="esp-seccion-titulo">Otros espacios en {e.municipio}</h2>
              <ul className="esp-tarjetas">
                {otros.map(o => <TarjetaEspacio key={o.id} espacio={o} />)}
              </ul>
            </section>
          )}

          <AtribucionEspacios />
        </div>
      </main>
    </>
  )
}
