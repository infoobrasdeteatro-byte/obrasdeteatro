'use client'

import { useState } from 'react'

interface Entry {
  tipo: string
  titulo: string
  organizacion: string | null
  fecha_inicio: string | null
  fecha_fin: string | null
  en_curso: boolean
  descripcion: string | null
}

function getYear(date: string | null): string | null {
  if (!date) return null
  return new Date(date).getFullYear().toString()
}

function dateRange(e: Entry): string {
  const start = getYear(e.fecha_inicio)
  if (e.en_curso) return start ? `${start} – presente` : 'En curso'
  const end = getYear(e.fecha_fin)
  if (start && end && start !== end) return `${start} – ${end}`
  return start ?? end ?? ''
}

const INITIAL = 3

export default function TrayectoriaExpander({ entries }: { entries: Entry[] }) {
  const [expanded, setExpanded] = useState(false)
  const [openDesc, setOpenDesc] = useState<Set<number>>(new Set())

  const visible = expanded ? entries : entries.slice(0, INITIAL)
  const hasMore = entries.length > INITIAL

  const toggleDesc = (idx: number) => {
    setOpenDesc(prev => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx); else next.add(idx)
      return next
    })
  }

  return (
    <div>
      <div>
        {visible.map((entry, idx) => {
          const range = dateRange(entry)
          const descOpen = openDesc.has(idx)
          return (
            <div key={idx} className="prof-exp-entry">
              {entry.tipo && <span className="prof-exp-tipo">{entry.tipo}</span>}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--black)', lineHeight: 1.3, margin: 0 }}>
                  {entry.titulo}
                </p>
                {entry.descripcion && (
                  <button
                    onClick={() => toggleDesc(idx)}
                    aria-expanded={descOpen}
                    aria-controls={`prof-desc-${idx}`}
                    aria-label={descOpen ? 'Ocultar descripción' : 'Ver descripción'}
                    style={{
                      background: 'none', border: 'none', padding: '2px',
                      cursor: 'pointer', color: 'var(--muted)', flexShrink: 0,
                      display: 'flex', alignItems: 'center',
                    }}
                  >
                    <svg
                      width="14" height="14" viewBox="0 0 24 24"
                      fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                      style={{ transform: descOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                )}
              </div>
              {(entry.organizacion || range) && (
                <p style={{ fontSize: '13px', color: 'var(--muted)', margin: 0 }}>
                  {[entry.organizacion, range].filter(Boolean).join(' · ')}
                </p>
              )}
              {entry.descripcion && descOpen && (
                <p id={`prof-desc-${idx}`} style={{ fontSize: '13px', color: 'var(--text)', lineHeight: 1.65, margin: '6px 0 0' }}>
                  {entry.descripcion}
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
            marginTop: '16px', background: 'none', border: 'none', padding: 0,
            fontSize: '13px', color: 'var(--red)', cursor: 'pointer', fontFamily: 'var(--sans)',
          }}
        >
          Ver experiencia completa →
        </button>
      )}
    </div>
  )
}
