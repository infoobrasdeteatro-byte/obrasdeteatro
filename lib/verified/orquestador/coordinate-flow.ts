import { normalizeRequest } from '@/lib/request-interpreter'
import { buildProfessionalContext } from '@/lib/professional-context-engine'
import type { SessionInput } from '@/lib/professional-context-engine'
import { buildKnowledgeContext } from '@/lib/scenaia-knowledge-model'
import { buildDecisionContext } from '@/lib/decision-engine'
import { buildAuthorizationContext } from '@/lib/credit-manager'
import { executeAIRequest } from '@/lib/ai-gateway'
import { composeResponse } from '@/lib/response-composer'
import type { ResponseContext } from '@/lib/response-composer'
import { recordActivity } from '@/lib/procesos-asincronos'
import { recordExecutionTrace } from '@/lib/verified/observabilidad'

/**
 * Unico punto de entrada del Orquestador (Plan Tecnico aprobado, Acta de
 * Autorizacion 2026-07-19). Invocacion incondicional y estrictamente lineal
 * de los 7 pasos del Nucleo -- cada uno ya se autoguarda internamente ante
 * los casos "no aplica"/"no autorizado"/"no requerido"; decidir aqui si
 * invocarlos o no duplicaria una decision que Decision Engine ya toma
 * (PAO-01, ausencia de duplicidad funcional).
 *
 * PCE y SKM se invocan en secuencia, no en paralelo, aunque no exista
 * dependencia de datos entre ambos: preserva el orden literal del diagrama
 * oficial de SC-003 (PAO-06), sin introducir una optimizacion de paralelismo
 * no autorizada por ningun criterio de calidad del Plan Tecnico.
 *
 * Los pasos de observacion (recordActivity/recordExecutionTrace) se
 * invocan solo despues de tener ya el ResponseContext final, nunca antes
 * -- no pueden interferir con la produccion de la respuesta (PAO-02 a
 * PAO-05). Ninguno de los dos lanza excepcion por contrato propio; se
 * esperan de forma simple y secuencial, sin ejecucion en segundo plano no
 * solicitada.
 *
 * "Mi Trayectoria(R)" (paso final condicional del diagrama historico de
 * SC-003) no aparece aqui -- omision deliberada: DT-003 ya reinterpreto ese
 * paso como observacion pasiva via Procesos Asincronos, nunca invocacion
 * directa desde el flujo que produce la respuesta.
 */
export async function coordinateFlow(
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

  await recordActivity({
    profileId: professionalContext.identity.userId,
    responseType: responseContext.responseType,
  })
  await recordExecutionTrace(professionalContext.identity.userId, audit)

  return responseContext
}
