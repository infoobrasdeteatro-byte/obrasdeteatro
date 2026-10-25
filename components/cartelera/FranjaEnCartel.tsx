import Link from 'next/link'
import type { FichaListado } from '@/lib/cartelera/listado'
import type { ResumenEntradas } from '@/lib/cartelera/datos'
import type { EspectaculoAnterior } from '@/lib/cartelera/perfil'
import { etiquetaGenero } from '@/lib/cartelera/cartelera'
import { Poster, TarjetaEspectaculo, TuEspectaculoAqui, rutaEspectaculo } from './publico'

/**
 * Franja «Cartelera» de la portada: los próximos espectáculos por fecha. Con
 * pocos, cierra con la invitación a publicar. Sin funciones próximas no
 * desaparece: enseña los últimos espectáculos ya celebrados («Función
 * pasada», sin botón de entradas) y la invitación a publicar.
 */
export default function FranjaEnCartel({ fichas, entradas, ahora, destacados = new Set(), anteriores = [] }: {
  fichas: FichaListado[]; entradas: Map<string, ResumenEntradas>; ahora: number; destacados?: Set<string>; anteriores?: EspectaculoAnterior[]
}) {
  const sinProximas = fichas.length === 0
  return (
    <section className="home-cartel" aria-labelledby="home-cartel-titulo">
      <div className="home-cartel-inner">
        <header className="home-cartel-head">
          <div>
            <h2 id="home-cartel-titulo" className="home-cartel-titulo">Cartelera</h2>
            <p className="home-cartel-sub">
              {sinProximas
                ? 'Ahora mismo no hay funciones próximas. Estos son los últimos espectáculos publicados: el tuyo puede ser el siguiente.'
                : 'Próximas funciones de teatro en España y Latinoamérica, con horarios y entradas.'}
            </p>
          </div>
          <Link href="/cartelera" className="home-cartel-ver">Ver toda la cartelera →</Link>
        </header>
        <div className="home-cartel-lista">
          {fichas.map(e => (
            <div key={e.id} className="home-cartel-item">
              <TarjetaEspectaculo e={e} entradas={entradas.get(e.id)} ahora={ahora} destacado={destacados.has(e.id)} />
            </div>
          ))}
          {anteriores.map(e => (
            <div key={e.id} className="home-cartel-item">
              <article className="cart-card cart-card--pasada">
                <Link href={rutaEspectaculo(e.slug)} className="cart-card-enlace">
                  <Poster url={e.cartel_url} titulo={e.titulo} tag="FUNCIÓN PASADA" />
                  <div>
                    <h3 className="cart-card-t">{e.titulo}</h3>
                    <p className="cart-card-m">
                      {[etiquetaGenero(e.genero_id), e.ultima ? new Date(e.ultima).getUTCFullYear() : null, e.ciudades[0]].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                </Link>
              </article>
            </div>
          ))}
          {fichas.length < 5 && <div className="home-cartel-item"><TuEspectaculoAqui /></div>}
        </div>
      </div>
    </section>
  )
}
