'use client'

import { useState } from 'react'

interface AwardItem {
  nombre: string
  entidad: string | null
  anio: number | null
  descripcion: string | null
}

const INITIAL = 2

export default function PremiosExpander({ items }: { items: AwardItem[] }) {
  const [expanded, setExpanded] = useState(false)
  const visible = expanded ? items : items.slice(0, INITIAL)
  const hasMore = items.length > INITIAL

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {visible.map((item, idx) => (
          <div key={idx}>
            <p style={{ fontSize: '13.5px', fontWeight: 500, color: 'var(--black)', lineHeight: 1.35, margin: 0 }}>
              {item.nombre}
            </p>
            {(item.entidad || item.anio) && (
              <p style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>
                {[item.entidad, item.anio?.toString()].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>
        ))}
      </div>
      {!expanded && hasMore && (
        <button
          onClick={() => setExpanded(true)}
          style={{
            marginTop: '12px', background: 'none', border: 'none', padding: 0,
            fontSize: '12px', color: 'var(--red)', cursor: 'pointer', fontFamily: 'var(--sans)',
          }}
        >
          Ver todos los reconocimientos
        </button>
      )}
    </div>
  )
}
