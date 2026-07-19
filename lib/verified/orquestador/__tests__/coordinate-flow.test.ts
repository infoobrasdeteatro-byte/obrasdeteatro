import { describe, it, expect, vi, beforeEach } from 'vitest'
import { normalizeRequest } from '@/lib/request-interpreter'
import { buildProfessionalContext } from '@/lib/professional-context-engine'
import { buildKnowledgeContext } from '@/lib/scenaia-knowledge-model'
import { buildDecisionContext } from '@/lib/decision-engine'
import { buildAuthorizationContext } from '@/lib/credit-manager'
import { executeAIRequest } from '@/lib/ai-gateway'
import { composeResponse } from '@/lib/response-composer'
import { recordActivity } from '@/lib/procesos-asincronos'
import { recordExecutionTrace } from '@/lib/verified/observabilidad'
import { coordinateFlow } from '../coordinate-flow'

vi.mock('@/lib/request-interpreter', () => ({ normalizeRequest: vi.fn() }))
vi.mock('@/lib/professional-context-engine', () => ({ buildProfessionalContext: vi.fn() }))
vi.mock('@/lib/scenaia-knowledge-model', () => ({ buildKnowledgeContext: vi.fn() }))
vi.mock('@/lib/decision-engine', () => ({ buildDecisionContext: vi.fn() }))
vi.mock('@/lib/credit-manager', () => ({ buildAuthorizationContext: vi.fn() }))
vi.mock('@/lib/ai-gateway', () => ({ executeAIRequest: vi.fn() }))
vi.mock('@/lib/response-composer', () => ({ composeResponse: vi.fn() }))
vi.mock('@/lib/procesos-asincronos', () => ({ recordActivity: vi.fn() }))
vi.mock('@/lib/verified/observabilidad', () => ({ recordExecutionTrace: vi.fn() }))

const normalizedRequest = { requestId: 'req-1', originalRequest: 'hola', normalizedIntent: 'hola' } as never
const professionalContext = { identity: { userId: 'profile-1' } } as never
const knowledgeContext = { knowledgeDomains: [] } as never
const decisionContext = { needsAI: true } as never
const authorizationContext = { authorizationStatus: 'AUTHORIZED' } as never
const aiExecutionResult = { executionStatus: 'EJECUTADO' } as never
const audit = { providerIdentifier: null, executionLatencyMs: null } as never
const responseContext = { responseType: 'RESPONSE_SUCCESS', responseContent: 'ok' } as never
const session = { currentRoute: '/x' } as never

beforeEach(() => {
  vi.mocked(normalizeRequest).mockReset().mockReturnValue(normalizedRequest)
  vi.mocked(buildProfessionalContext).mockReset().mockResolvedValue(professionalContext)
  vi.mocked(buildKnowledgeContext).mockReset().mockResolvedValue(knowledgeContext)
  vi.mocked(buildDecisionContext).mockReset().mockReturnValue(decisionContext)
  vi.mocked(buildAuthorizationContext).mockReset().mockResolvedValue(authorizationContext)
  vi.mocked(executeAIRequest).mockReset().mockResolvedValue({ result: aiExecutionResult, audit })
  vi.mocked(composeResponse).mockReset().mockReturnValue(responseContext)
  vi.mocked(recordActivity).mockReset().mockResolvedValue(true)
  vi.mocked(recordExecutionTrace).mockReset().mockResolvedValue(true)
})

describe('coordinateFlow', () => {
  it('invoca los 7 pasos del Núcleo en el orden congelado, enhebrando cada salida como entrada del siguiente', async () => {
    await coordinateFlow('profile-1', session, 'hola')

    expect(normalizeRequest).toHaveBeenCalledWith('hola')
    expect(buildProfessionalContext).toHaveBeenCalledWith('profile-1', session)
    expect(buildKnowledgeContext).toHaveBeenCalledWith(normalizedRequest)
    expect(buildDecisionContext).toHaveBeenCalledWith(normalizedRequest, professionalContext, knowledgeContext)
    expect(buildAuthorizationContext).toHaveBeenCalledWith(professionalContext, decisionContext)
    expect(executeAIRequest).toHaveBeenCalledWith(decisionContext, authorizationContext)
    expect(composeResponse).toHaveBeenCalledWith(decisionContext, authorizationContext, aiExecutionResult)
  })

  it('invoca PCE antes que SKM (orden congelado del flujo, no paralelo)', async () => {
    const order: string[] = []
    vi.mocked(buildProfessionalContext).mockImplementation(async () => {
      order.push('pce')
      return professionalContext
    })
    vi.mocked(buildKnowledgeContext).mockImplementation(async () => {
      order.push('skm')
      return knowledgeContext
    })

    await coordinateFlow('profile-1', session, 'hola')

    expect(order).toEqual(['pce', 'skm'])
  })

  it('registra la actividad y la traza técnica después de tener el ResponseContext final', async () => {
    await coordinateFlow('profile-1', session, 'hola')

    expect(recordActivity).toHaveBeenCalledWith({ profileId: 'profile-1', responseType: 'RESPONSE_SUCCESS' })
    expect(recordExecutionTrace).toHaveBeenCalledWith('profile-1', audit)
  })

  it('devuelve exactamente el ResponseContext producido por Response Composer', async () => {
    const result = await coordinateFlow('profile-1', session, 'hola')

    expect(result).toBe(responseContext)
  })

  it('no interrumpe la respuesta si recordActivity o recordExecutionTrace devuelven false (ninguno lanza por contrato propio)', async () => {
    vi.mocked(recordActivity).mockResolvedValue(false)
    vi.mocked(recordExecutionTrace).mockResolvedValue(false)

    const result = await coordinateFlow('profile-1', session, 'hola')

    expect(result).toBe(responseContext)
  })
})
