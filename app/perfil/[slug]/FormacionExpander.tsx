'use client'

import { useState } from 'react'

interface TrainingItem {
  titulo: string
  institucion: string | null
  fecha_inicio: string | null
  fecha_fin: string | null
  en_curso: boolean
}

function getYear(date: string | null): string | null {
  if (!date) return null
  return new Date(date).getFullYear().toString()
}

function dateRange(item: TrainingItem): string {
  const start = getYear(item.fecha_inicio)
  if (item.en_curso) return start ? `${start} – presente` : 'En curso'
  const end = getYear(item.fecha_fin)
  if (start && end && start !== end) return `${start} – ${end}`
  return start ?? end ?? ''
}

const INITIAL = 2

export default function FormacionExpander({ items }: { items: TrainingItem[] }) {
  const [expanded, setExpanded] = useState(false)
  const visible = expanded ? items : items.slice(0, INITIAL)
  const hasMore = items.length > INITIAL

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {visible.map((item, idx) => {
          const range = dateRange(item)
          return (
            <div key={idx}>
              <p style={{ fontSize: '13.5px', fontWeight: 500, color: 'var(--black)', lineHeight: 1.35, margin: 0 }}>
                {item.titulo}
              </p>
              {(item.institucion || range) && (
                <p style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>
                  {[item.institucion, range].filter(Boolean).join(' · ')}
                </p>
              )}
            </div>
          )
        })}
      </div>
      {!expanded && hasMore && (
        <button
          onClick={() => setExpanded(true)}
          style={{
            marginTop: '12px', background: 'none', border: 'none', padding: 0,
            fontSize: '12px', color: 'var(--red)', cursor: 'pointer', fontFamily: 'var(--sans)',
          }}
        >
          Ver formación completa
        </button>
      )}
    </div>
  )
}
