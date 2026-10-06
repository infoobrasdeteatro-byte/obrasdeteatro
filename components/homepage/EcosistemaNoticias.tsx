import Link from 'next/link'
import { IconArrowRight } from './EcoIcons'
import type { NoticiaPortada } from '@/lib/portada/datos'

/**
 * Las tres últimas noticias publicadas (vista noticias_publicas): titular y
 * medio, con enlace a /noticias. Sin noticias, el bloque no se pinta.
 */
export default function EcosistemaNoticias({ noticias }: { noticias: NoticiaPortada[] | null }) {
  if (!noticias || noticias.length === 0) return null

  return (
    <div className="eco-noticias">
      <div className="eco-sec-header">
        <div className="eco-sec-title">Últimas noticias</div>
        <Link href="/noticias" className="eco-sec-link">Ver todas <IconArrowRight /></Link>
      </div>
      <div className="eco-conv-list">
        {noticias.map(n => (
          <Link key={n.id} href="/noticias" className="eco-conv-item eco-reveal">
            <div className="eco-conv-text">
              <div className="eco-conv-name">{n.titular}</div>
              {n.fuente_nombre && <div className="eco-conv-loc">{n.fuente_nombre}</div>}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
