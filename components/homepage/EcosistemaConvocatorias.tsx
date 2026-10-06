import Link from 'next/link'
import { IconArrowRight, IconCalendar, IconMapPin } from './EcoIcons'
import { etiquetaCategoria } from '@/components/convocatorias/vocabulario'
import { fecha } from '@/components/shared/formato'
import type { ConvocatoriaPortada } from '@/lib/portada/datos'

/**
 * Convocatorias publicadas y abiertas, sacadas de `calls`. Con cero, un
 * estado vacío que lo dice; si la consulta falla, solo el enlace al listado,
 * porque no sabemos si hay o no.
 */
export default function EcosistemaConvocatorias({ convocatorias }: { convocatorias: ConvocatoriaPortada[] | null }) {
  return (
    <div>
      <div className="eco-sec-header">
        <div className="eco-sec-title">Convocatorias abiertas</div>
        <Link href="/convocatoria" className="eco-sec-link">Ver todas <IconArrowRight /></Link>
      </div>
      <div className="eco-conv-list">
        {convocatorias === null ? (
          <div className="eco-conv-vacio eco-reveal">
            <p className="eco-conv-vacio-texto">Consulta las convocatorias publicadas en la plataforma.</p>
            <Link href="/convocatoria" className="eco-conv-vacio-btn">Ver convocatorias</Link>
          </div>
        ) : convocatorias.length === 0 ? (
          <div className="eco-conv-vacio eco-reveal">
            <div className="eco-conv-icon" aria-hidden="true"><IconCalendar /></div>
            <p className="eco-conv-vacio-titulo">Aún no hay convocatorias abiertas</p>
            <p className="eco-conv-vacio-texto">Festivales, premios, residencias y becas aparecerán aquí en cuanto se publiquen.</p>
            <Link href="/convocatoria/nueva" className="eco-conv-vacio-btn">Publicar una convocatoria</Link>
          </div>
        ) : (
          convocatorias.map(c => (
            <Link key={c.id} href={`/convocatoria/${c.id}`} className="eco-conv-item eco-reveal">
              <div className="eco-conv-icon" aria-hidden="true"><IconCalendar /></div>
              <div className="eco-conv-text">
                <div className="eco-conv-name">{c.title}</div>
                <div className="eco-conv-header">
                  <span className="eco-conv-cat">{etiquetaCategoria(c.category)}</span>
                  {c.location && <span className="eco-conv-loc"><IconMapPin />{c.location}</span>}
                </div>
                <div className="eco-conv-cta">Ver convocatoria <IconArrowRight /></div>
              </div>
              <div className="eco-conv-days">{c.deadline ? `Hasta ${fecha(c.deadline)}` : 'Sin fecha límite'}</div>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
