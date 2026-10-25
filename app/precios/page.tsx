import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'
import PreciosClient from './PreciosClient'
import { tituloEmbajador } from '@/lib/embajadores/textos'
import { PLANES, type CellValue } from '@/lib/plans'
import { getUsageLimit } from '@/lib/repository-layer'
import { parseAuthorizedLimit } from '@/lib/credit-manager/parse-authorized-limit'

/**
 * Texto de la cuota de IA de cada plan para la tabla comparativa. Sale de la
 * fuente única (getUsageLimit), nunca de cifras copiadas en la UI. El
 * periodo es el mes natural: accounting_verify_and_reserve() cuenta desde
 * date_trunc('month', now()). Un plan sin cuota conocida no promete nada.
 */
function cuotaIATexto(plan: string): CellValue {
  const limite = parseAuthorizedLimit(getUsageLimit(plan))
  if (limite === null) return false
  if (limite.kind === 'ILIMITADO') return 'Ilimitado'
  return limite.value === 1 ? '1 crédito/mes' : `${limite.value} créditos/mes`
}

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
  let cortesia: { plan: string; hasta: string; titulo: string } | null = null

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('plan')
      .eq('id', user.id)
      .single()

    currentPlan = profile?.plan ?? 'gratuito'

    // Embajadores de Escena / invitación: la membresía de cortesía activa.
    const { data: c } = await supabase.rpc('mi_cortesia')
    const fila = c?.[0]
    if (fila?.activa) {
      cortesia = {
        plan: fila.plan, hasta: fila.hasta,
        titulo: fila.tipo === 'embajador' ? tituloEmbajador(fila.genero) : 'Premium por invitación',
      }
    }
  }

  return (
    <PreciosClient
      userId={user?.id ?? null}
      userEmail={user?.email ?? null}
      currentPlan={currentPlan}
      cortesia={cortesia}
      cancelled={!!params.cancelled}
      cuotasIA={PLANES.map(p => cuotaIATexto(p.id))}
    />
  )
}
