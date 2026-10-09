import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import TopNav from '@/components/design-system/TopNav'
import TarjetaEspacio from '@/components/espacios/TarjetaEspacio'
import AtribucionEspacios from '@/components/espacios/AtribucionEspacios'
import { espaciosPublicadosOLanza } from '@/lib/espacios/datos'
import { rutaMunicipio, type EspacioTarjeta } from '@/lib/espacios/espacios'
import { getCountryByCode } from '@/lib/geo/countries'

/**
 * Página por municipio para buscadores: /espacios/es/santa-cruz-de-tenerife.
 *
 * El primer segmento es el código de país en minúsculas. Se llama [slug]
 * porque comparte nivel con la ficha (/espacios/[slug]) y Next no admite dos
 * nombres distintos para el mismo segmento dinámico; una ficha nunca tiene
 * un segundo segmento, así que no chocan.
 *
 * Solo existe con al menos un espacio publicado en el municipio: si no, 404.
 */
type Props = { params: Promise<{ slug: string; municipio: string }> }

export const revalidate = 600
export async function generateStaticParams() {
  return []
}

async function espaciosDelMunicipio(paisParam: string, municipio: string): Promise<{ pais: string; lista: EspacioTarjeta[] } | null> {
  const pais = paisParam.toUpperCase()
  if (paisParam !== paisParam.toLowerCase() || !getCountryByCode(pais)) return null
  const lista = (await espaciosPublicadosOLanza())
    .filter(e => e.pais_code === pais && e.municipio_slug === municipio)
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
  return lista.length > 0 ? { pais, lista } : null
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, municipio } = await params
  const datos = await espaciosDelMunicipio(slug, municipio)
  if (!datos) return { title: 'Municipio sin espacios | ObrasDeTeatro®', robots: { index: false } }

  const nombre = datos.lista[0].municipio
  const titulo = `Teatros y espacios escénicos en ${nombre} | ObrasDeTeatro®`
  const descripcion = `${datos.lista.length === 1 ? 'Un espacio escénico' : `${datos.lista.length} espacios escénicos`} en ${nombre}: ${datos.lista.slice(0, 4).map(e => e.nombre).join(', ')}${datos.lista.length > 4 ? '…' : '.'}`
  const ruta = rutaMunicipio(datos.pais, municipio)
  return {
    title: titulo,
    description: descripcion,
    alternates: { canonical: ruta },
    openGraph: { title: titulo, description: descripcion, url: ruta, siteName: 'ObrasDeTeatro', locale: 'es_ES', type: 'website' },
  }
}

export default async function EspaciosMunicipioPage({ params }: Props) {
  const { slug, municipio } = await params
  const datos = await espaciosDelMunicipio(slug, municipio)
  if (!datos) notFound()

  const primero = datos.lista[0]
  const filtroRegion = `/espacios?${new URLSearchParams({ pais: datos.pais, region: primero.region }).toString()}`

  return (
    <>
      <TopNav />
      <main style={{ background: 'var(--off)', minHeight: '100vh', padding: '32px 16px 64px' }}>
        <div style={{ maxWidth: '1060px', margin: '0 auto' }}>

          <nav aria-label="Migas de pan" style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '16px' }}>
            <Link href="/espacios" className="table-link">Espacios escénicos</Link>
            {' / '}
            <Link href={filtroRegion} className="table-link">{primero.region}</Link>
          </nav>

          <div className="page-header">
            <div className="page-title-group">
              <h1 className="page-title">Teatros y espacios escénicos en {primero.municipio}</h1>
              <span style={{ fontSize: '13px', color: 'var(--muted)' }}>
                {[primero.isla, primero.region, getCountryByCode(datos.pais)?.name].filter(Boolean).join(' · ')}
                {' — '}
                {datos.lista.length === 1 ? '1 espacio' : `${datos.lista.length} espacios`}
              </span>
            </div>
          </div>

          <ul className="esp-tarjetas">
            {datos.lista.map(e => <TarjetaEspacio key={e.id} espacio={e} />)}
          </ul>

          <AtribucionEspacios />
        </div>
      </main>
    </>
  )
}
