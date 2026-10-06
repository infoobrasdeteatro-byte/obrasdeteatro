import Link from 'next/link'
import { IconArrowRight } from './EcoIcons'
import type { ObraPortada } from '@/lib/portada/datos'

/**
 * Las tres últimas obras públicas, con la misma tarjeta que el catálogo de
 * /obras (clases bib-card-*): género, título, autor, año y «Ver ficha →».
 * Solo se pinta lo que la tabla trae: sin año, el hueco queda vacío, como
 * en /obras, para que «Ver ficha →» siga a la derecha.
 */
export default function EcosistemaObrasDestacadas({ obras }: { obras: ObraPortada[] | null }) {
  if (!obras || obras.length === 0) return null

  return (
    <>
      <div className="eco-sec-header">
        <div className="eco-sec-title">Últimas incorporaciones</div>
        <Link href="/obras" className="eco-sec-link">Ver todas <IconArrowRight /></Link>
      </div>
      <div className="eco-obras-grid">
        {obras.map(o => (
          <Link key={o.slug} href={`/obras/${o.slug}`} className="bib-card eco-reveal">
            {o.genre && <div className="bib-card-genero">{o.genre}</div>}
            <h3 className="bib-card-titulo">{o.title}</h3>
            {o.author && <p className="bib-card-autor">{o.author}</p>}
            <div className="bib-card-footer">
              <span className="bib-card-año">{o.year ?? ''}</span>
              <span className="bib-card-action">Ver ficha →</span>
            </div>
          </Link>
        ))}
      </div>
    </>
  )
}
