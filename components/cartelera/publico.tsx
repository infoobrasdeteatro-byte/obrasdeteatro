import Link from 'next/link'
import { etiquetaGenero, precioTexto } from '@/lib/cartelera/cartelera'
import { etiquetaProxima, terminaPronto, type FichaListado } from '@/lib/cartelera/listado'
import type { ResumenEntradas } from '@/lib/cartelera/datos'

export const rutaEspectaculo = (slug: string) => `/cartelera/${slug}`
export const rutaEntradas = (opcionId: string) => `/cartelera/entradas/${opcionId}`

/** Cartel vertical; sin imagen, el título sobre fondo oscuro. */
export function Poster({ url, titulo, tag, fin, prioridad }: { url: string | null; titulo: string; tag?: string; fin?: boolean; prioridad?: boolean }) {
  return (
    <div className="cart-poster">
      {tag && <span className="cart-tag">{tag}</span>}
      {fin && <span className="cart-tag cart-tag--fin">ÚLTIMOS DÍAS</span>}
      {url
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={url} alt={`Cartel de ${titulo}`} loading={prioridad ? 'eager' : 'lazy'} />
        : <span className="cart-poster-vacio">{titulo}</span>}
    </div>
  )
}

export function TarjetaEspectaculo({ e, entradas, ahora, prioridad }: { e: FichaListado; entradas?: ResumenEntradas; ahora: number; prioridad?: boolean }) {
  const precio = entradas ? precioTexto(entradas.precio, entradas.moneda, entradas.gratis ? 'gratis' : undefined) : null
  const lugar = e.salas.length > 1 ? `${e.salas.length} salas` : e.salas[0] ?? ''
  const ciudad = e.ciudades.length > 1 ? `${e.ciudades[0]} y ${e.ciudades.length - 1} más` : e.ciudades[0] ?? ''
  return (
    <article className="cart-card">
      <Link href={rutaEspectaculo(e.slug)} className="cart-card-enlace">
        <Poster url={e.cartel_url} titulo={e.titulo} tag={etiquetaProxima(e.proxima, ahora)}
          fin={e.funciones > 1 && terminaPronto(e, ahora)} prioridad={prioridad} />
        <div>
          <h3 className="cart-card-t">{e.titulo}</h3>
          <p className="cart-card-m">{[lugar, ciudad].filter(Boolean).join(' · ')}</p>
          <p className="cart-card-m">
            {etiquetaGenero(e.genero_id)} · {e.funciones} función{e.funciones === 1 ? '' : 'es'}
          </p>
        </div>
      </Link>
      <div className="cart-card-pie">
        <span className="cart-precio">{precio ?? ''}</span>
        {entradas?.directa
          ? <a href={rutaEntradas(entradas.directa)} className="cart-btn" rel="nofollow sponsored" target="_blank">Entradas</a>
          : <Link href={`${rutaEspectaculo(e.slug)}#funciones`} className="cart-btn cart-btn--sec">Ver funciones</Link>}
      </div>
    </article>
  )
}

export function TuEspectaculoAqui() {
  return (
    <Link href="/mis-espectaculos/nuevo" className="cart-tu-espectaculo">
      <strong>Tu espectáculo puede estar aquí</strong>
      <span>Compañías, salas y productoras publican gratis sus funciones y el enlace a las entradas.</span>
      <span className="cart-btn">Publica tu espectáculo gratis</span>
    </Link>
  )
}
