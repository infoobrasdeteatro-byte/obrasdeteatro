import { describe, it, expect, vi, beforeEach } from 'vitest'
import { normalizeRequest } from '@/lib/request-interpreter'
import { buildProfessionalContext } from '@/lib/professional-context-engine'
import { buildKnowledgeContext } from '@/lib/scenaia-knowledge-model'
import { buildDecisionContext } from '@/lib/decision-engine'
import { buildAuthorizationContext } from '@/lib/credit-manager'
import { executeAIRequest } from '@/lib/ai-gateway'
import { composeResponse } from '@/lib/response-composer'
import { recordExecutionAudit } from '@/lib/repository-layer'
import { recordActivity } from '@/lib/procesos-asincronos'
import { processRequest } from '../process-request'

vi.mock('@/lib/request-interpreter', () => ({ normalizeRequest: vi.fn() }))
vi.mock('@/lib/professional-context-engine', () => ({ buildProfessionalContext: vi.fn() }))
vi.mock('@/lib/scenaia-knowledge-model', () => ({ buildKnowledgeContext: vi.fn() }))
vi.mock('@/lib/decision-engine', () => ({ buildDecisionContext: vi.fn() }))
vi.mock('@/lib/credit-manager', () => ({ buildAuthorizationContext: vi.fn() }))
vi.mock('@/lib/ai-gateway', () => ({ executeAIRequest: vi.fn() }))
vi.mock('@/lib/response-composer', () => ({ composeResponse: vi.fn() }))
vi.mock('@/lib/repository-layer', () => ({ recordExecutionAudit: vi.fn() }))
vi.mock('@/lib/procesos-asincronos', () => ({ recordActivity: vi.fn() }))

const normalizedRequest = { requestId: 'req-1', originalRequest: 'hola', normalizedIntent: 'hola' } as never
const professionalContext = { identity: { userId: 'profile-1' } } as never
const knowledgeContext = { knowledgeDomains: [] } as never
const decisionContext = { needsAI: false } as never
const authorizationContext = { authorizationStatus: 'AUTHORIZED' } as never
const aiExecutionResult = { executionStatus: 'NO_REQUERIDO' } as never
const executionAudit = { providerIdentifier: null } as never
const responseContext = { responseType: 'RESPONSE_DIRECT', responseContent: 'hola de vuelta' } as never

beforeEach(() => {
  vi.mocked(normalizeRequest).mockReset().mockReturnValue(normalizedRequest)
  vi.mocked(buildProfessionalContext).mockReset().mockResolvedValue(professionalContext)
  vi.mocked(buildKnowledgeContext).mockReset().mockResolvedValue(knowledgeContext)
  vi.mocked(buildDecisionContext).mockReset().mockReturnValue(decisionContext)
  vi.mocked(buildAuthorizationContext).mockReset().mockResolvedValue(authorizationContext)
  vi.mocked(executeAIRequest).mockReset().mockResolvedValue({ result: aiExecutionResult, audit: executionAudit })
  vi.mocked(composeResponse).mockReset().mockReturnValue(responseContext)
  vi.mocked(recordExecutionAudit).mockReset().mockResolvedValue(undefined)
  vi.mocked(recordActivity).mockReset().mockResolvedValue(true)
})

describe('processRequest (SPO)', () => {
  it('compone los 7 contratos del recorrido oficial en el orden congelado, propagando cada salida', async () => {
    await processRequest('profile-1', { route: null, module: null, locale: 'es' }, 'hola')

    expect(normalizeRequest).toHaveBeenCalledWith('hola')
    expect(buildProfessionalContext).toHaveBeenCalledWith('profile-1', { route: null, module: null, locale: 'es' })
    expect(buildKnowledgeContext).toHaveBeenCalledWith(normalizedRequest)
    expect(buildDecisionContext).toHaveBeenCalledWith(normalizedRequest, professionalContext, knowledgeContext)
    expect(buildAuthorizationContext).toHaveBeenCalledWith(professionalContext, decisionContext)
    expect(executeAIRequest).toHaveBeenCalledWith(decisionContext, authorizationContext)
    expect(composeResponse).toHaveBeenCalledWith(decisionContext, authorizationContext, aiExecutionResult)
  })

  it('activa las dos observaciones laterales con los datos correctos, tras completar el recorrido síncrono', async () => {
    await processRequest('profile-1', { route: null, module: null, locale: 'es' }, 'hola')

    expect(recordExecutionAudit).toHaveBeenCalledWith('profile-1', executionAudit)
    expect(recordActivity).toHaveBeenCalledWith({ profileId: 'profile-1', responseType: 'RESPONSE_DIRECT' })
  })

  it('devuelve el ResponseContext producido por Response Composer', async () => {
    const result = await processRequest('profile-1', { route: null, module: null, locale: 'es' }, 'hola')

    expect(result).toBe(responseContext)
  })

  it('nunca interrumpe el recorrido si recordExecutionAudit lanza: sigue registrando la actividad y devuelve la respuesta', async () => {
    vi.mocked(recordExecutionAudit).mockRejectedValue(new Error('boom'))

    await expect(processRequest('profile-1', { route: null, module: null, locale: 'es' }, 'hola')).resolves.toBe(
      responseContext
    )

    expect(recordActivity).toHaveBeenCalledWith({ profileId: 'profile-1', responseType: 'RESPONSE_DIRECT' })
  })
})
