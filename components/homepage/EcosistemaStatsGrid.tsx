import { IconTrendingUp, IconArrowRight } from './EcoIcons'

const STATS = [
  { value: '4.280', label: 'Obras registradas', delta: '+38 esta semana', link: 'Ver obras' },
  { value: '1.140', label: 'Compañías activas', delta: '+12 esta semana', link: 'Explorar compañías' },
  { value: '67', label: 'Convocatorias abiertas', delta: '+5 nuevas hoy', link: 'Ver convocatorias' },
  { value: '20', label: 'Países conectados', delta: 'España · México · Argentina…', neutral: true, link: 'Ver mapa hispano' },
] as const

export default function EcosistemaStatsGrid() {
  return (
    <div className="eco-stats-grid">
      {STATS.map((s, i) => (
        <div key={i} className="eco-stat-card eco-reveal">
          <div className="eco-stat-value">{s.value}</div>
          <div className="eco-stat-label">{s.label}</div>
          <div className={`eco-stat-delta${'neutral' in s && s.neutral ? ' eco-stat-delta--neutral' : ''}`}>
            {!('neutral' in s && s.neutral) && <IconTrendingUp />} {s.delta}
          </div>
          <div className="eco-stat-link">{s.link} <IconArrowRight /></div>
        </div>
      ))}
    </div>
  )
}
