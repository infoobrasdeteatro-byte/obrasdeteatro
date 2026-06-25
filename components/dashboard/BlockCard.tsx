import Link from 'next/link'

export type BlockStatus = 'empty' | 'partial' | 'complete' | 'locked' | 'soon'

interface Props {
  number: number
  title: string
  description: string
  status: BlockStatus
  href: string
}

const STATUS: Record<BlockStatus, { label: string; color: string; bg: string; cta: string }> = {
  empty:    { label: 'Vacío',         color: '#9ca3af', bg: '#f3f4f6', cta: 'Completar'  },
  partial:  { label: 'Iniciado',      color: '#b45309', bg: '#fef3c7', cta: 'Continuar'  },
  complete: { label: 'Completo',      color: '#15803d', bg: '#dcfce7', cta: 'Editar'     },
  locked:   { label: 'Bloqueado',     color: '#9ca3af', bg: '#f3f4f6', cta: 'Ver planes' },
  soon:     { label: 'Próximamente',  color: '#9ca3af', bg: '#f3f4f6', cta: ''           },
}

export default function BlockCard({ number, title, description, status, href }: Props) {
  const s = STATUS[status]
  const isClickable = status !== 'soon'

  const inner = (
    <div style={{
      background: 'var(--white)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius)',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      opacity: status === 'soon' ? 0.55 : 1,
      height: '100%',
      boxSizing: 'border-box',
    }}>

      {/* Number + Title + Status badge */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
          <span style={{
            width: '26px', height: '26px', borderRadius: '50%',
            background: 'var(--off)', border: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '11px', fontWeight: 600, color: 'var(--muted)',
            fontFamily: 'var(--sans)', flexShrink: 0,
          }}>
            {number}
          </span>
          <span style={{
            fontFamily: 'var(--serif)', fontSize: '15px',
            color: 'var(--black)', letterSpacing: '-0.2px',
            lineHeight: 1.2,
          }}>
            {title}
          </span>
        </div>
        <span style={{
          fontSize: '10px', fontWeight: 600,
          color: s.color, background: s.bg,
          padding: '2px 9px', borderRadius: '20px',
          whiteSpace: 'nowrap', fontFamily: 'var(--sans)',
          flexShrink: 0, letterSpacing: '0.02em',
        }}>
          {s.label}
        </span>
      </div>

      {/* Description */}
      <p style={{
        fontSize: '12px', color: 'var(--muted)',
        lineHeight: '1.55', fontFamily: 'var(--sans)',
        fontWeight: 300, flex: 1,
      }}>
        {description}
      </p>

      {/* CTA */}
      {isClickable && s.cta && (
        <span style={{
          fontSize: '12px', fontWeight: 500,
          color: status === 'locked' ? 'var(--muted)' : 'var(--black)',
          fontFamily: 'var(--sans)',
        }}>
          {status === 'locked' ? '🔒 ' : ''}{s.cta} →
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
