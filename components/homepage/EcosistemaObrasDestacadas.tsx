import { IconArrowRight, IconRoute, IconStar, IconCalendar } from './EcoIcons'

const OBRAS = [
  {
    img: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&q=85&auto=format&fit=crop',
    alt: 'Ceniza sobre el patio',
    genre: 'Drama contemporáneo',
    title: 'Ceniza sobre el patio',
    company: 'Colectivo Umbral',
    country: 'Argentina',
    duration: '95 min',
    context: 'Disponible para programación internacional',
    contextIcon: IconRoute,
    badge: 'Destacada esta semana',
    badgeClass: 'eco-status-badge--verde',
  },
  {
    img: 'https://images.unsplash.com/photo-1547153760-18fc86324498?w=600&q=85&auto=format&fit=crop',
    alt: 'Los cuerpos vacíos',
    genre: 'Teatro físico',
    title: 'Los cuerpos vacíos',
    company: 'Escena Nómada',
    country: 'España · Canarias',
    duration: '70 min',
    context: 'Residencia escénica internacional 2026',
    contextIcon: IconStar,
    badge: 'Disponible para gira',
    badgeClass: 'eco-status-badge--azul',
  },
  {
    img: 'https://images.unsplash.com/photo-1460723237483-7a6dc9d0b212?w=600&q=85&auto=format&fit=crop',
    alt: 'La última frontera',
    genre: 'Teatro documental',
    title: 'La última frontera',
    company: 'Archivo Escénico',
    country: 'México',
    duration: '85 min',
    context: 'Proyecto seleccionado en circuito iberoamericano',
    contextIcon: IconCalendar,
    badge: 'Estreno en septiembre',
    badgeClass: 'eco-status-badge--ambar',
  },
] as const

export default function EcosistemaObrasDestacadas() {
  return (
    <>
      <div className="eco-sec-header">
        <div className="eco-sec-title">Obras destacadas</div>
        <div className="eco-sec-link">Ver todas <IconArrowRight /></div>
      </div>
      <div className="eco-obras-grid">
        {OBRAS.map((o, i) => {
          const ContextIcon = o.contextIcon
          return (
            <div key={i} className="eco-obra-card eco-reveal">
              <div className="eco-obra-img">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={o.img} alt={o.alt} loading="lazy" decoding="async" />
              </div>
              <div className="eco-obra-body">
                <div className="eco-obra-genre">{o.genre}</div>
                <div className="eco-obra-title">{o.title}</div>
                <div className="eco-obra-company">{o.company}</div>
                <div className="eco-obra-meta">
                  <span>{o.country}</span>
                  <span className="eco-obra-meta-sep">·</span>
                  <span>{o.duration}</span>
                </div>
                <div className="eco-obra-context"><ContextIcon />{o.context}</div>
              </div>
              <div className="eco-obra-footer">
                <span className={`eco-status-badge ${o.badgeClass}`}>{o.badge}</span>
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
