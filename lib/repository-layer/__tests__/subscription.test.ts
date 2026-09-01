import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createClient } from '@/lib/supabase/server'
import { getSubscription, getUsageLimit } from '../subscription'
import { parseAuthorizedLimit } from '@/lib/credit-manager/parse-authorized-limit'
import { PLANES } from '@/lib/plans'
import { createFakeSupabaseClient } from './test-utils'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

const SAMPLE_SUBSCRIPTION_ROW = {
  plan: 'premium',
  status: 'active',
  current_period_end: '2026-08-21T00:00:00.000Z',
  cancel_at_period_end: false,
}

describe('getSubscription', () => {
  beforeEach(() => {
    vi.mocked(createClient).mockReset()
  })

  it('maps a found subscription row to the Subscription contract', async () => {
    const { client, builder } = createFakeSupabaseClient({ data: SAMPLE_SUBSCRIPTION_ROW, error: null })
    vi.mocked(createClient).mockResolvedValue(client as never)

    const result = await getSubscription('user-1')

    expect(result).toEqual({
      plan: 'premium',
      status: 'active',
      currentPeriodEnd: '2026-08-21T00:00:00.000Z',
      cancelAtPeriodEnd: false,
    })
    expect(client.from).toHaveBeenCalledWith('subscriptions')
    expect(builder.eq).toHaveBeenCalledWith('profile_id', 'user-1')
  })

  it('returns null when the user has no subscription row', async () => {
    const { client } = createFakeSupabaseClient({ data: null, error: { message: 'not found' } })
    vi.mocked(createClient).mockResolvedValue(client as never)

    const result = await getSubscription('user-sin-suscripcion')

    expect(result).toBeNull()
  })
})

/**
 * BLOQUE 5 — cuota de IA por plan.
 *
 * Este bloque `describe` es el UNICO sitio de todo el repositorio, codigo o
 * prueba, donde vuelven a escribirse las cifras comerciales. Existe para
 * ratificarlas: si alguien cambia la configuracion, esta prueba falla y
 * obliga a que el cambio sea deliberado. Cualquier otra prueba que necesite
 * una cuota la obtiene de `getUsageLimit`, jamas la escribe.
 */
describe('getUsageLimit — cuota de IA por plan (Bloque 5)', () => {
  it('RATIFICACION: cada plan devuelve exactamente la cuota decidida por Direccion', () => {
    expect(getUsageLimit('gratuito')).toBe('5')
    expect(getUsageLimit('premium')).toBe('100')
    expect(getUsageLimit('destacado')).toBe('500')
    expect(getUsageLimit('empresas')).toBe('ILIMITADO')
  })

  it('EMPRESAS no lleva cifra: ILIMITADO es ausencia de techo, no un numero grande', () => {
    const empresas = getUsageLimit('empresas')

    expect(empresas).toBe('ILIMITADO')
    expect(Number.isFinite(Number(empresas))).toBe(false)
    // Ni 0, ni 999999999, ni ningun otro valor convenido (PRD-001).
    expect(empresas).not.toBe('0')
  })

  it('un plan no reconocido devuelve null: ni cero, ni una cuota inventada', () => {
    expect(getUsageLimit('plan-inexistente')).toBeNull()
    expect(getUsageLimit('')).toBeNull()
  })

  it('sin plan no hay cuota que declarar', () => {
    expect(getUsageLimit(null)).toBeNull()
  })

  it('TODO plan comercial tiene cuota de IA declarada: el catalogo no puede crecer sin decidirla', () => {
    // Si manana se anade un plan a lib/plans.ts y nadie declara su cuota,
    // sus usuarios quedarian denegados por "plan desconocido" sin que nadie
    // lo hubiera decidido. Esta prueba lo impide.
    for (const plan of PLANES) {
      expect(getUsageLimit(plan.id), `plan sin cuota de IA declarada: ${plan.id}`).not.toBeNull()
    }
  })

  it('IDA Y VUELTA: lo que se serializa aqui es exactamente lo que Credit Manager interpreta', () => {
    // La cuota viaja como texto por un contrato ya congelado
    // (`SubscriptionSection.usageLimits`). Si las dos puntas dejaran de
    // entenderse, un plan con cuota pasaria a leerse como plan desconocido.
    expect(parseAuthorizedLimit(getUsageLimit('premium'))).toEqual({ kind: 'LIMITADO', value: 100 })
    expect(parseAuthorizedLimit(getUsageLimit('empresas'))).toEqual({ kind: 'ILIMITADO' })
    expect(parseAuthorizedLimit(getUsageLimit('plan-inexistente'))).toBeNull()
  })

  it('las cuotas limitadas son numeros positivos: una cuota de cero no es una cuota', () => {
    for (const plan of ['gratuito', 'premium', 'destacado']) {
      const limite = parseAuthorizedLimit(getUsageLimit(plan))

      expect(limite).not.toBeNull()
      expect(limite!.kind).toBe('LIMITADO')
      expect((limite as { kind: 'LIMITADO'; value: number }).value).toBeGreaterThan(0)
    }
  })
})
