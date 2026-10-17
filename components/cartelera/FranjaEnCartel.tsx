import Link from 'next/link'
import type { FichaListado } from '@/lib/cartelera/listado'
import type { ResumenEntradas } from '@/lib/cartelera/datos'
import { TarjetaEspectaculo, TuEspectaculoAqui } from './publico'

/**
 * Franja «En cartel» de la portada: los próximos espectáculos por fecha.
 * Sin espectáculos no se pinta. Con pocos, cierra con la invitación a publicar.
 */
export default function FranjaEnCartel({ fichas, entradas, ahora, destacados = new Set() }: {
  fichas: FichaListado[]; entradas: Map<string, ResumenEntradas>; ahora: number; destacados?: Set<string>
}) {
  if (fichas.length === 0) return null
  return (
    <section className="home-cartel" aria-labelledby="home-cartel-titulo">
      <div className="home-cartel-inner">
        <header className="home-cartel-head">
          <div>
            <h2 id="home-cartel-titulo" className="home-cartel-titulo">En cartel</h2>
            <p className="home-cartel-sub">Próximas funciones de teatro en España y Latinoamérica, con horarios y entradas.</p>
          </div>
          <Link href="/cartelera" className="home-cartel-ver">Ver toda la cartelera →</Link>
        </header>
        <div className="home-cartel-lista">
          {fichas.map(e => (
            <div key={e.id} className="home-cartel-item">
              <TarjetaEspectaculo e={e} entradas={entradas.get(e.id)} ahora={ahora} destacado={destacados.has(e.id)} />
            </div>
          ))}
          {fichas.length < 5 && <div className="home-cartel-item"><TuEspectaculoAqui /></div>}
        </div>
      </div>
    </section>
  )
}
