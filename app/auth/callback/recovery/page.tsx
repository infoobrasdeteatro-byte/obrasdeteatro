'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function RecoveryCallback() {
  const router = useRouter()
  const [status, setStatus] = useState('Verificando enlace...')

  useEffect(() => {
    const supabase = createClient()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setStatus(`event: ${event} | session: ${session ? 'yes' : 'no'}`)

      if (event === 'PASSWORD_RECOVERY') {
        router.replace('/auth/update-password')
      } else if (event === 'INITIAL_SESSION' && session) {
        // SDK ya procesó el código antes de que nos suscribiéramos
        router.replace('/auth/update-password')
      }
    })

    return () => subscription.unsubscribe()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-gray-500 text-sm">{status}</p>
    </div>
  )
}

export default function RecoveryCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500 text-sm">Verificando enlace...</p>
      </div>
    }>
      <RecoveryCallback />
    </Suspense>
  )
}
