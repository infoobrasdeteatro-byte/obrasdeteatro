import { describe, it, expect } from 'vitest'
import type { NormalizedRequest } from '@/lib/request-interpreter'
import type { ProfessionalContext } from '@/lib/professional-context-engine'
import type { KnowledgeContext } from '@/lib/scenaia-knowledge-model'
import { buildDecisionContext } from '../decision-context-builder'

function fakeNormalizedRequest(overrides: Partial<NormalizedRequest> = {}): NormalizedRequest {
  return {
    requestId: 'req-1',
    originalRequest: 'texto de prueba',
    normalizedIntent: 'texto de prueba',
    retrievalQuery: 'texto de prueba',
    requestType: 'RECONOCIDA',
    requestedKnowledgeDomains: ['Obras'],
    estimatedComplexity: 'media',
    professionalContextLevel: 'STANDARD',
    detectedAmbiguities: [],
    interpretationConfidence: 1,
    timestamp: new Date().toISOString(),
    ...overrides,
  }
}

const FAKE_PROFESSIONAL_CONTEXT: ProfessionalContext = {
  identity: {
    userId: 'user-1',
    profileType: 'actor',
    language: 'es',
    country: 'ES',
    timezone: null,
    authenticationStatus: 'autenticado',
  },
  subscription: { plan: null, status: null, availableCapabilities: null, usageLimits: null },
  professionalProfile: { specialty: null, disciplines: null, experience: null, publicProfile: null },
  session: { route: null, module: null, locale: 'es', timestamp: new Date().toISOString() },
}

function fakeKnowledgeContext(overrides: Partial<KnowledgeContext> = {}): KnowledgeContext {
  return {
    knowledgeSummary: { domainsRequested: [], domainsCovered: [], domainsNotCovered: [], entryLabelsByDomain: {} },
    knowledgeDomains: [],
    knowledgeEntities: [],
    knowledgeRelations: null,
    knowledgeConfidence: 1,
    knowledgeCompleteness: 'completo',
    knowledgeLimitations: [],
    knowledgeTimestamp: new Date().toISOString(),
    ...overrides,
  }
}

describe('buildDecisionContext', () => {
  it('modo DIRECTO cuando el conocimiento esta completo', () => {
    const result = buildDecisionContext(
      fakeNormalizedRequest(),
      FAKE_PROFESSIONAL_CONTEXT,
      fakeKnowledgeContext({ knowledgeCompleteness: 'completo' })
    )

    expect(result.needsAI).toBe(false)
    expect(result.executionStrategy.executionMode).toBe('DIRECTO')
  })

  it('modo IA cuando el conocimiento es parcial o vacío', () => {
    const parcial = buildDecisionContext(
      fakeNormalizedRequest(),
      FAKE_PROFESSIONAL_CONTEXT,
      fakeKnowledgeContext({ knowledgeCompleteness: 'parcial' })
    )
    expect(parcial.needsAI).toBe(true)
    expect(parcial.executionStrategy.executionMode).toBe('IA')

    const vacio = buildDecisionContext(
      fakeNormalizedRequest(),
      FAKE_PROFESSIONAL_CONTEXT,
      fakeKnowledgeContext({ knowledgeCompleteness: 'vacio' })
    )
    expect(vacio.needsAI).toBe(true)
  })

  it('priorityLevel refleja la complejidad estimada de la petición', () => {
    const result = buildDecisionContext(
      fakeNormalizedRequest({ estimatedComplexity: 'alta' }),
      FAKE_PROFESSIONAL_CONTEXT,
      fakeKnowledgeContext()
    )

    expect(result.executionStrategy.priorityLevel).toBe('alta')
  })

  it('decisionConfidence es el mínimo entre interpretationConfidence y knowledgeConfidence', () => {
    const result = buildDecisionContext(
      fakeNormalizedRequest({ interpretationConfidence: 1 }),
      FAKE_PROFESSIONAL_CONTEXT,
      fakeKnowledgeContext({ knowledgeConfidence: 0.5 })
    )

    expect(result.decisionConfidence).toBe(0.5)
  })

  it('recommendedAgent y executionPolicy siempre null', () => {
    const result = buildDecisionContext(fakeNormalizedRequest(), FAKE_PROFESSIONAL_CONTEXT, fakeKnowledgeContext())

    expect(result.executionStrategy.recommendedAgent).toBeNull()
    expect(result.executionStrategy.executionPolicy).toBeNull()
  })

  it('recommendedProvider es el primer proveedor del catalogo oficial (IA-OPENAI-001: openai)', () => {
    const result = buildDecisionContext(fakeNormalizedRequest(), FAKE_PROFESSIONAL_CONTEXT, fakeKnowledgeContext())

    expect(result.executionStrategy.recommendedProvider).toBe('openai')
  })

  it('estimatedCost es 1 unidad ScenaIA cuando needsAI=true (estrategia inicial IA-004)', () => {
    const result = buildDecisionContext(
      fakeNormalizedRequest(),
      FAKE_PROFESSIONAL_CONTEXT,
      fakeKnowledgeContext({ knowledgeCompleteness: 'parcial' })
    )

    expect(result.needsAI).toBe(true)
    expect(result.estimatedCost).toBe(1)
  })

  it('estimatedCost es null cuando needsAI=false (no aplica ninguna operacion economica)', () => {
    const result = buildDecisionContext(
      fakeNormalizedRequest(),
      FAKE_PROFESSIONAL_CONTEXT,
      fakeKnowledgeContext({ knowledgeCompleteness: 'completo' })
    )

    expect(result.needsAI).toBe(false)
    expect(result.estimatedCost).toBeNull()
  })

  it('decisionRationale es una explicación no vacía y trazable a las señales usadas', () => {
    const result = buildDecisionContext(
      fakeNormalizedRequest(),
      FAKE_PROFESSIONAL_CONTEXT,
      fakeKnowledgeContext({ knowledgeCompleteness: 'parcial' })
    )

    expect(result.decisionRationale.length).toBeGreaterThan(0)
    expect(result.decisionRationale).toContain('IA-004')
  })
})
