import type { CSSProperties } from 'react'

/**
 * Insignia del estado de una POSTULACIÓN. No confundir con EstadoPill, que es
 * la del ciclo de vida de un casting: son dos vocabularios distintos y en la
 * pantalla del actor aparecen juntos, uno al lado del otro.
 *
 * Los cuatro valores son los del CHECK casting_applications_status_check.
 */

const ESTADOS: Record<string, { etiqueta: string; clase: string; estilo?: CSSProperties }> = {
  pending: {
    etiqueta: 'Pendiente',
    clase: 'status-pill status-pill--draft',
  },
  reviewed: {
    etiqueta: 'Revisada',
    clase: 'status-pill',
    estilo: { background: 'var(--subtle)', color: 'var(--text)' },
  },
  selected: {
    etiqueta: 'Seleccionada',
    clase: 'status-pill status-pill--published',
  },
  rejected: {
    etiqueta: 'Descartada',
    clase: 'status-pill',
    estilo: { background: 'var(--red-light)', color: 'var(--red-h)' },
  },
}

export default function EstadoPostulacion({ status }: { status: string }) {
  const e = ESTADOS[status]
  if (!e) {
    return (
      <span className="status-pill" style={{ background: 'var(--subtle)', color: 'var(--muted)' }}>
        {status}
      </span>
    )
  }
  return <span className={e.clase} style={e.estilo}>{e.etiqueta}</span>
}
