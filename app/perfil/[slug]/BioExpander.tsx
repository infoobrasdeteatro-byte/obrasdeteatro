'use client'

import { useState } from 'react'

const VISIBLE_CHARS = 280

export default function BioExpander({ bio }: { bio: string }) {
  const [expanded, setExpanded] = useState(false)
  const isLong = bio.length > VISIBLE_CHARS
  const displayText = !isLong || expanded ? bio : bio.slice(0, VISIBLE_CHARS).trimEnd()

  return (
    <div>
      <p style={{
        fontSize: '15px', color: 'var(--text)', lineHeight: 1.75,
        fontFamily: 'var(--sans)', whiteSpace: 'pre-wrap', margin: 0,
      }}>
        {displayText}{!expanded && isLong ? '…' : ''}
      </p>
      {isLong && (
        <button
          onClick={() => setExpanded(e => !e)}
          aria-expanded={expanded}
          style={{
            marginTop: '10px', background: 'none', border: 'none',
            padding: 0, fontSize: '13px', color: 'var(--red)',
            cursor: 'pointer', fontFamily: 'var(--sans)',
          }}
        >
          {expanded ? 'Leer menos' : 'Leer más'}
        </button>
      )}
    </div>
  )
}
