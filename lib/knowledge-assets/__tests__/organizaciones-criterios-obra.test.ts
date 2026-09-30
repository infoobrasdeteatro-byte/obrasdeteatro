import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { listOrganizationLocations } from '@/lib/repository-layer'
import { listOrganizationKnowledge } from '../organizations-knowledge'
import { retrieveRelevantKnowledge } from '../semantic-retriever'
import { interpretOrganizationQuery, unappliedWorkCriteria } from '../interpret-organization-query'
import { VOCABULARIO_EPOCA, VOCABULARIO_GENERO } from '../interpret-work-query'
import { normalizeText } from '@/lib/request-interpreter/normalize-text'
import { buildKnowledgeContext, partiallyAppliedCriteriaNote, unfilteredCriteriaNote } from '@/lib/scenaia-knowledge-model'
import { composePrompt } from '@/lib/prompt-composer'
import { buildDirectContent } from '@/lib/direct-content-builder'
import type { NormalizedRequest } from '@/lib/request-interpreter'
import type { Organization } from '@/lib/repository-layer'

// Solo se simula la persistencia: los intérpretes, el recuperador, el
// Knowledge Model, el Prompt Composer y el Direct Content Builder son REALES.
vi.mock('@/lib/repository-layer', async () => {
  const { normalizeLocationValue, resolveLocationVariants } = await import('@/lib/repository-layer/location-normalization')

  return {
    normalizeLocationValue,
    resolveLocationVariants,
    listPublishedWorkAuthors: vi.fn(async () => []),
    listOrganizationLocations: vi.fn(),
    listPersonLocations: vi.fn(async () => ({ regions: [], cities: [] })),
  }
})
vi.mock('../organizations-knowledge', () => ({ listOrganizationKnowledge: vi.fn() }))
vi.mock('../works-knowledge', () => ({ listWorkKnowledge: vi.fn(async () => []) }))
vi.mock('../persons-knowledge', () => ({ listPersonKnowledge: vi.fn(async () => []) }))

/**
 * SCENAIA-008 (§4 y §7): Organizaciones declara como criterio no aplicado el
 * género y la época que menciona la consulta, porque no sabe filtrar por
 * ellos. Catálogo simulado con UN teatro, que no coincide con nada de lo
 * pedido: Organizaciones no puede saber si coincide, y la nota sale igual.
 */

const TEATRO: Organization = { id: 'org-1', name: 'Sala Cuarta Pared', type: 'theater', countryCode: 'ES', region: null, city: 'Madrid', website: null, slug: 'sala-cuarta-pared' }
const PLATAFORMA: Organization = { id: 'org-2', name: 'Biblioteca Oficial', type: 'platform', countryCode: null, region: null, city: null, website: null, slug: 'biblioteca' }
const item = (data: Organization) => ({ domain: 'Organizaciones', data, provenance: {}, functions: [] })

/** Repository Layer simulado: aplica el filtro de tipo como la consulta real. */
function catalogo(filas: Organization[]) {
  vi.mocked(listOrganizationKnowledge).mockImplementation((async (criterios: { type?: string } = {}) =>
    filas.filter((f) => criterios.type === undefined || f.type === criterios.type).map(item)) as never)
}

function peticion(texto: string): NormalizedRequest {
  const q = normalizeText(texto)
  return {
    requestId: 'req-008', originalRequest: texto, normalizedIntent: q, retrievalQuery: q,
    requestsFullCatalog: false, requestsPlainListing: false, requestType: 'RECONOCIDA',
    requestedKnowledgeDomains: ['Organizaciones'], estimatedComplexity: 'baja',
    professionalContextLevel: 'STANDARD', detectedAmbiguities: [], interpretationConfidence: 1,
    timestamp: '2026-09-30T00:00:00.000Z',
  }
}

const PARCIAL = partiallyAppliedCriteriaNote('Organizaciones')
const SIN_FILTRAR = unfilteredCriteriaNote('Organizaciones')
const AVISO_PARCIAL = 'Organizaciones: el listado esta filtrado solo EN PARTE'
const AVISO_SIN_FILTRAR = 'Organizaciones: el listado NO esta filtrado por el criterio pedido.'

async function turno(texto: string) {
  const req = peticion(texto)
  const r = await retrieveRelevantKnowledge('Organizaciones', req.retrievalQuery)
  const ctx = await buildKnowledgeContext(req, {})
  return { r, ctx, prompt: composePrompt(req, ctx), directo: buildDirectContent(ctx) }
}

beforeEach(() => {
  vi.mocked(listOrganizationLocations).mockReset().mockResolvedValue({ regions: [], cities: [] })
  catalogo([TEATRO, PLATAFORMA])
})

describe('con un teatro en el catálogo y género o época en la consulta (§7.1)', () => {
  it.each([
    ['teatro barroco', ['epoca']],
    ['teatro de comedia', ['genero']],
    ['teatro del siglo de oro', ['epoca']],
    ['teatros contemporáneos', ['epoca']],
  ])('"%s": el teatro aparece, se declara %j, nota parcial y aviso a la IA', async (texto, criterios) => {
    const { r, ctx, prompt } = await turno(texto)
    expect(r.items.map((i) => (i.data as Organization).name)).toEqual(['Sala Cuarta Pared'])
    expect(r.requestWasNarrowed).toBe(true)
    expect(r.unappliedCriteria).toEqual(criterios)
    expect(ctx.knowledgeLimitations).toContain(PARCIAL)
    expect(ctx.knowledgeLimitations).not.toContain(SIN_FILTRAR)
    expect(prompt).toContain(AVISO_PARCIAL)
  })

  it('"teatro barroco en Madrid" con Madrid sin resolver: ubicación y época', async () => {
    const { r, ctx } = await turno('teatro barroco en Madrid')
    expect(r.unappliedCriteria).toEqual(['ubicacion', 'epoca'])
    expect(ctx.knowledgeLimitations).toContain(PARCIAL)
  })

  it('"teatro barroco en Madrid" con Madrid resuelto: solo época', async () => {
    vi.mocked(listOrganizationLocations).mockResolvedValue({ regions: [], cities: ['Madrid'] })
    const { r } = await turno('teatro barroco en Madrid')
    expect(r.unappliedCriteria).toEqual(['epoca'])
  })

  it('género y época a la vez: se declaran los dos', async () => {
    const { r } = await turno('teatro de comedia barroca')
    expect(r.unappliedCriteria).toEqual(['genero', 'epoca'])
  })

  it('el teatro no coincide con nada de lo pedido y la nota sale igual (Organizaciones no puede saberlo)', async () => {
    const { r, ctx } = await turno('teatro isabelino')
    expect(r.items.map((i) => (i.data as Organization).name)).toEqual(['Sala Cuarta Pared'])
    expect(ctx.knowledgeLimitations).toContain(PARCIAL)
  })
})

describe('sin género ni época: todo igual que hoy (§7.2)', () => {
  it.each([
    ['teatros', []],
    ['salas', []],
    ['compañías', []],
  ])('"%s": unappliedCriteria %j y ninguna nota', async (texto, criterios) => {
    const { r, ctx, prompt } = await turno(texto)
    expect(r.unappliedCriteria).toEqual(criterios)
    expect(ctx.knowledgeLimitations).not.toContain(PARCIAL)
    expect(ctx.knowledgeLimitations).not.toContain(SIN_FILTRAR)
    expect(prompt).not.toContain(AVISO_PARCIAL)
  })

  it('"teatros en Madrid" con Madrid resuelto: nada declarado, ninguna nota', async () => {
    vi.mocked(listOrganizationLocations).mockResolvedValue({ regions: [], cities: ['Madrid'] })
    const { r, ctx } = await turno('teatros en Madrid')
    expect(r.unappliedCriteria).toEqual([])
    expect(ctx.knowledgeLimitations).not.toContain(PARCIAL)
  })

  it('"teatros en Madrid" con Madrid sin resolver: solo la ubicación, como hoy', async () => {
    const { r } = await turno('teatros en Madrid')
    expect(r.unappliedCriteria).toEqual(['ubicacion'])
  })

  it('edad, duración y reparto quedan fuera del acta (§6.4): "teatro infantil" no declara nada', async () => {
    const { r } = await turno('teatro infantil')
    expect(r.unappliedCriteria).toEqual([])
  })
})

describe('consulta sin término de tipo (§7.3)', () => {
  it('"productoras barrocas" con una institución en el catálogo: nota de sin filtrar y aviso a la IA', async () => {
    const { r, ctx, prompt } = await turno('productoras barrocas')
    expect(interpretOrganizationQuery(normalizeText('productoras barrocas'))).toEqual({})
    expect(r.items).toHaveLength(2)
    expect(r.requestWasNarrowed).toBe(false)
    expect(r.unappliedCriteria).toEqual(['epoca', 'tipo'])
    expect(ctx.knowledgeLimitations).toContain(SIN_FILTRAR)
    expect(prompt).toContain(AVISO_SIN_FILTRAR)
  })

  it('"productoras barrocas" con cero resultados: el texto directo del §4.5', async () => {
    catalogo([])
    const { directo } = await turno('productoras barrocas')
    expect(directo).toBe('En organizaciones no he podido aplicar el criterio que pedías, y tampoco he encontrado ningún resultado.')
  })

  it('con tipo y cero resultados ("teatro barroco", hoy): el texto directo no cambia', async () => {
    catalogo([PLATAFORMA])
    const { directo, ctx } = await turno('teatro barroco')
    expect(ctx.knowledgeLimitations).toContain(PARCIAL)
    expect(directo).toBe('En organizaciones no he encontrado ningún resultado.')
  })
})

describe('palabra completa, no subcadena (§7.4)', () => {
  it.each([
    ['teatros en activo actualmente', []],
    ['teatro actual', ['epoca']],
    ['teatro neoclásico', ['epoca']],
    ['teatros divertidos', []],
    ['teatro de comedias', ['genero']],
  ])('"%s" → %j', (texto, esperado) => {
    expect(unappliedWorkCriteria(normalizeText(texto))).toEqual(esperado)
  })
})

describe('independencia del interruptor de época (§4.3 y §7.5)', () => {
  it.each(['teatro barroco', 'teatro de comedia', 'productoras barrocas', 'teatros', 'teatro realismo'])(
    '"%s": resultado idéntico con la opción ausente, false y true',
    async (texto) => {
      const q = normalizeText(texto)
      const sin = await retrieveRelevantKnowledge('Organizaciones', q)
      const apagada = await retrieveRelevantKnowledge('Organizaciones', q, undefined, {}, undefined, { epocaHabilitada: false })
      const encendida = await retrieveRelevantKnowledge('Organizaciones', q, undefined, {}, undefined, { epocaHabilitada: true })
      expect(apagada).toEqual(sin)
      expect(encendida).toEqual(sin)
    }
  )
})

describe('sincronía con el vocabulario del intérprete de obras, sin excepciones (§7.6)', () => {
  const FUENTE = readFileSync(join(__dirname, '..', 'interpret-work-query.ts'), 'utf-8')
  const terminos = (bloque: string) => [...bloque.matchAll(/'([a-z ]+)'/g)].map((m) => m[1])
  const linea = (concepto: string) => {
    const m = FUENTE.match(new RegExp(`\\n  ${concepto}: \\[([^\\]]*)\\]`))
    if (!m) throw new Error(`no se encuentra ${concepto} en el intérprete de obras`)
    return terminos(m[1])
  }
  const bloqueEpocas = FUENTE.match(/const EPOCA_TERMS[^=]*= \{([\s\S]*?)\n\}/)
  if (!bloqueEpocas) throw new Error('no se encuentra EPOCA_TERMS en el intérprete de obras')

  const GENEROS = [...linea('COMEDIA'), ...linea('MUSICAL'), ...linea('CLASICO')]
  const EPOCAS = [...linea('CONTEMPORANEO'), ...terminos(bloqueEpocas[1])]

  it('el vocabulario exportado es exactamente el del intérprete, ni más ni menos', () => {
    expect([...VOCABULARIO_GENERO].sort()).toEqual([...GENEROS].sort())
    expect([...VOCABULARIO_EPOCA].sort()).toEqual([...EPOCAS].sort())
    expect(EPOCAS.length).toBeGreaterThan(40)
  })

  it('incluye los términos que la 004D dejó fuera de su forma cerrada', () => {
    for (const t of ['realismo', 'naturalismo', 'renacimiento', 'griego', 'aureo', 'vanguardista', 'postguerra', 'actual', 'moderna']) {
      expect(VOCABULARIO_EPOCA, t).toContain(t)
    }
  })

  it('cada sinónimo de género se declara como género, solo y dentro de una frase', () => {
    for (const t of GENEROS) {
      expect(unappliedWorkCriteria(t), t).toContain('genero')
      expect(unappliedWorkCriteria(`teatros de ${t} en madrid`), t).toContain('genero')
    }
  })

  it('cada sinónimo de época se declara como época, solo y dentro de una frase', () => {
    for (const t of EPOCAS) {
      expect(unappliedWorkCriteria(t), t).toEqual(['epoca'])
      expect(unappliedWorkCriteria(`teatros de ${t} en madrid`), t).toContain('epoca')
    }
  })

  it('el vocabulario es de solo lectura', () => {
    expect(Object.isFrozen(VOCABULARIO_GENERO)).toBe(true)
    expect(Object.isFrozen(VOCABULARIO_EPOCA)).toBe(true)
  })
})

describe('invariantes de contrato (solo lo que reabre SCENAIA-008)', () => {
  const fuente = (f: string) => readFileSync(join(__dirname, '..', f), 'utf-8')
  const sinComentarios = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '')

  it('el intérprete de Organizaciones solo importa del de obras el vocabulario, nunca sus funciones ni la opción de época', () => {
    const org = sinComentarios(fuente('interpret-organization-query.ts'))
    expect(org).toMatch(/import \{ VOCABULARIO_EPOCA, VOCABULARIO_GENERO \} from '\.\/interpret-work-query'/)
    expect(org).not.toMatch(/interpretWorkQuery|resolveWorkOccupancy|OpcionesEpoca|epocaHabilitada|process\.env/)
  })

  it('la declaración no depende del interruptor: el recuperador no pasa la opción de época a Organizaciones', () => {
    expect(fuente('semantic-retriever.ts')).toMatch(/\.\.\.unappliedWorkCriteria\(query\),/)
  })

  it('requestWasNarrowed de Organizaciones no cambia', () => {
    expect(fuente('semantic-retriever.ts')).toMatch(
      /return \{ items, requestWasNarrowed: Object\.keys\(criteria\)\.length > 0, unappliedCriteria, workOccupancy: \{\}, worksPage: null \}/
    )
  })

  it('interpretWorkQuery no usa el vocabulario exportado: su comportamiento no cambia', () => {
    const obras = sinComentarios(fuente('interpret-work-query.ts'))
    expect(obras.match(/VOCABULARIO_(GENERO|EPOCA)/g)).toHaveLength(2)
  })
})
