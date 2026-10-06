import Link from 'next/link'
import { IconArrowRight } from './EcoIcons'
import type { ObraPortada } from '@/lib/portada/datos'

/**
 * Las tres últimas obras públicas, tal como están en `works`. Solo se pinta
 * lo que la tabla trae: sin portada no hay foto de archivo, y sin duración
 * no hay duración.
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
          <Link key={o.slug} href={`/obras/${o.slug}`} className="eco-obra-card eco-reveal">
            <div className="eco-obra-img">
              {o.cover_image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={o.cover_image_url} alt={o.title} loading="lazy" decoding="async" />
              ) : (
                <div className="eco-obra-img-vacia" aria-hidden="true">{o.title}</div>
              )}
            </div>
            <div className="eco-obra-body">
              {o.genre && <div className="eco-obra-genre">{o.genre}</div>}
              <div className="eco-obra-title">{o.title}</div>
              {o.author && <div className="eco-obra-company">{o.author}</div>}
              {o.duration_minutes !== null && (
                <div className="eco-obra-meta"><span>{o.duration_minutes} min</span></div>
              )}
            </div>
          </Link>
        ))}
      </div>
    </>
  )
}
