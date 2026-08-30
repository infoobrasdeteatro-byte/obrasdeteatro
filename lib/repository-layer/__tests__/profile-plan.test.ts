import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createClient } from '@/lib/supabase/server'
import { getProfilePlan } from '../profile-plan'
import { createFakeSupabaseClient } from './test-utils'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))

beforeEach(() => vi.mocked(createClient).mockReset())

/**
 * El plan vigente vive en `profiles.plan`, no en la relacion comercial.
 * Estos tests fijan la fuente, que es justo lo que estaba mal.
 */
describe('getProfilePlan', () => {
  it('lee el plan del perfil, no de subscriptions', async () => {
    const { client, builder } = createFakeSupabaseClient({ data: { plan: 'empresas' }, error: null })
    vi.mocked(createClient).mockResolvedValue(client as never)

    expect(await getProfilePlan('user-1')).toBe('empresas')
    expect(client.from).toHaveBeenCalledWith('profiles')
    expect(client.from).not.toHaveBeenCalledWith('subscriptions')
    expect(builder.eq).toHaveBeenCalledWith('id', 'user-1')
  })

  it('un usuario sin relacion de pago SIGUE teniendo plan', async () => {
    const { client } = createFakeSupabaseClient({ data: { plan: 'gratuito' }, error: null })
    vi.mocked(createClient).mockResolvedValue(client as never)

    expect(await getProfilePlan('user-gratuito')).toBe('gratuito')
  })

  it('solo devuelve null cuando el perfil no existe o la consulta falla', async () => {
    const { client } = createFakeSupabaseClient({ data: null, error: { message: 'no rows' } })
    vi.mocked(createClient).mockResolvedValue(client as never)

    await expect(getProfilePlan('user-inexistente')).resolves.toBeNull()
  })

  it('degrada sin lanzar', async () => {
    const { client } = createFakeSupabaseClient({ data: null, error: { message: 'fallo' } })
    vi.mocked(createClient).mockResolvedValue(client as never)

    await expect(getProfilePlan('user-1')).resolves.toBeNull()
  })
})
