'use client'

import { useState } from 'react'

interface Specialty {
  specialty: string
  is_primary: boolean
}

const MAX_SECONDARY = 4

export default function EspecialidadesChips({ specialties }: { specialties: Specialty[] }) {
  const [expanded, setExpanded] = useState(false)
  const primary = specialties.find(s => s.is_primary)
  const secondary = specialties.filter(s => !s.is_primary)
  const visible = expanded ? secondary : secondary.slice(0, MAX_SECONDARY)
  const hiddenCount = secondary.length - MAX_SECONDARY

  return (
    <div>
      {primary && (
        <p style={{
          fontSize: '15px', fontWeight: 500, color: 'var(--black)',
          fontFamily: 'var(--sans)', margin: secondary.length > 0 ? '0 0 12px' : '0',
        }}>
          {primary.specialty}
        </p>
      )}
      {secondary.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
          {visible.map((s, i) => (
            <span key={i} className="prof-chip">{s.specialty}</span>
          ))}
          {!expanded && hiddenCount > 0 && (
            <button
              onClick={() => setExpanded(true)}
              aria-expanded={false}
              className="prof-chip-more"
            >
              +{hiddenCount} más
            </button>
          )}
        </div>
      )}
    </div>
  )
}
