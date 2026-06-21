import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'
import PreciosClient from './PreciosClient'

export const metadata: Metadata = {
  title: 'Precios | ObrasDeTeatro®',
  description: 'Elige el plan que mejor se adapta a tu actividad profesional en el teatro hispanohablante.',
}

export default async function PreciosPage({
  searchParams,
}: {
  searchParams: Promise<{ cancelled?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const params = await searchParams

  let currentPlan: string | null = null

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('plan')
      .eq('id', user.id)
      .single()

    currentPlan = profile?.plan ?? 'gratuito'
  }

  return (
    <PreciosClient
      userId={user?.id ?? null}
      userEmail={user?.email ?? null}
      currentPlan={currentPlan}
      cancelled={!!params.cancelled}
    />
  )
}
