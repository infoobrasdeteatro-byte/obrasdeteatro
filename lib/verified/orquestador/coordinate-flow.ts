import { normalizeRequest } from '@/lib/request-interpreter'
import { buildProfessionalContext } from '@/lib/professional-context-engine'
import type { SessionInput } from '@/lib/professional-context-engine'
import { buildKnowledgeContext } from '@/lib/scenaia-knowledge-model'
import { buildDecisionContext } from '@/lib/decision-engine'
import { buildAuthorizationContext } from '@/lib/credit-manager'
import { executeAIRequest } from '@/lib/ai-gateway'
import type { NormalizedAIRequest } from '@/lib/ai-gateway'
import { composeResponse } from '@/lib/response-composer'
import type { ResponseContext } from '@/lib/response-composer'
import { recordActivity } from '@/lib/procesos-asincronos'
import { distributeExecutionAudit } from '@/lib/execution-audit-router'
import { buildDirectContent } from '@/lib/direct-content-builder'
import { composePrompt } from '@/lib/prompt-composer'
import type { ConversationTurn } from '@/lib/prompt-composer'

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
 * Los pasos de observacion (recordActivity/distributeExecutionAudit) se
 * invocan solo despues de tener ya el ResponseContext final, nunca antes
 * -- no pueden interferir con la produccion de la respuesta (PAO-02 a
 * PAO-05). Ninguno de los dos lanza excepcion por contrato propio; se
 * esperan de forma simple y secuencial, sin ejecucion en segundo plano no
 * solicitada. distributeExecutionAudit (IA-007, Plan Tecnico aprobado
 * 2026-07-22) reemplaza la llamada directa que antes iba solo a
 * Observabilidad -- mismo destino y comportamiento, ahora vía el
 * mecanismo de distribucion transversal.
 *
 * "Mi Trayectoria(R)" (paso final condicional del diagrama historico de
 * SC-003) no aparece aqui -- omision deliberada: DT-003 ya reinterpreto ese
 * paso como observacion pasiva via Procesos Asincronos, nunca invocacion
 * directa desde el flujo que produce la respuesta.
 *
 * buildDirectContent (IA-008, Plan Tecnico aprobado 2026-07-22) se invoca
 * siempre, con el mismo knowledgeContext ya construido para Decision
 * Engine -- nunca condicionalmente por needsAI, para no duplicar aqui una
 * decision que ya toma Decision Engine/Response Composer (mismo criterio
 * de PAO-01 aplicado al resto de pasos). Su resultado se enhebra como
 * cuarto argumento de composeResponse(), reapertura minima autorizada de
 * su contrato de entrada; Response Composer sigue siendo el unico que
 * decide si ese valor se usa (rama RESPONSE_DIRECT).
 *
 * normalizedAIRequest (IA-OPENAI-002, Aprobacion de Direccion 2026-07-23):
 * unico punto del sistema donde se construye -- reutiliza el
 * `normalizedRequest` que este mismo Orquestador ya tiene en su ambito
 * local (paso 1), sin que ningun objeto intermedio del Nucleo lo
 * transporte. Se construye siempre, no solo cuando needsAI es true (mismo
 * criterio ya aplicado a buildDirectContent): decidir condicionalmente
 * aqui duplicaria una decision que ya toma Decision Engine.
 *
 * userPrompt (SCENAIA-002A, Plan Tecnico aprobado): deja de ser el texto
 * normalizado a secas -- composePrompt() (lib/prompt-composer/) combina el
 * texto original de la peticion con el resumen de conocimiento ya
 * calculado por knowledgeContext (mismo objeto, ya en ambito, sin nueva
 * dependencia de datos). AIExecutionInput, ProviderAdapter, AI Gateway y
 * el SDK de OpenAI no cambian: userPrompt sigue siendo un unico string,
 * solo cambia como se compone su contenido.
 *
 * conversationHistory (UX-001A, Sprint aprobado, parametro cuarto con
 * valor por defecto `[]` -- preserva sin ningun cambio el comportamiento
 * de cualquier llamador existente que no lo proporcione): el cliente
 * construye y mantiene el historial completo de la sesion (sin
 * persistencia, sin base de datos, sin sincronizacion entre dispositivos
 * -- fuera del alcance de este bloque); el Orquestador se limita a
 * transportarlo, sin interpretarlo, unicamente hasta composePrompt().
 * Ninguno de los 7 componentes del Nucleo (Request Interpreter, PCE, SKM,
 * Decision Engine, Credit Manager, AI Gateway, Response Composer) recibe
 * ni conoce este historial -- cada uno sigue operando exclusivamente
 * sobre `originalRequest`, exactamente igual que antes de este bloque.
 */
export async function coordinateFlow(
  userId: string,
  session: SessionInput,
  originalRequest: string,
  conversationHistory: readonly ConversationTurn[] = []
): Promise<ResponseContext> {
  const normalizedRequest = normalizeRequest(originalRequest)
  const professionalContext = await buildProfessionalContext(userId, session)
  const knowledgeContext = await buildKnowledgeContext(normalizedRequest)
  const decisionContext = buildDecisionContext(normalizedRequest, professionalContext, knowledgeContext)
  const authorizationContext = await buildAuthorizationContext(professionalContext, decisionContext)
  const normalizedAIRequest: NormalizedAIRequest = {
    userPrompt: composePrompt(normalizedRequest, knowledgeContext, conversationHistory),
  }
  const { result, audit } = await executeAIRequest({ decisionContext, authorizationContext, normalizedAIRequest })
  const directContent = buildDirectContent(knowledgeContext)
  const responseContext = composeResponse(decisionContext, authorizationContext, result, directContent)

  await recordActivity({
    profileId: professionalContext.identity.userId,
    responseType: responseContext.responseType,
  })
  await distributeExecutionAudit(professionalContext.identity.userId, audit)

  return responseContext
}
