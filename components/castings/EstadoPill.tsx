import type { CSSProperties } from 'react'

/**
 * Vocabulario visual único para el ciclo de vida de un casting, compartido por
 * "Mis castings" y el editor. Los seis estados son los del CHECK
 * castings_estado_check; si algún día se añade uno, aquí se ve como tal en vez
 * de desaparecer en silencio.
 */

type Estilo = { etiqueta: string; clase: string; estilo?: CSSProperties }

const ESTADOS: Record<string, Estilo> = {
  borrador: {
    etiqueta: 'Borrador',
    clase: 'status-pill',
    estilo: { background: 'var(--subtle)', color: 'var(--muted)' },
  },
  pendiente_revision: {
    etiqueta: 'En revisión',
    clase: 'status-pill status-pill--draft',
  },
  publicado: {
    etiqueta: 'Publicado',
    clase: 'status-pill status-pill--published',
  },
  rechazado: {
    etiqueta: 'Rechazado',
    clase: 'status-pill',
    estilo: { background: 'var(--red-light)', color: 'var(--red-h)' },
  },
  cerrado: {
    etiqueta: 'Cerrado',
    clase: 'status-pill',
    estilo: { background: 'var(--subtle)', color: 'var(--text)' },
  },
  cancelado: {
    etiqueta: 'Cancelado',
    clase: 'status-pill',
    estilo: { background: 'var(--subtle)', color: 'var(--muted)' },
  },
}

export default function EstadoPill({ estado }: { estado: string }) {
  const e = ESTADOS[estado]
  if (!e) {
    return <span className="status-pill" style={{ background: 'var(--subtle)', color: 'var(--muted)' }}>{estado}</span>
  }
  return <span className={e.clase} style={e.estilo}>{e.etiqueta}</span>
}

function IconoAviso() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }} aria-hidden="true">
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

/**
 * Explica por qué un casting no está publicado, cuando hay algo que explicar.
 * Distingue las dos causas, que no son lo mismo: el filtro RETIENE (lo decidió
 * una regla, todavía no lo ha visto nadie) y moderación RECHAZA (lo decidió
 * una persona). Si no hay motivo registrado, no se inventa ninguno.
 */
export function AvisoEstado({
  estado,
  motivoFiltro,
  motivoRechazo,
}: {
  estado: string
  motivoFiltro: string | null
  motivoRechazo: string | null
}) {
  if (estado === 'pendiente_revision' && motivoFiltro) {
    return (
      <div className="ds-status-banner ds-status-banner--draft" style={{ marginBottom: '16px' }}>
        <div>
          <div className="ds-status-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <IconoAviso />
            {motivoFiltro}
          </div>
          <div className="ds-status-hint">
            Retenida por el filtro automático. No está rechazada: alguien del equipo la revisará.
          </div>
        </div>
      </div>
    )
  }

  if (estado === 'rechazado' && motivoRechazo) {
    return (
      <div className="ds-alert-error" style={{ marginBottom: '16px' }}>
        <strong style={{ display: 'block', marginBottom: '2px' }}>Rechazada por moderación</strong>
        {motivoRechazo}
      </div>
    )
  }

  return null
}
