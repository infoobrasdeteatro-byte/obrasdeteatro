import Link from 'next/link'
import { IconRoute as IconRun, IconPencil, IconCalendarEvent, IconBookmark as IconHome, IconSend } from './EcoIcons'

/**
 * Tarjeta decorativa de ScenaIA para la home pública. A diferencia de la
 * maqueta de referencia, no simula ninguna respuesta (sin setTimeout falso):
 * el ScenaIA real está protegido por sesión y consume créditos del Núcleo,
 * así que cualquier interacción aquí invita a registrarse/iniciar sesión en
 * lugar de fingir una conversación real. Aprobado explícitamente así.
 */
const CHIPS = [
  { icon: IconRun, label: 'Teatro físico' },
  { icon: IconPencil, label: 'Dramaturgia contemporánea' },
  { icon: IconCalendarEvent, label: 'Festivales iberoamericanos' },
  { icon: IconHome, label: 'Residencias escénicas' },
] as const

export default function EcosistemaScenaIACard() {
  return (
    <div>
      <div className="eco-sec-header">
        <div className="eco-sec-title">ScenaIA</div>
        <span className="eco-scenaia-tag">IA curatorial</span>
      </div>
      <div className="eco-scenaia-card eco-reveal">
        <div className="eco-scenaia-head-section">
          <div className="eco-scenaia-header">
            <div className="eco-scenaia-dot" aria-hidden="true" />
            <div className="eco-scenaia-name">Asistente del ecosistema</div>
          </div>
          <div className="eco-scenaia-meta">Actualizado hace 2 min · 38 oportunidades analizadas</div>
        </div>

        <div className="eco-scenaia-sep" aria-hidden="true" />

        <div className="eco-scenaia-body-section">
          <div className="eco-scenaia-bubble">
            Detecté <strong>5 nuevas convocatorias</strong> relacionadas con teatro físico y residencias escénicas en Iberoamérica.
            Esta semana aumentó la actividad en <strong>Madrid, Bogotá y Ciudad de México</strong>.
          </div>

          <div className="eco-scenaia-chips">
            {CHIPS.map((c, i) => {
              const Icon = c.icon
              return (
                <Link key={i} href="/auth/registro" className="eco-scenaia-chip">
                  <Icon />{c.label}
                </Link>
              )
            })}
          </div>
        </div>

        <div className="eco-scenaia-input-section">
          <Link href="/auth/registro" className="eco-scenaia-input-row" aria-label="Regístrate para usar ScenaIA">
            <span className="eco-scenaia-input">Busca festivales en México…</span>
            <span className="eco-scenaia-send"><IconSend /></span>
          </Link>
        </div>
      </div>
    </div>
  )
}
