import { describe, it, expect, vi, beforeEach } from 'vitest'
import { listPublicPersons } from '@/lib/repository-layer'
import { listPersonKnowledge } from '../persons-knowledge'

vi.mock('@/lib/repository-layer', () => ({ listPublicPersons: vi.fn() }))

const PERSONA = {
  id: 'p-1',
  name: 'Ana Ruiz',
  profileType: 'dramaturgo',
  bio: 'Escribe teatro contemporáneo.',
  city: 'Madrid',
  region: 'Comunidad de Madrid',
  countryCode: 'ES',
  slug: 'ana-ruiz',
  isVerified: true,
}

beforeEach(() => vi.mocked(listPublicPersons).mockReset())

describe('listPersonKnowledge', () => {
  it('etiqueta cada perfil con el dominio Personas y conserva el dato tal cual', async () => {
    vi.mocked(listPublicPersons).mockResolvedValue([PERSONA])

    const [item] = await listPersonKnowledge()

    expect(item.domain).toBe('Personas')
    expect(item.data).toEqual(PERSONA)
  })

  it('conserva provenance del catalogo propio, sin fabricar fuente ni URL', async () => {
    vi.mocked(listPublicPersons).mockResolvedValue([PERSONA])

    const [item] = await listPersonKnowledge()

    expect(item.provenance.authority).toBe('CATALOGO_PROPIO')
    expect(item.provenance.sourceName).toBeNull()
    expect(item.provenance.sourceUrl).toBeNull()
    expect(item.provenance.validUntil).toBeNull()
    expect(typeof item.provenance.observedAt).toBe('string')
  })

  it('deriva la funcion desde tipo_perfil, nunca desde la biografia', async () => {
    vi.mocked(listPublicPersons).mockResolvedValue([
      { ...PERSONA, profileType: 'actor' },
      { ...PERSONA, profileType: 'director' },
      { ...PERSONA, profileType: 'dramaturgo' },
      { ...PERSONA, profileType: 'productora' },
    ])

    const result = await listPersonKnowledge()

    expect(result.map((item) => item.functions)).toEqual([
      ['interpretacion'],
      ['direccion'],
      ['dramaturgia'],
      ['produccion'],
    ])
  })

  it('un perfil "profesional" no recibe funcion: su papel no se deduce del tipo', async () => {
    vi.mocked(listPublicPersons).mockResolvedValue([
      { ...PERSONA, profileType: 'profesional', bio: 'Costurera de vestuario teatral en Madrid.' },
    ])

    const [item] = await listPersonKnowledge()

    expect(item.functions).toEqual([])
  })

  it('la ubicacion real viaja intacta, y NULL sigue siendo NULL', async () => {
    vi.mocked(listPublicPersons).mockResolvedValue([
      PERSONA,
      { ...PERSONA, id: 'p-2', city: null, region: null, countryCode: null },
    ])

    const [conUbicacion, sinUbicacion] = await listPersonKnowledge()

    expect(conUbicacion.data.city).toBe('Madrid')
    expect(sinUbicacion.data.city).toBeNull()
    expect(sinUbicacion.data.region).toBeNull()
  })

  it('propaga criterio y limite hasta Repository Layer, sin alterarlos', async () => {
    vi.mocked(listPublicPersons).mockResolvedValue([])

    await listPersonKnowledge({ profileType: 'actor', city: 'tenerife' }, 7)

    expect(listPublicPersons).toHaveBeenCalledWith({ profileType: 'actor', city: 'tenerife' }, 7)
  })

  it('sin criterio pasa un criterio vacio: enumerar sigue siendo el comportamiento por defecto', async () => {
    vi.mocked(listPublicPersons).mockResolvedValue([])

    await listPersonKnowledge()

    expect(listPublicPersons).toHaveBeenCalledWith({}, undefined)
  })

  it('la provenance no cambia por haberse aplicado un criterio: sigue siendo el catalogo propio', async () => {
    vi.mocked(listPublicPersons).mockResolvedValue([PERSONA])

    const [item] = await listPersonKnowledge({ profileType: 'dramaturgo', city: 'tenerife' })

    expect(item.provenance.authority).toBe('CATALOGO_PROPIO')
    expect(item.provenance.sourceName).toBeNull()
    expect(item.provenance.sourceUrl).toBeNull()
  })
})

describe('listPersonKnowledge — solo personas', () => {
  it('Repository Layer ya excluye los perfiles organizativos: nada que filtrar aqui', async () => {
    vi.mocked(listPublicPersons).mockResolvedValue([
      { ...PERSONA, profileType: 'actor' },
      { ...PERSONA, id: 'p-2', profileType: 'profesional' },
    ])

    const result = await listPersonKnowledge()

    expect(result.map((item) => item.domain)).toEqual(['Personas', 'Personas'])
    expect(result.map((item) => item.data.profileType)).toEqual(['actor', 'profesional'])
  })
})
