import Link from 'next/link'
import { fechaFuncion, precioTexto } from '@/lib/cartelera/cartelera'
import type { FichaListado } from '@/lib/cartelera/listado'
import type { ResumenEntradas } from '@/lib/cartelera/datos'
import { rutaEntradas, rutaEspectaculo } from './publico'

/** «15 nov» en la zona de la función. */
const diaCorto = (iso: string, zona: string) =>
  new Intl.DateTimeFormat('es-ES', { timeZone: zona, day: 'numeric', month: 'short' }).format(new Date(iso)).replace(/\./g, '')

/**
 * «Programación» de la ficha de una sala: un renglón por espectáculo con su
 * próxima función. Sin funciones próximas no se pinta.
 */
export default function ProgramacionSala({ fichas, entradas, nombreSala }: {
  fichas: FichaListado[]; entradas: Map<string, ResumenEntradas>; nombreSala: string
}) {
  if (fichas.length === 0) return null
  return (
    <section className="esp-bloque" aria-labelledby="esp-programacion">
      <h2 id="esp-programacion" className="esp-bloque-titulo">Programación</h2>
      <ul className="sala-prog">
        {fichas.map(e => {
          const r = entradas.get(e.id)
          const precio = r ? precioTexto(r.precio, r.moneda, r.gratis ? 'gratis' : undefined) : null
          const varias = e.funciones > 1
          return (
            <li key={e.id} className="sala-prog-fila">
              <Link href={rutaEspectaculo(e.slug)} className="sala-prog-mini" aria-hidden="true" tabIndex={-1}>
                {e.cartel_url
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={e.cartel_url} alt="" loading="lazy" />
                  : null}
              </Link>
              <div style={{ minWidth: 0 }}>
                <Link href={rutaEspectaculo(e.slug)} className="sala-prog-t">{e.titulo}</Link>
                <p className="sala-prog-m">{e.compania_nombre}</p>
                <p className="sala-prog-f">
                  {varias ? 'Próxima: ' : ''}{fechaFuncion(e.proxima.inicio, e.proxima.zona_horaria)}
                  {varias && ` · ${e.funciones} funciones hasta el ${diaCorto(e.ultima, e.proxima.zona_horaria)}`}
                </p>
              </div>
              <div className="sala-prog-acc">
                {precio && <span className="cart-precio">{precio}</span>}
                {r?.directa
                  ? <a href={rutaEntradas(r.directa)} className="cart-btn" rel="nofollow sponsored" target="_blank">Entradas</a>
                  : <Link href={`${rutaEspectaculo(e.slug)}#funciones`} className="cart-btn cart-btn--sec">Ver funciones</Link>}
              </div>
            </li>
          )
        })}
      </ul>
      <p className="ds-form-hint" style={{ marginTop: '10px' }}>
        ¿Programas en {nombreSala}? <Link href="/mis-espectaculos/nuevo" className="table-link">Publica tu espectáculo gratis</Link>
      </p>
    </section>
  )
}
