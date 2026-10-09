import type { Metadata } from 'next'
import Link from 'next/link'
import TopNav from '@/components/design-system/TopNav'
import FiltrosEspacios from '@/components/espacios/FiltrosEspacios'
import TarjetaEspacio from '@/components/espacios/TarjetaEspacio'
import AtribucionEspacios from '@/components/espacios/AtribucionEspacios'
import MapaDiferido from '@/components/espacios/MapaDiferido'
import { espaciosPublicados } from '@/lib/espacios/datos'
import { puntosDe } from '@/lib/espacios/mapa'
import {
  filtrarEspacios,
  hayFiltros,
  leerFiltros,
  municipiosConEspacios,
  nivelExploracion,
  opcionesFiltro,
  paisesConEspacios,
  urlFiltro,
  type ParametrosCrudos,
} from '@/lib/espacios/espacios'
import { getCountryByCode } from '@/lib/geo/countries'

const TITULO = 'Espacios escénicos: teatros, auditorios y salas | ObrasDeTeatro®'
const DESCRIPCION =
  'Teatros, auditorios, salas y centros culturales de los países de habla hispana. Busca por país, ciudad, tipo, aforo y accesibilidad, y consulta cada espacio en el mapa.'

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

type Props = { searchParams: Promise<ParametrosCrudos> }

const total = (n: number) => (n === 1 ? '1 espacio' : `${n} espacios`)

/**
 * Buscador de espacios escénicos. Catálogo propio, separado de /directorio
 * (perfiles): las fichas las carga la Redacción y el responsable puede
 * reclamarlas.
 *
 * Debajo del buscador, según los filtros (nivelExploracion):
 *   - sin filtros: «Explora por país», tarjetas de país con su número;
 *   - con país (y región): tarjetas de sus municipios con su número;
 *   - con municipio u otro filtro: las fichas.
 * El mapa enseña siempre todos los espacios filtrados y se carga diferido.
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
  const nivel = nivelExploracion(filtros)
  const nombrePais = filtros.pais ? getCountryByCode(filtros.pais)?.name ?? filtros.pais : null

  return (
    <>
      <TopNav />
      <main style={{ background: 'var(--off)', minHeight: '100vh', padding: '32px 16px 64px' }}>
        <div style={{ maxWidth: '1060px', margin: '0 auto' }}>

          <div className="page-header">
            <div className="page-title-group">
              <h1 className="page-title">Espacios escénicos</h1>
              <span style={{ fontSize: '13px', color: 'var(--muted)' }}>
                Teatros, auditorios, salas y centros culturales de los países de habla hispana.
              </span>
            </div>
          </div>

          <FiltrosEspacios filtros={filtros} paises={paises} regiones={regiones} municipios={municipios} conFiltros={conFiltros} />

          {todos.length === 0 ? (
            <div className="obras-empty">
              <p className="obras-empty-text" style={{ marginBottom: 0 }}>Todavía no hay espacios publicados.</p>
            </div>
          ) : (
            <>
              {nivel === 'paises' && (
                <section className="esp-seccion" aria-labelledby="esp-explora">
                  <h2 id="esp-explora" className="esp-seccion-titulo">Explora por país</h2>
                  <ul className="esp-explora">
                    {paisesConEspacios(todos).map(p => (
                      <li key={p.code}>
                        <Link href={urlFiltro({ pais: p.code })} className="account-card esp-explora-tarjeta">
                          <span className="esp-explora-nombre">{p.nombre}</span>
                          <span className="esp-explora-total">{total(p.total)}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {nivel === 'municipios' && (
                <section className="esp-seccion" aria-labelledby="esp-municipios">
                  <h2 id="esp-municipios" className="esp-seccion-titulo">
                    Ciudades y municipios {filtros.region ? `de ${filtros.region}` : `de ${nombrePais}`}
                  </h2>
                  <ul className="esp-explora">
                    {municipiosConEspacios(lista).map(m => (
                      <li key={`${m.pais_code}/${m.municipio_slug}`}>
                        <Link href={urlFiltro({ pais: m.pais_code, region: m.region, m: m.municipio_slug })} className="account-card esp-explora-tarjeta">
                          <span className="esp-explora-nombre">{m.municipio}</span>
                          <span className="esp-explora-total">{total(m.total)}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {nivel === 'espacios' && (
                <section className="esp-seccion" aria-labelledby="esp-lista">
                  <h2 id="esp-lista" className="esp-seccion-titulo">
                    {total(lista.length)}{conFiltros ? ' con estos filtros' : ''}
                  </h2>
                  {lista.length === 0 ? (
                    <div className="obras-empty">
                      <p className="obras-empty-text" style={{ marginBottom: 0 }}>Ningún espacio coincide con estos filtros.</p>
                    </div>
                  ) : (
                    <ul className="esp-tarjetas">
                      {lista.map(e => <TarjetaEspacio key={e.id} espacio={e} />)}
                    </ul>
                  )}
                </section>
              )}

              {lista.length > 0 && (
                <section className="esp-seccion" aria-labelledby="esp-mapa-titulo">
                  <h2 id="esp-mapa-titulo" className="esp-seccion-titulo">En el mapa</h2>
                  <MapaDiferido puntos={puntosDe(lista)} />
                </section>
              )}
            </>
          )}

          <AtribucionEspacios />
        </div>
      </main>
    </>
  )
}
