import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import type { KnowledgeContext } from '@/lib/scenaia-knowledge-model'
import { buildDirectContent } from '../build-direct-content'

const MODULE_SOURCE = ['build-direct-content.ts', 'index.ts']
  .map((file) => readFileSync(join(__dirname, '..', file), 'utf-8'))
  .join('\n')

function fakeKnowledgeContext(overrides: Partial<KnowledgeContext> = {}): KnowledgeContext {
  return {
    knowledgeSummary: { domainsRequested: [], domainsCovered: [], domainsNotCovered: [], entryLabelsByDomain: {} },
    knowledgeDomains: [],
    knowledgeEntities: [],
    knowledgeRelations: null,
    knowledgeConfidence: 1,
    knowledgeCompleteness: 'completo',
    knowledgeLimitations: [],
    workOccupancy: {},
    knowledgeTimestamp: new Date().toISOString(),
    ...overrides,
  }
}

describe('Direct Content Builder — invariantes de integración (IA-008, Plan Técnico aprobado 2026-07-22)', () => {
  it('nunca depende de AI Gateway ni de ningun SDK de proveedor de IA', () => {
    expect(MODULE_SOURCE).not.toMatch(/from '@\/lib\/ai-gateway'/)
    expect(MODULE_SOURCE).not.toMatch(/fetch\(|axios|openai|anthropic/i)
  })

  it('nunca depende de Repository Layer ni de Knowledge Assets directamente', () => {
    expect(MODULE_SOURCE).not.toMatch(/from '@\/lib\/repository-layer'/)
    expect(MODULE_SOURCE).not.toMatch(/from '@\/lib\/knowledge-assets'/)
  })

  it('nunca depende de Response Composer (direccion unica: SKM -> componente -> Response Composer)', () => {
    expect(MODULE_SOURCE).not.toMatch(/from '@\/lib\/response-composer'/)
  })

  it('es puro y sincrono: sin async/await, sin I/O', () => {
    expect(MODULE_SOURCE).not.toMatch(/\basync\b|\bawait\b/)
  })

  it('nunca accede a Supabase directamente', () => {
    expect(MODULE_SOURCE).not.toMatch(/supabase|createClient/i)
  })
})

describe('Direct Content Builder — invariantes de comportamiento (SCENAIA-003, expediente aprobado 2026-08-27)', () => {
  const contextoConEtiquetas = fakeKnowledgeContext({
    knowledgeDomains: ['Obras'],
    knowledgeSummary: {
      domainsRequested: ['Obras'],
      domainsCovered: ['Obras'],
      domainsNotCovered: [],
      entryLabelsByDomain: { Obras: ['Obra A', 'Obra B'] },
    },
  })

  const contextoSinEtiquetas = fakeKnowledgeContext({
    knowledgeDomains: ['Obras'],
    knowledgeSummary: { domainsRequested: ['Obras'], domainsCovered: ['Obras'], domainsNotCovered: [], entryLabelsByDomain: {} },
  })

  it('nunca devuelve una cadena vacia', () => {
    expect(buildDirectContent(contextoConEtiquetas)).not.toBe('')
    expect(buildDirectContent(contextoSinEtiquetas)).not.toBe('')
  })

  it('devuelve null unicamente cuando no hay ningun dominio cubierto (A3)', () => {
    expect(buildDirectContent(fakeKnowledgeContext())).toBeNull()
    expect(buildDirectContent(contextoSinEtiquetas)).not.toBeNull()
    expect(buildDirectContent(contextoConEtiquetas)).not.toBeNull()
  })

  it('toda etiqueta emitida procede de entryLabelsByDomain: nunca inventa ni reescribe', () => {
    const salida = buildDirectContent(contextoConEtiquetas) as string

    expect(salida).toContain('Obra A')
    expect(salida).toContain('Obra B')
    expect(buildDirectContent(contextoSinEtiquetas) as string).not.toMatch(/Obra [AB]/)
  })

  it('la salida visible nunca expone jerga interna, codigos ni nombres de componentes', () => {
    const salidas = [
      buildDirectContent(contextoConEtiquetas),
      buildDirectContent(contextoSinEtiquetas),
    ]

    for (const salida of salidas) {
      expect(salida).not.toMatch(
        /KnowledgeContext|knowledgeCompleteness|coveredDomains|entryLabelsByDomain|needsAI|directContent|RESPONSE_|IA-00\d|SCENAIA-\d/
      )
    }
  })

  it('A1: solo consulta knowledgeLimitations por coincidencia exacta con unfilteredCriteriaNote, nunca de forma generica', () => {
    const usos = MODULE_SOURCE.match(/knowledgeLimitations[.\w]*/g) ?? []

    for (const uso of usos) {
      expect(['knowledgeLimitations', 'knowledgeLimitations.includes']).toContain(uso)
    }
    expect(MODULE_SOURCE).toMatch(/knowledgeLimitations\.includes\(unfilteredCriteriaNote\(domain\)\)/)
    expect(MODULE_SOURCE).not.toMatch(/knowledgeLimitations\.(map|join|filter|forEach|some|find|reduce)/)
  })
})
