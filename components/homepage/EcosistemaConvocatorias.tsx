import { IconArrowRight, IconMic, IconPencil, IconVideo, IconBulb, IconMapPin } from './EcoIcons'

const CONVOCATORIAS = [
  {
    icon: IconMic,
    name: 'Casting — Actriz protagonista',
    badge: { text: 'Nuevo', className: 'eco-conv-badge--new' },
    micrometa: 'Casting abierto · Remunerado · Presencial',
    cat: 'Actriz',
    loc: 'Buenos Aires',
    days: '3 días',
    urgent: true,
  },
  {
    icon: IconPencil,
    name: 'Festival Iberoamericano de Texto',
    micrometa: 'Festival iberoamericano · Convocatoria anual',
    cat: 'Dramaturgia',
    loc: 'Madrid',
    days: '9 días',
  },
  {
    icon: IconVideo,
    name: 'Director residente 2026',
    badge: { text: 'Urgente', className: 'eco-conv-badge--urgent' },
    micrometa: 'Residencia artística · Internacional · Con dotación',
    cat: 'Dirección',
    loc: 'Bogotá',
    days: '14 días',
  },
  {
    icon: IconBulb,
    name: 'Técnico de iluminación escénica',
    micrometa: 'Contrato temporal · Teatro físico · Presencial',
    cat: 'Técnico',
    loc: 'Ciudad de México',
    days: '21 días',
  },
] as const

export default function EcosistemaConvocatorias() {
  return (
    <div>
      <div className="eco-sec-header">
        <div className="eco-sec-title">Convocatorias abiertas</div>
        <div className="eco-sec-link">Ver todas <IconArrowRight /></div>
      </div>
      <div className="eco-conv-list">
        {CONVOCATORIAS.map((c, i) => {
          const Icon = c.icon
          return (
            <div key={i} className="eco-conv-item eco-reveal">
              <div className="eco-conv-icon"><Icon /></div>
              <div className="eco-conv-text">
                <div className="eco-conv-name">
                  {c.name}
                  {'badge' in c && c.badge && (
                    <span className={`eco-conv-badge ${c.badge.className}`}>{c.badge.text}</span>
                  )}
                </div>
                <div className="eco-conv-micrometa">{c.micrometa}</div>
                <div className="eco-conv-header">
                  <span className="eco-conv-cat">{c.cat}</span>
                  <span className="eco-conv-loc"><IconMapPin />{c.loc}</span>
                </div>
                <div className="eco-conv-cta">Ver convocatoria <IconArrowRight /></div>
              </div>
              <div className={`eco-conv-days${'urgent' in c && c.urgent ? ' eco-conv-days--urgent' : ''}`}>{c.days}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
