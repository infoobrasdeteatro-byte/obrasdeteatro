import { IconArrowRight } from './EcoIcons'

const NODOS = [
  { cx: 168, cy: 27, r: 7, ringR: 2.2, opacity: 0.6, ringOpacity: 0.7, dotOpacity: 0.95, delay: '0s', label: 'Madrid', labelX: 174, labelY: 25, labelSize: 6.5, labelOpacity: 0.75 },
  { cx: 151, cy: 42, r: 5, ringR: 1.8, opacity: 0.5, ringOpacity: 0.6, dotOpacity: 0.85, delay: '0.7s', label: 'Canarias', labelX: 156, labelY: 40, labelSize: 6, labelOpacity: 0.7 },
  { cx: 88, cy: 50, r: 7, ringR: 2.2, opacity: 0.55, ringOpacity: 0.7, dotOpacity: 0.95, delay: '0.4s', label: 'México', labelX: 93, labelY: 48, labelSize: 6.5, labelOpacity: 0.75 },
  { cx: 122, cy: 74, r: 5, ringR: 1.8, opacity: 0.5, ringOpacity: 0.6, dotOpacity: 0.85, delay: '1.1s', label: 'Bogotá', labelX: 127, labelY: 72, labelSize: 6, labelOpacity: 0.7 },
  { cx: 122, cy: 100, r: 5, ringR: 1.8, opacity: 0.5, ringOpacity: 0.6, dotOpacity: 0.85, delay: '1.8s', label: 'Lima', labelX: 127, labelY: 98, labelSize: 6, labelOpacity: 0.7 },
  { cx: 148, cy: 122, r: 7, ringR: 2.2, opacity: 0.6, ringOpacity: 0.7, dotOpacity: 0.95, delay: '1.4s', label: 'Bs. Aires', labelX: 153, labelY: 120, labelSize: 6.5, labelOpacity: 0.75 },
  { cx: 129, cy: 122, r: 5, ringR: 1.8, opacity: 0.45, ringOpacity: 0.55, dotOpacity: 0.8, delay: '2.2s', label: 'Santiago', labelX: 115, labelY: 120, labelSize: 6, labelOpacity: 0.7 },
  { cx: 112, cy: 20, r: 4, ringR: 1.5, opacity: 0.4, ringOpacity: 0.5, dotOpacity: 0.75, delay: '2.6s', label: 'Nueva York', labelX: 116, labelY: 18, labelSize: 5.5, labelOpacity: 0.6 },
] as const

const PROFESIONALES = [
  { iniciales: 'MR', nombre: 'María R.', color: '#c8001a' },
  { iniciales: 'JL', nombre: 'Javier L.', color: '#185fa5' },
  { iniciales: 'AC', nombre: 'Ana C.', color: '#0f6e56' },
  { iniciales: 'DP', nombre: 'Diego P.', color: '#7f77dd' },
] as const

export default function EcosistemaMapaHispano() {
  return (
    <div>
      <div className="eco-sec-header">
        <div className="eco-sec-title">Comunidad hispana</div>
        <div className="eco-sec-link">Ver mapa <IconArrowRight /></div>
      </div>
      <div className="eco-comunidad-card eco-reveal">
        <div className="eco-ecosystem-map" role="img" aria-label="Mapa del ecosistema teatral hispano — 20 países conectados">
          <svg viewBox="0 0 420 148" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <defs>
              <radialGradient id="ecoBgGlow" cx="50%" cy="55%" r="60%">
                <stop offset="0%" stopColor="#26252c" stopOpacity="1" />
                <stop offset="100%" stopColor="#14131a" stopOpacity="1" />
              </radialGradient>
              <radialGradient id="ecoNodeGrad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#c8001a" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#c8001a" stopOpacity="0" />
              </radialGradient>
              <filter id="ecoSofter" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="5" />
              </filter>
            </defs>

            <rect width="420" height="148" fill="url(#ecoBgGlow)" />

            {/* Siluetas continentales simplificadas -- atmósfera, no cartografía exacta */}
            <path d="M156 22 L163 20 L172 21 L178 24 L180 30 L175 36 L168 38 L161 35 L156 29 Z" fill="#2e2d38" stroke="#3d3c4a" strokeWidth="0.5" opacity="0.9" />
            <path d="M148 42 L153 41 L156 43 L154 45 L149 44 Z" fill="#2e2d38" stroke="#3d3c4a" strokeWidth="0.4" opacity="0.7" />
            <path d="M72 38 L90 35 L102 38 L108 44 L112 52 L108 60 L100 65 L90 63 L80 58 L70 50 L66 44 Z" fill="#2e2d38" stroke="#3d3c4a" strokeWidth="0.5" opacity="0.9" />
            <path d="M55 18 L105 14 L120 18 L125 26 L118 34 L108 36 L92 34 L75 36 L62 32 L52 26 Z" fill="#252430" stroke="#353440" strokeWidth="0.4" opacity="0.6" />
            <path d="M112 68 L126 65 L134 68 L136 76 L130 82 L120 82 L112 76 Z" fill="#2e2d38" stroke="#3d3c4a" strokeWidth="0.5" opacity="0.9" />
            <path d="M136 64 L152 62 L160 66 L160 74 L150 76 L138 74 L134 68 Z" fill="#2c2b36" stroke="#3d3c4a" strokeWidth="0.4" opacity="0.8" />
            <path d="M118 88 L130 84 L138 88 L140 100 L134 110 L122 112 L114 104 L112 94 Z" fill="#2e2d38" stroke="#3d3c4a" strokeWidth="0.5" opacity="0.9" />
            <path d="M138 92 L150 88 L158 92 L158 104 L148 108 L138 104 Z" fill="#2c2b36" stroke="#3d3c4a" strokeWidth="0.4" opacity="0.8" />
            <path d="M126 114 L132 110 L136 116 L136 130 L132 138 L126 140 L122 132 L122 120 Z" fill="#2e2d38" stroke="#3d3c4a" strokeWidth="0.5" opacity="0.9" />
            <path d="M138 106 L156 104 L162 110 L162 126 L155 136 L142 138 L134 130 L132 116 L136 108 Z" fill="#2e2d38" stroke="#3d3c4a" strokeWidth="0.5" opacity="0.9" />
            <path d="M158 114 L166 112 L170 116 L168 122 L160 124 L156 118 Z" fill="#2c2b36" stroke="#3d3c4a" strokeWidth="0.4" opacity="0.8" />
            <path d="M150 102 L162 100 L166 106 L162 112 L150 112 L146 106 Z" fill="#2c2b36" stroke="#3d3c4a" strokeWidth="0.4" opacity="0.75" />
            <path d="M162 66 L196 60 L210 68 L215 82 L210 98 L198 108 L182 112 L166 108 L160 96 L158 80 Z" fill="#201f2a" stroke="#2e2d38" strokeWidth="0.3" opacity="0.5" />
            <path d="M104 44 L118 42 L122 46 L118 50 L106 50 Z" fill="#2c2b36" stroke="#3d3c4a" strokeWidth="0.4" opacity="0.7" />

            {/* Líneas de conexión -- red del ecosistema */}
            <g opacity="0.18" stroke="#c8001a" strokeWidth="0.6" fill="none" strokeDasharray="2 4">
              <path d="M168 27 Q 200 70 146 122" />
              <path d="M168 27 Q 140 35 98 50" />
              <path d="M146 122 Q 132 115 122 100" />
              <path d="M98 50 Q 108 60 122 74" />
              <path d="M122 74 Q 120 86 122 100" />
              <path d="M168 27 L152 42" />
              <path d="M60 22 Q 110 18 168 27" />
            </g>

            {/* Nodos -- ciudades con ecosistema teatral */}
            {NODOS.map((n, i) => (
              <g className="eco-map-node-group" key={i}>
                <circle cx={n.cx} cy={n.cy} r={n.r} fill="url(#ecoNodeGrad)" filter="url(#ecoSofter)" opacity={n.opacity} />
                <circle className="eco-map-node-ring" cx={n.cx} cy={n.cy} r={n.ringR} fill="none" stroke="#c8001a" strokeWidth="0.8" opacity={n.ringOpacity} style={{ animationDelay: n.delay }} />
                <circle className="eco-map-node-dot" cx={n.cx} cy={n.cy} r={n.ringR} fill="#c8001a" opacity={n.dotOpacity} style={{ animationDelay: n.delay }} />
                <text className="eco-map-node-label" x={n.labelX} y={n.labelY} fontFamily="var(--sans)" fontSize={n.labelSize} fill={`rgba(255,255,255,${n.labelOpacity})`} fontWeight="500">{n.label}</text>
              </g>
            ))}

            <text x="10" y="141" fontFamily="var(--sans)" fontSize="7" fill="rgba(255,255,255,0.22)" fontWeight="400" letterSpacing="0.8">Ecosistema teatral hispano · 20 países</text>

            <g>
              <circle cx="408" cy="10" r="1.8" fill="#c8001a" opacity="0.7" />
              <text x="402" y="22" fontFamily="var(--sans)" fontSize="6" fill="rgba(255,255,255,0.3)" textAnchor="middle">8</text>
            </g>
          </svg>
        </div>

        <div className="eco-prof-row">
          {PROFESIONALES.map((p, i) => (
            <div key={i} className="eco-prof-chip">
              <div className="eco-prof-av" style={{ background: p.color }}>{p.iniciales}</div>
              {p.nombre}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
