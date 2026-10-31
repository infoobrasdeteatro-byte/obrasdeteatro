'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { aceptarInvitacionElenco } from './acciones'

export default function Aceptar({ token }: { token: string }) {
  const router = useRouter()
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()
  return (
    <div>
      <button type="button" className="inv-btn" disabled={pending}
        onClick={() => startTransition(async () => {
          setError('')
          const r = await aceptarInvitacionElenco(token)
          if (r.ok) router.push('/perfil/red?elenco=1')
          else setError(r.error ?? 'No se pudo aceptar la invitación.')
        })}>
        {pending ? 'Aceptando…' : 'Aceptar invitación'}
      </button>
      {error && <p className="inv-error">{error}</p>}
    </div>
  )
}
