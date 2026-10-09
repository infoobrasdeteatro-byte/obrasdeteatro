import type { Metadata } from 'next'
import Link from 'next/link'
import TopNav from '@/components/design-system/TopNav'
import FiltrosEspacios from '@/components/espacios/FiltrosEspacios'
import TarjetaEspacio from '@/components/espacios/TarjetaEspacio'
import AtribucionEspacios from '@/components/espacios/AtribucionEspacios'
import { espaciosPublicados } from '@/lib/espacios/datos'
import {
  filtrarEspacios,
  hayFiltros,
  leerFiltros,
  municipiosConEspacios,
  opcionesFiltro,
  rutaMunicipio,
} from '@/lib/espacios/espacios'

const TITULO = 'Espacios escénicos: teatros, auditorios y salas | ObrasDeTeatro®'
const DESCRIPCION =
  'Catálogo de teatros, auditorios, salas y centros culturales con programación escénica. Busca por país, región, municipio y tipo de espacio.'

export const metadata: Metadata = {
  title: TITULO,
  description: DESCRIPCION,
  alternates: { canonical: '/espacios' },
  openGraph: {
    title: TITULO,
    description: DESCRIPCION,
    url: '/espacios',
    siteName: 'ObrasDeTeatro',
    locale: 'es_ES',
    type: 'website',
  },
}

type Props = {
  searchParams: Promise<{ pais?: string | string[]; region?: string | string[]; m?: string | string[]; tipo?: string | string[]; q?: string | string[] }>
}

/**
 * Buscador de espacios escénicos. Catálogo propio, separado de /directorio
 * (perfiles): las fichas las carga la Redacción y el responsable puede
 * reclamarlas.
 *
 * Los datos salen de una lectura pública cacheada 10 minutos
 * (lib/espacios/datos.ts) y se filtran en memoria; la página es dinámica solo
 * por los parámetros de búsqueda.
 */
export default async function EspaciosPage({ searchParams }: Props) {
  const filtros = leerFiltros(await searchParams)
  const todos = await espaciosPublicados()
  const lista = filtrarEspacios(todos, filtros)
  const { paises, regiones, municipios } = opcionesFiltro(todos, filtros)
  const conFiltros = hayFiltros(filtros)
  // Enlaces a las páginas por municipio de lo que se está viendo (sin filtros, todos).
  const paginasMunicipio = municipiosConEspacios(lista)

  return (
    <>
      <TopNav />
      <main style={{ background: 'var(--off)', minHeight: '100vh', padding: '32px 16px 64px' }}>
        <div style={{ maxWidth: '1060px', margin: '0 auto' }}>

          <div className="page-header">
            <div className="page-title-group">
              <h1 className="page-title">Espacios escénicos</h1>
              <span style={{ fontSize: '13px', color: 'var(--muted)' }}>
                Teatros, auditorios, salas y centros culturales. Empezamos por Canarias y seguiremos por el resto de países.
              </span>
            </div>
          </div>

          <FiltrosEspacios filtros={filtros} paises={paises} regiones={regiones} municipios={municipios} conFiltros={conFiltros} />

          {todos.length > 0 && (
            <p className="esp-contador" aria-live="polite">
              {lista.length === 1 ? '1 espacio' : `${lista.length} espacios`}
              {conFiltros ? ' con estos filtros' : ''}
            </p>
          )}

          {lista.length === 0 ? (
            <div className="obras-empty">
              <p className="obras-empty-text" style={{ marginBottom: 0 }}>
                {conFiltros ? 'Ningún espacio coincide con estos filtros.' : 'Todavía no hay espacios publicados.'}
              </p>
            </div>
          ) : (
            <ul className="esp-tarjetas">
              {lista.map(e => <TarjetaEspacio key={e.id} espacio={e} />)}
            </ul>
          )}

          {paginasMunicipio.length > 0 && (
            <nav aria-labelledby="esp-por-municipio" style={{ marginTop: '36px' }}>
              <h2 id="esp-por-municipio" style={{ fontSize: '14px', fontWeight: 600, color: 'var(--black)', marginBottom: '10px' }}>
                Espacios por municipio
              </h2>
              <ul className="esp-municipios">
                {paginasMunicipio.map(m => (
                  <li key={`${m.pais_code}/${m.municipio_slug}`}>
                    <Link href={rutaMunicipio(m.pais_code, m.municipio_slug)} className="table-link">
                      {m.municipio} ({m.total})
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          <AtribucionEspacios />
        </div>
      </main>
    </>
  )
}
