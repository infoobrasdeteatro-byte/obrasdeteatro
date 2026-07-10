'use client'

import { useState, useTransition } from 'react'
import { toggleFollow } from './actions'

interface Props {
  profileId: string
  siguiendo: boolean
}

export default function FollowButton({ profileId, siguiendo: init }: Props) {
  const [siguiendo, setSiguiendo] = useState(init)
  const [hovered, setHovered] = useState(false)
  const [pending, startTransition] = useTransition()

  const handle = () => {
    const next = !siguiendo
    setSiguiendo(next)
    setHovered(false)
    startTransition(async () => {
      const ok = await toggleFollow(profileId, next)
      if (!ok) setSiguiendo(!next)
    })
  }

  const label = siguiendo
    ? (hovered ? 'Dejar de seguir' : 'Siguiendo')
    : 'Seguir'

  return (
    <button
      type="button"
      onClick={handle}
      disabled={pending}
      onMouseEnter={() => siguiendo && !pending && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-label={
        siguiendo
          ? 'Dejar de seguir este perfil profesional'
          : 'Seguir este perfil profesional'
      }
      aria-pressed={siguiendo}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '7px',
        padding: '8px 18px',
        borderRadius: 'var(--radius)',
        border: siguiendo
          ? `1px solid ${hovered ? 'var(--muted)' : 'var(--border)'}`
          : '1px solid var(--black)',
        background: siguiendo ? 'var(--subtle)' : 'var(--black)',
        color: siguiendo
          ? (hovered ? 'var(--text)' : 'var(--muted)')
          : 'var(--white)',
        fontSize: '13px',
        fontWeight: siguiendo ? 400 : 500,
        fontFamily: 'var(--sans)',
        cursor: pending ? 'wait' : 'pointer',
        transition: 'all 0.15s',
        opacity: pending ? 0.6 : 1,
        lineHeight: 1,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  )
}
