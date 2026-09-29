import { describe, it, expect, vi, beforeEach } from 'vitest'
import { listPublishedWorkAuthors } from '@/lib/repository-layer'
import { listWorkKnowledge } from '../works-knowledge'
import { retrieveRelevantKnowledge } from '../semantic-retriever'

// Solo se simulan los accesores a persistencia: el intérprete es el REAL,
// que es justamente lo que recibe la opción de época.
vi.mock('@/lib/repository-layer', () => ({
  listPublishedWorkAuthors: vi.fn(),
  listOrganizationLocations: vi.fn(),
  listPersonLocations: vi.fn(),
}))
vi.mock('../works-knowledge', () => ({ listWorkKnowledge: vi.fn() }))
vi.mock('../organizations-knowledge', () => ({ listOrganizationKnowledge: vi.fn() }))
vi.mock('../persons-knowledge', () => ({ listPersonKnowledge: vi.fn() }))

/**
 * SCENAIA-007 (adenda al §4.2): el recuperador no lee el entorno; reenvía la
 * opción de época que le llega al intérprete real, y de ahí sale el criterio
 * que Repository Layer ya sabe aplicar (PR 2).
 */
const ON = { epocaHabilitada: true } as const
const CLASICO = ['grecolatino', 'renacimiento', 'siglo_de_oro', 'barroco', 'isabelino', 'neoclasico']

beforeEach(() => {
  vi.mocked(listPublishedWorkAuthors).mockReset().mockResolvedValue(['Lope de Vega'])
  vi.mocked(listWorkKnowledge).mockReset().mockResolvedValue([])
})

describe('retrieveRelevantKnowledge (Obras) — opción de época', () => {
  it('encendida: "obras de teatro clasico" llega a Repository Layer como épocas, y la ranura es epoca', async () => {
    const r = await retrieveRelevantKnowledge('Obras', 'obras de teatro clasico', 5, {}, undefined, ON)

    expect(listWorkKnowledge).toHaveBeenCalledWith({ epocas: CLASICO }, 5)
    expect(r.workOccupancy).toEqual({ epoca: 'CLASICO' })
    expect(r.requestWasNarrowed).toBe(true)
  })

  it('apagada (sin la opción): el mismo texto sigue siendo el género de siempre', async () => {
    const r = await retrieveRelevantKnowledge('Obras', 'obras de teatro clasico', 5, {})

    expect(listWorkKnowledge).toHaveBeenCalledWith({ genre: 'clasico' }, 5)
    expect(r.workOccupancy).toEqual({ genero: 'CLASICO' })
  })

  it('"obras del siglo de oro": encendida, criterio y ningún autor pendiente; apagada, como hoy', async () => {
    const on = await retrieveRelevantKnowledge('Obras', 'obras del siglo de oro', 5, {}, undefined, ON)
    expect(listWorkKnowledge).toHaveBeenLastCalledWith({ epocas: ['siglo_de_oro'] }, 5)
    expect(on.unappliedCriteria).toEqual([])

    const off = await retrieveRelevantKnowledge('Obras', 'obras del siglo de oro', 5, {})
    expect(listWorkKnowledge).toHaveBeenLastCalledWith({}, 5)
    expect(off.unappliedCriteria).toEqual(['autor'])
  })

  it('encendida con página: la página se sigue pidiendo tal cual', async () => {
    vi.mocked(listWorkKnowledge).mockResolvedValue({ items: [], worksPage: { offset: 0, pageSize: 10, returned: 0, total: 0 } } as never)
    await retrieveRelevantKnowledge('Obras', 'teatro contemporaneo', undefined, {}, { offset: 0, pageSize: 10 }, ON)

    expect(listWorkKnowledge).toHaveBeenCalledWith({ epocas: ['contemporaneo'], epocaYearFrom: 1950 }, undefined, { offset: 0, pageSize: 10 })
  })
})
