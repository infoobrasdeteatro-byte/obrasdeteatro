import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createClient } from '@/lib/supabase/server'
import { __resetCacheForTests } from '@/lib/verified/sistemas-cache/with-cache'
import { listPublicPersons, listPersonLocations } from '../persons'
import { createFakeSupabaseClient } from './test-utils'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))

const ROW = {
  id: 'p-1',
  nombre: 'Ana',
  apellidos: 'Ruiz',
  nombre_artistico: null,
  tipo_perfil: 'dramaturgo',
  bio: 'Escribe teatro contemporáneo.',
  ciudad: 'Madrid',
  region: 'Comunidad de Madrid',
  country_code: 'ES',
  slug: 'ana-ruiz',
  verificado: true,
}

describe('listPublicPersons', () => {
  beforeEach(() => {
    vi.mocked(createClient).mockReset()
    __resetCacheForTests()
  })

  it('mapea una fila real de profiles al contrato Person, conservando la ubicacion', async () => {
    const { client } = createFakeSupabaseClient({ data: [ROW], error: null })
    vi.mocked(createClient).mockResolvedValue(client as never)

    const result = await listPublicPersons()

    expect(result).toEqual([
      {
        id: 'p-1',
        name: 'Ana Ruiz',
        profileType: 'dramaturgo',
        bio: 'Escribe teatro contemporáneo.',
        city: 'Madrid',
        region: 'Comunidad de Madrid',
        countryCode: 'ES',
        slug: 'ana-ruiz',
        isVerified: true,
      },
    ])
    expect(client.from).toHaveBeenCalledWith('profiles')
  })

  it('conserva NULL como NULL: nunca rellena un campo ausente', async () => {
    const { client } = createFakeSupabaseClient({
      data: [{ ...ROW, bio: null, ciudad: null, region: null, country_code: null, slug: null }],
      error: null,
    })
    vi.mocked(createClient).mockResolvedValue(client as never)

    const [persona] = await listPublicPersons()

    expect(persona.bio).toBeNull()
    expect(persona.city).toBeNull()
    expect(persona.region).toBeNull()
    expect(persona.countryCode).toBeNull()
    expect(persona.slug).toBeNull()
  })

  it('reproduce la politica RLS vigente y admite UNICAMENTE los tipos de perfil que son personas', async () => {
    const { client, builder } = createFakeSupabaseClient({ data: [], error: null })
    vi.mocked(createClient).mockResolvedValue(client as never)

    await listPublicPersons({}, 5)

    expect(builder.eq).toHaveBeenCalledWith('perfil_publico', true)
    expect(builder.eq).toHaveBeenCalledWith('activo', true)
    expect(builder.is).toHaveBeenCalledWith('deleted_at', null)
    expect(builder.in).toHaveBeenCalledWith('tipo_perfil', ['actor', 'director', 'dramaturgo', 'profesional'])
    expect(builder.limit).toHaveBeenCalledWith(5)
  })

  it('prioriza el nombre artistico cuando el perfil lo declara', async () => {
    const { client } = createFakeSupabaseClient({
      data: [{ ...ROW, nombre_artistico: 'La Ruiz' }],
      error: null,
    })
    vi.mocked(createClient).mockResolvedValue(client as never)

    expect((await listPublicPersons())[0].name).toBe('La Ruiz')
  })

  it('usa solo el nombre cuando no hay apellidos ni nombre artistico', async () => {
    const { client } = createFakeSupabaseClient({
      data: [{ ...ROW, apellidos: null, nombre_artistico: null }],
      error: null,
    })
    vi.mocked(createClient).mockResolvedValue(client as never)

    expect((await listPublicPersons())[0].name).toBe('Ana')
  })

  it('degrada a lista vacia ante error, sin lanzar', async () => {
    const { client } = createFakeSupabaseClient({ data: null, error: { message: 'fallo' } })
    vi.mocked(createClient).mockResolvedValue(client as never)

    await expect(listPublicPersons()).resolves.toEqual([])
  })
  it('sin criterios no filtra por tipo, pais ni ubicacion: enumerar sigue siendo posible', async () => {
    const { client, builder } = createFakeSupabaseClient({ data: [ROW], error: null })
    vi.mocked(createClient).mockResolvedValue(client as never)

    await listPublicPersons()

    expect(builder.eq).not.toHaveBeenCalledWith('tipo_perfil', expect.anything())
    expect(builder.eq).not.toHaveBeenCalledWith('country_code', expect.anything())
    expect(builder.in).not.toHaveBeenCalledWith('ciudad', expect.anything())
    expect(builder.in).not.toHaveBeenCalledWith('region', expect.anything())
  })

  it('aplica el tipo de perfil pedido sobre la columna real `tipo_perfil`', async () => {
    const { client, builder } = createFakeSupabaseClient({ data: [ROW], error: null })
    vi.mocked(createClient).mockResolvedValue(client as never)

    await listPublicPersons({ profileType: 'dramaturgo' })

    expect(builder.eq).toHaveBeenCalledWith('tipo_perfil', 'dramaturgo')
    // El filtro de clase se conserva: el criterio ACOTA la poblacion, no la sustituye.
    expect(builder.in).toHaveBeenCalledWith('tipo_perfil', ['actor', 'director', 'dramaturgo', 'profesional'])
  })

  it('aplica el pais sobre `country_code`', async () => {
    const { client, builder } = createFakeSupabaseClient({ data: [ROW], error: null })
    vi.mocked(createClient).mockResolvedValue(client as never)

    await listPublicPersons({ countryCode: 'ES' })

    expect(builder.eq).toHaveBeenCalledWith('country_code', 'ES')
  })

  it('resuelve la ciudad canonica contra TODAS sus variantes sucias reales, sin tocar el dato', async () => {
    const { client, builder } = createFakeSupabaseClient({
      data: [
        { ...ROW, id: 'p-1', ciudad: 'tenerife ' },
        { ...ROW, id: 'p-2', ciudad: 'Tenerife' },
        { ...ROW, id: 'p-3', ciudad: 'Cuenca' },
      ],
      error: null,
    })
    vi.mocked(createClient).mockResolvedValue(client as never)

    await listPublicPersons({ city: 'tenerife' })

    const [columna, variantes] = builder.in.mock.calls.find(([columnName]) => columnName === 'ciudad')!

    expect(columna).toBe('ciudad')
    // Las dos variantes reales, TAL CUAL estan almacenadas -- el espacio final incluido.
    expect([...(variantes as string[])].sort()).toEqual(['Tenerife', 'tenerife '])
    expect(variantes).not.toContain('Cuenca')
  })

  it('resuelve la region ignorando acentos y mayusculas del dato almacenado', async () => {
    const { client, builder } = createFakeSupabaseClient({
      data: [{ ...ROW, region: 'CANARIAS' }, { ...ROW, id: 'p-2', region: 'Canarias' }],
      error: null,
    })
    vi.mocked(createClient).mockResolvedValue(client as never)

    await listPublicPersons({ region: 'canarias' })

    const [, variantes] = builder.in.mock.calls.find(([columnName]) => columnName === 'region')!

    expect([...(variantes as string[])].sort()).toEqual(['CANARIAS', 'Canarias'])
  })

  it('una ubicacion sin ninguna variante real produce lista vacia, nunca la lista sin filtrar', async () => {
    const { client, builder } = createFakeSupabaseClient({ data: [ROW], error: null })
    vi.mocked(createClient).mockResolvedValue(client as never)

    await listPublicPersons({ city: 'cuenca' })

    const [, variantes] = builder.in.mock.calls.find(([columnName]) => columnName === 'ciudad')!

    // `in` con lista vacia no casa con ninguna fila: ausencia de dato, no ausencia de filtro.
    expect(variantes).toEqual([])
  })
})

describe('listPersonLocations', () => {
  beforeEach(() => {
    vi.mocked(createClient).mockReset()
    __resetCacheForTests()
  })

  it('devuelve los valores TAL CUAL estan almacenados: no corrige ni normaliza el dato', async () => {
    const { client } = createFakeSupabaseClient({
      data: [
        { region: 'Canarias', ciudad: 'tenerife ' },
        { region: 'Canarias', ciudad: 'Tenerife' },
      ],
      error: null,
    })
    vi.mocked(createClient).mockResolvedValue(client as never)

    expect(await listPersonLocations()).toEqual({
      regions: ['Canarias'],
      cities: ['tenerife ', 'Tenerife'],
    })
  })

  it('descarta los NULL sin convertirlos en cadena vacia', async () => {
    const { client } = createFakeSupabaseClient({
      data: [{ region: null, ciudad: null }, { region: 'Canarias', ciudad: null }],
      error: null,
    })
    vi.mocked(createClient).mockResolvedValue(client as never)

    expect(await listPersonLocations()).toEqual({ regions: ['Canarias'], cities: [] })
  })

  it('solo mira la poblacion PERSONA y respeta la politica de visibilidad', async () => {
    const { client, builder } = createFakeSupabaseClient({ data: [], error: null })
    vi.mocked(createClient).mockResolvedValue(client as never)

    await listPersonLocations()

    expect(builder.eq).toHaveBeenCalledWith('perfil_publico', true)
    expect(builder.eq).toHaveBeenCalledWith('activo', true)
    expect(builder.is).toHaveBeenCalledWith('deleted_at', null)
    expect(builder.in).toHaveBeenCalledWith('tipo_perfil', ['actor', 'director', 'dramaturgo', 'profesional'])
  })

  it('degrada a vocabulario vacio ante error, sin lanzar', async () => {
    const { client } = createFakeSupabaseClient({ data: null, error: { message: 'fallo' } })
    vi.mocked(createClient).mockResolvedValue(client as never)

    await expect(listPersonLocations()).resolves.toEqual({ regions: [], cities: [] })
  })
})
