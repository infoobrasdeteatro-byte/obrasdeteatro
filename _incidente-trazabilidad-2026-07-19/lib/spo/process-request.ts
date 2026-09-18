import { normalizeRequest } from '@/lib/request-interpreter'
import { buildProfessionalContext } from '@/lib/professional-context-engine'
import type { SessionInput } from '@/lib/professional-context-engine'
import { buildKnowledgeContext } from '@/lib/scenaia-knowledge-model'
import { buildDecisionContext } from '@/lib/decision-engine'
import { buildAuthorizationContext } from '@/lib/credit-manager'
import { executeAIRequest } from '@/lib/ai-gateway'
import { composeResponse } from '@/lib/response-composer'
import type { ResponseContext } from '@/lib/response-composer'
import { recordExecutionAudit } from '@/lib/repository-layer'
import { recordActivity } from '@/lib/procesos-asincronos'

/**
 * Unico punto de entrada del SPO (especificacion arquitectonica congelada,
 * Fase F). Compone exclusivamente contratos ya existentes del Nucleo, en
 * secuencia lineal -- en la arquitectura actualmente congelada, las
 * decisiones funcionales y las ramas de ejecucion pertenecen a los
 * componentes especializados (Credit Manager ya maneja needsAI=false
 * internamente; AI Gateway ya maneja needsAI=false y autorizacion denegada
 * internamente), no al SPO. La ausencia de logica condicional en esta
 * implementacion es una consecuencia de la arquitectura vigente, no un
 * principio permanente del SPO -- si una futura Decision Transversal
 * modifica el recorrido oficial del Nucleo, esta funcion podra adaptarse
 * sin reabrir la especificacion ni este Plan Tecnico.
 *
 * `normalizedRequest.requestId` (DT-001) se preserva durante todo el
 * recorrido por permanecer en el ambito de esta funcion junto al resto del
 * estado -- ningun contrato posterior al de Request Interpreter lo
 * transporta (verificado), por lo que no se propaga hacia `recordActivity`
 * ni `recordExecutionAudit`, que no lo aceptan como parametro.
 */
export async function processRequest(
  userId: string,
  session: SessionInput,
  originalRequest: string
): Promise<ResponseContext> {
  const normalizedRequest = normalizeRequest(originalRequest)
  const professionalContext = await buildProfessionalContext(userId, session)
  const knowledgeContext = await buildKnowledgeContext(normalizedRequest)
  const decisionContext = buildDecisionContext(normalizedRequest, professionalContext, knowledgeContext)
  const authorizationContext = await buildAuthorizationContext(professionalContext, decisionContext)
  const { result, audit } = await executeAIRequest(decisionContext, authorizationContext)
  const responseContext = composeResponse(decisionContext, authorizationContext, result)

  // Observaciones laterales: nunca deben interrumpir el recorrido sincrono
  // ya completado. recordExecutionAudit lanza por diseno (Repository Layer
  // mantiene un comportamiento uniforme); la resiliencia es responsabilidad
  // de este punto de invocacion, no del mecanismo de persistencia.
  try {
    await recordExecutionAudit(userId, audit)
  } catch {
    // Fallo de auditoria tecnica: no afecta a una respuesta ya construida.
  }

  await recordActivity({ profileId: userId, responseType: responseContext.responseType })

  return responseContext
}
