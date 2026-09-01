import { normalizeRequest } from '@/lib/request-interpreter'
import { buildProfessionalContext } from '@/lib/professional-context-engine'
import type { SessionInput } from '@/lib/professional-context-engine'
import { buildKnowledgeContext } from '@/lib/scenaia-knowledge-model'
import { buildDecisionContext } from '@/lib/decision-engine'
import { buildAuthorizationContext } from '@/lib/credit-manager'
import { settleReservation, releaseReservation, resolveSettlementCost } from '@/lib/accounting-engine'
import { executeAIRequest } from '@/lib/ai-gateway'
import type { NormalizedAIRequest } from '@/lib/ai-gateway'
import { composeResponse } from '@/lib/response-composer'
import { recordActivity } from '@/lib/procesos-asincronos'
import { distributeExecutionAudit } from '@/lib/execution-audit-router'
import { recordTurnMetrics } from '@/lib/verified/observabilidad'
import type { SettlementAnomaly } from '@/lib/verified/observabilidad'
import { emptyConversationState, nextConversationState, workOccupancyOf } from '@/lib/conversation-state'
import { CREDIT_VALUE } from '@/lib/accounting-engine'
import { MAX_OUTPUT_TOKENS_BY_OPERATION } from '@/lib/ai-gateway'
import { buildResolverPrompt } from '@/lib/intent-resolver'
import type { IncomingConversationState } from '@/lib/conversation-state'
import type { TurnOutcome } from './types'
import { buildDirectContent } from '@/lib/direct-content-builder'
import { composePrompt } from '@/lib/prompt-composer'
import { composeAugmentedRequest, resolveVocabulary } from '@/lib/intent-resolver'
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
  conversationHistory: readonly ConversationTurn[] = [],
  incomingState: IncomingConversationState | null = null
): Promise<TurnOutcome> {
  // CONTEXTO CONVERSACIONAL (Fase 3). El Orquestador es el unico componente
  // que ve el estado completo, y lo descompone antes de que cruce ninguna
  // frontera: al interprete le entrega un dominio, y al conocimiento una
  // ocupacion de ranuras. Ninguno de los dos recibe -- ni puede recibir --
  // el estado entero.
  //
  // Un estado ausente o descartado por invalido deja ambas piezas en su
  // valor neutro, y el turno se resuelve exactamente como se resolvia
  // antes de esta fase.
  const estadoPrevio = incomingState ?? emptyConversationState(crypto.randomUUID())
  const dominioPrevio = estadoPrevio.activeDomain
  const ocupacionPrevia = workOccupancyOf(estadoPrevio, 'Obras')
  // Continuidad contextual: los turnos previos del usuario -- nunca los de
  // ScenaIA, que son respuestas, no peticiones -- se ofrecen al interprete
  // para que un turno de continuacion siga siendo interpretable. El
  // historial es el mismo que ya recibia composePrompt(); no hay fuente
  // nueva ni estado nuevo.
  // Fase 0 -- observabilidad: instante de entrada del turno. Solo se lee al
  // final, para medir cuanto tardo el flujo completo.
  const turnStartedAt = Date.now()

  const previousUserRequests = conversationHistory.filter((turn) => turn.role === 'user').map((turn) => turn.content)
  let normalizedRequest = normalizeRequest(originalRequest, previousUserRequests, dominioPrevio)
  const professionalContext = await buildProfessionalContext(userId, session)
  let knowledgeContext = await buildKnowledgeContext(normalizedRequest, ocupacionPrevia)
  // Senal de continuacion, ya declarada en el contrato. Se deriva aqui
  // porque la reserva preventiva necesita saber si el resolutor puede
  // llegar a ejecutarse antes de estimar el coste del turno.
  const esTurnoDeContinuacion = normalizedRequest.retrievalQuery !== normalizedRequest.normalizedIntent

  // RESERVA PREVENTIVA (Bloque 4). Para apartar el coste maximo plausible
  // antes de ejecutar hay que conocer el tamano de lo que se va a enviar, y
  // eso exige componer el prompt ANTES de autorizar. `composePrompt` es
  // pura y sincrona -- sin I/O, sin red --, de modo que adelantarla no
  // cuesta nada y convierte una estimacion a ciegas en una cota real.
  //
  // Un turno de continuacion no invoca al resolutor (regla ya congelada),
  // asi que solo se aparta su coste cuando efectivamente puede ejecutarse:
  // reservar por una llamada imposible encarece el turno sin motivo.
  const promptEstimado = composePrompt(normalizedRequest, knowledgeContext, conversationHistory)
  const decisionContext = buildDecisionContext(normalizedRequest, professionalContext, knowledgeContext, {
    promptCharacters: promptEstimado.length,
    // Se reenvia la politica del Gateway tal cual, sin leer ni copiar
    // ninguna cifra: el Orquestador sabe QUE operaciones puede haber, nunca
    // cuanto puede generar cada una.
    maxOutputTokensByOperation: MAX_OUTPUT_TOKENS_BY_OPERATION,
    resolverPromptCharacters: esTurnoDeContinuacion ? null : buildResolverPrompt(originalRequest).length,
    creditValue: CREDIT_VALUE,
  })
  const authorizationContext = await buildAuthorizationContext(professionalContext, decisionContext)

  // Segunda pasada de interpretacion: Domain Vocabulary asistido, la
  // responsabilidad que el ADR SCENAIA-002C.1 ya define ("resuelve
  // sinonimos, unifica conceptos"; nunca "construir criterios"). El
  // proveedor traduce las palabras del usuario a terminos que los motores
  // deterministas ya conocen; los umbrales numericos los sigue aplicando
  // `interpretRules` con los valores ratificados en SCENAIA-002C.
  //
  // Quien decide si hay algo que traducir es el propio resolutor
  // (`mayNeedResolution`): si en la peticion no queda contenido que los
  // motores no consuman ya, declina sin consultar al proveedor y no se gasta
  // ninguna llamada. El Orquestador solo aporta las dos condiciones que le
  // corresponden -- que la IA sea necesaria y que este autorizada.
  //
  // Ocurre SIEMPRE despues de Credit Manager y solo con autorizacion
  // concedida: ninguna ejecucion de proveedor precede a la autorizacion.
  // Toda ejecucion pasa por AI Gateway y produce su ExecutionAudit.
  // En un turno de continuacion ("¿y alguna mas corta?") la continuidad
  // contextual ya ha resuelto el dominio y arrastra los criterios previos:
  // anadir ahi terminos convertiria el turno en enunciado nuevo y le haria
  // PERDER el hilo. El resolutor solo interviene en turnos que se
  // interpretan por si solos. `retrievalQuery !== normalizedIntent` es
  // exactamente la señal de continuacion, ya declarada en el contrato.

  let resolvedTerms: readonly string[] = []

  if (
    decisionContext.needsAI &&
    authorizationContext.authorizationStatus === 'AUTHORIZED' &&
    !esTurnoDeContinuacion
  ) {
    resolvedTerms = await resolveVocabulary(originalRequest, async (prompt) => {
      const { result, audit } = await executeAIRequest({
        decisionContext,
        authorizationContext,
        normalizedAIRequest: { userPrompt: prompt, operationKind: 'RESOLVER' },
      })
      await distributeExecutionAudit(professionalContext.identity.userId, audit, {
        requestId: normalizedRequest.requestId,
        stage: 'resolver',
      })
      return result.generatedContent
    })

    if (resolvedTerms.length > 0) {
      // El texto original nunca se altera: los terminos resueltos se anaden
      // para que los motores deterministas de siempre los interpreten con
      // sus umbrales ya ratificados. La IA no ha producido ningun criterio.
      //
      // La composicion la hace `composeAugmentedRequest`, no una
      // concatenacion directa: es quien introduce los criterios con la
      // preposicion que la gramatica de `detectKnowledgeDomains` lee como
      // subordinacion, y quien descarta un criterio suelto sin dominio.
      // Concatenar a secas hacia que "busco algo para hacer entre pocos"
      // (resuelto a "pocos actores") activara el dominio Personas --
      // exactamente el falso positivo que esa funcion existe para evitar.
      normalizedRequest = normalizeRequest(
        composeAugmentedRequest(originalRequest, resolvedTerms),
        previousUserRequests
      )
      knowledgeContext = await buildKnowledgeContext(normalizedRequest, ocupacionPrevia)
    }
  }

  const normalizedAIRequest: NormalizedAIRequest = {
    userPrompt: composePrompt(normalizedRequest, knowledgeContext, conversationHistory),
    operationKind: 'TEXT_STANDARD',
  }
  // Lo que la reserva aparto: es el importe con el que se liquida mientras
  // el coste real del proveedor no pueda calcularse.
  const reservedCost = authorizationContext.estimatedCost ?? 0

  const { result, audit } = await executeAIRequest({ decisionContext, authorizationContext, normalizedAIRequest })
  const directContent = buildDirectContent(knowledgeContext)
  const responseContext = composeResponse(decisionContext, authorizationContext, result, directContent)

  // Cierre del circuito economico. La reserva creada al autorizar no puede
  // quedarse abierta: se liquida si hubo ejecucion real de proveedor, y se
  // libera si no llego a producirse. Sin este paso, toda reserva quedaba
  // 'active' hasta expirar -- 75 reservas reales, ninguna cerrada.
  //
  // Se hace aqui, y no como consumidor del enrutador de ExecutionAudit,
  // porque cerrar una reserva exige saber CUAL cerrar: el identificador
  // vive en AuthorizationContext y el contrato de ExecutionAuditConsumer
  // transporta el audit, no datos economicos. Ensancharlo para llevarlos
  // mezclaria observabilidad con contabilidad. El Orquestador ya es quien
  // dispone de ambas piezas, igual que ocurre con recordActivity.
  //
  // La doble liquidacion la impide la propia operacion atomica
  // (`WHERE status = 'active'`), no una comprobacion de este componente.
  // Nunca interrumpe una respuesta ya construida.
  let anomaliaDeLiquidacion: SettlementAnomaly | null = null

  if (authorizationContext.reservationId !== null) {
    try {
      if (result.executionStatus === 'EJECUTADO') {
        const costeLiquidado = resolveSettlementCost(audit, reservedCost)
        await settleReservation(authorizationContext.reservationId, costeLiquidado)

        // El coste real NUNCA se capa: si supera lo reservado, lo que hay
        // que corregir es la estimacion, no el importe. Capar convertiria
        // un problema de presupuesto en contabilidad falsa, y destruiria la
        // unica evidencia de que la estimacion se quedo corta.
        anomaliaDeLiquidacion =
          costeLiquidado > reservedCost
            ? {
                reservationId: authorizationContext.reservationId,
                reservedCredits: reservedCost,
                settledCredits: costeLiquidado,
                providerIdentifier: audit.providerIdentifier,
                providerModel: audit.providerModel,
              }
            : null
      } else {
        await releaseReservation(authorizationContext.reservationId)
      }
    } catch {
      // Una reserva ya cerrada, o cualquier fallo del cierre, no puede
      // alterar la respuesta que el usuario ya tiene.
    }
  }

  await recordActivity({
    profileId: professionalContext.identity.userId,
    responseType: responseContext.responseType,
  })
  await distributeExecutionAudit(professionalContext.identity.userId, audit, {
    requestId: normalizedRequest.requestId,
    stage: 'response',
  })

  // Fase 0 -- lo que ScenaIA entendio y recupero en este turno. Paso de
  // observacion, como los dos anteriores: se ejecuta con la respuesta ya
  // construida y su resultado no la altera. El Orquestador es el unico
  // punto con visibilidad completa del turno, y se limita a leer valores
  // que ya tenia en su ambito local -- ningun componente del Nucleo pasa a
  // conocer la observabilidad.
  //
  // El paso completo -- incluida la LECTURA de los datos que observa -- va
  // protegido: `recordTurnMetrics` ya nunca lanza, pero componer su entrada
  // si podria hacerlo si algun contexto llegara incompleto. La propiedad
  // "un fallo de observabilidad jamas altera una respuesta ya construida"
  // debe sostenerse por construccion, no por confiar en la forma del dato.
  try {
    const entidades = knowledgeContext.knowledgeEntities?.length ?? 0
    const dominiosCubiertos = knowledgeContext.knowledgeDomains?.length ?? 0

    await recordTurnMetrics(professionalContext.identity.userId, {
      requestId: normalizedRequest.requestId,
      domains: normalizedRequest.requestedKnowledgeDomains ?? [],
      isContinuation: esTurnoDeContinuacion,
      resolvedTerms,
      retrievedEntityCount: entidades,
      coveredDomainCount: dominiosCubiertos,
      knowledgeConfidence: knowledgeContext.knowledgeConfidence ?? 0,
      isEmptyResult: dominiosCubiertos > 0 && entidades === 0,
      responseType: responseContext.responseType,
      durationMs: Date.now() - turnStartedAt,
      settlementAnomaly: anomaliaDeLiquidacion,
    })
  } catch {
    // Observar nunca puede impedir responder.
  }

  // Estado que queda vigente para el turno siguiente. `stateVersion` y
  // `updatedAt` los fija aqui el servidor: los valores que hubiera enviado
  // el cliente no se leen en ningun momento.
  const conversationState = nextConversationState(estadoPrevio, {
    activeDomain: normalizedRequest.requestedKnowledgeDomains[0] ?? null,
    workOccupancy: knowledgeContext.workOccupancy ?? {},
    // La version es el indice de turno, derivado del historial que el
    // cliente ya envia. No se acepta la version entrante: se RECONSTRUYE,
    // que es lo unico que puede hacerse sin autoridad en servidor.
    previousVersion: previousUserRequests.length,
    occurredAt: new Date().toISOString(),
  })

  return { responseContext, conversationState }
}
