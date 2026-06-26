import Link from 'next/link'

export type BlockStatus = 'empty' | 'partial' | 'complete' | 'locked' | 'soon' | 'verified'

interface Props {
  number: number
  title: string
  description: string
  status: BlockStatus
  href: string
  fields?: { done: number; total: number }
}

const STATUS: Record<BlockStatus, { icon: string; label: string; color: string; bg: string; cta: string }> = {
  empty:    { icon: '⚪', label: 'Sin completar', color: '#9ca3af', bg: '#f3f4f6', cta: 'Completar'  },
  partial:  { icon: '🟡', label: 'En progreso',   color: '#b45309', bg: '#fef3c7', cta: 'Continuar'  },
  complete: { icon: '🟢', label: 'Completo',      color: '#15803d', bg: '#dcfce7', cta: 'Editar'     },
  verified: { icon: '🔵', label: 'Verificado',    color: '#1d4ed8', bg: '#eff6ff', cta: 'Ver estado' },
  locked:   { icon: '🔒', label: 'Bloqueado',     color: '#9ca3af', bg: '#f3f4f6', cta: 'Ver planes' },
  soon:     { icon: '⚫', label: 'Próximamente',  color: '#9ca3af', bg: '#f3f4f6', cta: ''           },
}

const NEUTRAL = new Set<BlockStatus>(['empty', 'soon', 'locked'])

export default function BlockCard({ number, title, description, status, href, fields }: Props) {
  const s = STATUS[status]
  const isClickable = status !== 'soon'
  const isNeutral = NEUTRAL.has(status)

  const inner = (
    <div style={{
      background: 'var(--white)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius)',
      padding: '18px 20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      opacity: status === 'soon' ? 0.5 : 1,
      height: '100%',
      boxSizing: 'border-box',
    }}>

      {/* Number + title + badge */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
          <span style={{
            width: '28px', height: '28px', borderRadius: '50%',
            background: isNeutral ? 'var(--off)' : s.bg,
            border: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '11px', fontWeight: 700,
            color: isNeutral ? 'var(--muted)' : s.color,
            fontFamily: 'var(--sans)', flexShrink: 0,
          }}>
            {number}
          </span>
          <span style={{
            fontFamily: 'var(--serif)', fontSize: '14px',
            color: 'var(--black)', letterSpacing: '-0.15px', lineHeight: 1.2,
          }}>
            {title}
          </span>
        </div>
        <span style={{
          fontSize: '10px', fontWeight: 600,
          color: s.color, background: s.bg,
          padding: '2px 8px', borderRadius: '20px',
          whiteSpace: 'nowrap', fontFamily: 'var(--sans)',
          flexShrink: 0, letterSpacing: '0.02em',
        }}>
          {s.icon} {s.label}
        </span>
      </div>

      {/* Description */}
      <p style={{
        fontSize: '12px', color: 'var(--muted)',
        lineHeight: '1.5', fontFamily: 'var(--sans)',
        fontWeight: 300, flex: 1,
      }}>
        {description}
      </p>

      {/* Mini field progress bar */}
      {fields && status !== 'soon' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            flex: 1, height: '3px',
            background: 'var(--off)', border: '1px solid var(--border)',
            borderRadius: '2px', overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: `${Math.round((fields.done / fields.total) * 100)}%`,
              background: isNeutral ? '#9ca3af' : s.color,
              borderRadius: '2px',
            }} />
          </div>
          <span style={{ fontSize: '10px', color: 'var(--muted)', fontFamily: 'var(--sans)', whiteSpace: 'nowrap' }}>
            {fields.done}/{fields.total}
          </span>
        </div>
      )}

      {/* CTA */}
      {isClickable && s.cta && (
        <span style={{
          fontSize: '12px', fontWeight: 500,
          color: status === 'locked' ? 'var(--muted)' : s.color,
          fontFamily: 'var(--sans)',
        }}>
          {s.cta} →
        </span>
      )}

    </div>
  )

  if (!isClickable) return inner

  return (
    <Link href={href} style={{ textDecoration: 'none', display: 'block' }}>
      {inner}
    </Link>
  )
}
