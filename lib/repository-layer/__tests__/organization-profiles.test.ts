import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createClient } from '@/lib/supabase/server'
import { __resetCacheForTests } from '@/lib/verified/sistemas-cache/with-cache'
import { listPublicOrganizationProfiles } from '../organization-profiles'
import { createFakeSupabaseClient } from './test-utils'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))

const ROW = {
  id: 'o-1',
  nombre: 'Compañía Escena Viva',
  nombre_artistico: null,
  tipo_perfil: 'compania',
  ciudad: 'Madrid',
  region: 'Comunidad de Madrid',
  country_code: 'ES',
  slug: 'escena-viva',
  website_url: null,
}

describe('listPublicOrganizationProfiles', () => {
  beforeEach(() => {
    vi.mocked(createClient).mockReset()
    __resetCacheForTests()
  })

  it('mapea un perfil organizativo al contrato Organization', async () => {
    const { client } = createFakeSupabaseClient({ data: [ROW], error: null })
    vi.mocked(createClient).mockResolvedValue(client as never)

    expect(await listPublicOrganizationProfiles()).toEqual([
      {
        id: 'o-1',
        name: 'Compañía Escena Viva',
        type: 'compania',
        countryCode: 'ES',
        region: 'Comunidad de Madrid',
        city: 'Madrid',
        website: null,
        slug: 'escena-viva',
      },
    ])
    expect(client.from).toHaveBeenCalledWith('profiles')
  })

  it('admite UNICAMENTE los tipos de perfil que son organizacion, y respeta la RLS vigente', async () => {
    const { client, builder } = createFakeSupabaseClient({ data: [], error: null })
    vi.mocked(createClient).mockResolvedValue(client as never)

    await listPublicOrganizationProfiles({}, 5)

    expect(builder.eq).toHaveBeenCalledWith('perfil_publico', true)
    expect(builder.eq).toHaveBeenCalledWith('activo', true)
    expect(builder.is).toHaveBeenCalledWith('deleted_at', null)
    expect(builder.in).toHaveBeenCalledWith('tipo_perfil', [
      'compania',
      'productora',
      'teatro',
      'festival',
      'escuela',
      'institucion',
    ])
    expect(builder.limit).toHaveBeenCalledWith(5)
  })

  it('aplica los criterios ya declarados sobre las columnas reales de profiles', async () => {
    const { client, builder } = createFakeSupabaseClient({ data: [], error: null })
    vi.mocked(createClient).mockResolvedValue(client as never)

    await listPublicOrganizationProfiles({ type: 'teatro', countryCode: 'ES', region: 'Canarias', city: 'tenerife' })

    expect(builder.eq).toHaveBeenCalledWith('tipo_perfil', 'teatro')
    expect(builder.eq).toHaveBeenCalledWith('country_code', 'ES')
    expect(builder.ilike).toHaveBeenCalledWith('region', 'Canarias')
    expect(builder.ilike).toHaveBeenCalledWith('ciudad', 'tenerife')
  })

  it('un tipo del vocabulario de institutions devuelve NINGUNO, nunca la lista sin filtrar', async () => {
    const { client } = createFakeSupabaseClient({ data: [ROW], error: null })
    vi.mocked(createClient).mockResolvedValue(client as never)

    expect(await listPublicOrganizationProfiles({ type: 'theater' })).toEqual([])
    expect(client.from).not.toHaveBeenCalled()
  })

  it('conserva NULL como NULL y prioriza el nombre comercial cuando existe', async () => {
    const { client } = createFakeSupabaseClient({
      data: [{ ...ROW, nombre_artistico: 'Escena Viva', ciudad: null, region: null, country_code: null }],
      error: null,
    })
    vi.mocked(createClient).mockResolvedValue(client as never)

    const [org] = await listPublicOrganizationProfiles()

    expect(org.name).toBe('Escena Viva')
    expect(org.city).toBeNull()
    expect(org.region).toBeNull()
    expect(org.countryCode).toBeNull()
  })

  it('degrada a lista vacia ante error, sin lanzar', async () => {
    const { client } = createFakeSupabaseClient({ data: null, error: { message: 'fallo' } })
    vi.mocked(createClient).mockResolvedValue(client as never)

    await expect(listPublicOrganizationProfiles()).resolves.toEqual([])
  })
})
