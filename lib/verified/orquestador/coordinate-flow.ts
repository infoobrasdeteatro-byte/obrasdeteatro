import { normalizeRequest } from '@/lib/request-interpreter'
import { buildProfessionalContext } from '@/lib/professional-context-engine'
import type { SessionInput } from '@/lib/professional-context-engine'
import { buildKnowledgeContext } from '@/lib/scenaia-knowledge-model'
import { buildDecisionContext } from '@/lib/decision-engine'
import { buildAuthorizationContext } from '@/lib/credit-manager'
import { settleReservation, releaseReservation, resolveSettlementCost } from '@/lib/accounting-engine'
import { executeAIRequest } from '@/lib/ai-gateway'
import type { NormalizedAIRequest, AIExecutionInput, ExecutionAudit, AIExecutionResult } from '@/lib/ai-gateway'
import { composeResponse } from '@/lib/response-composer'
import { recordActivity } from '@/lib/procesos-asincronos'
import { distributeExecutionAudit } from '@/lib/execution-audit-router'
import { recordTurnMetrics, recordTurnFailure } from '@/lib/verified/observabilidad'
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
/**
 * REGLA DE ADMISION AL ACUMULADOR DEL TURNO (F5F-3).
 *
 * Existe como funcion propia por una razon concreta: el acumulador es
 * local a un turno y no lo consume nadie todavia, de modo que la unica
 * forma de DEMOSTRAR -- y no solo afirmar -- que ningun audit ejecutado se
 * pierde y que ninguno vacio entra, es que la regla sea comprobable por si
 * misma. Lo que corrige F5F-3 no es una linea olvidada: es que "ejecutar" y
 * "quedar registrado" dejen de ser dos actos separados.
 *
 * Solo entra lo EJECUTADO. Un `EMPTY_AUDIT` -- denegado, sin proveedor,
 * error de comunicacion -- es un objeto sin ejecucion detras: existe el
 * audit, no la llamada. Admitirlo haria creer que hubo un coste que nunca
 * se produjo.
 *
 * Muta la coleccion recibida a proposito, en vez de devolver una nueva: el
 * orden de ejecucion es el unico dato que despues no podria reconstruirse,
 * y anadir al final lo preserva sin depender de marcas temporales.
 */
export function acumularEjecucion(
  auditsDelTurno: ExecutionAudit[],
  salida: { readonly result: AIExecutionResult; readonly audit: ExecutionAudit }
): void {
  if (salida.result.executionStatus !== 'EJECUTADO') return

  auditsDelTurno.push(salida.audit)
}

/** Que operacion de cierre correspondia a este turno. */
type OperacionDeCierre = 'settle' | 'release'

/**
 * Lo que de verdad ocurrio al cerrar el circuito economico (P1.2).
 *
 * Existe para separar dos cosas que antes eran indistinguibles: que el
 * cierre SE INTENTARA y que la reserva QUEDARA CERRADA. Cuando la base de
 * datos no responde, lo primero ocurre y lo segundo no, y el sistema debe
 * poder decirlo.
 */
type ResultadoDelCierre =
  | { readonly estado: 'sin_reserva' }
  | { readonly estado: 'liquidada'; readonly creditos: number }
  | { readonly estado: 'liberada' }
  | {
      readonly estado: 'fallo_al_cerrar'
      readonly operacion: OperacionDeCierre
      readonly reservationId: string
      readonly causa: unknown
    }

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

  /**
   * IDENTIDAD DEL TURNO (F5F-1). Se acuña UNA sola vez, aqui, y acompaña
   * al turno entero: las dos interpretaciones, la reserva, las trazas de
   * cada ejecucion y las metricas finales.
   *
   * Nace en el Orquestador porque es el unico componente que ve el turno
   * completo -- el mismo motivo por el que ya le corresponde cerrar la
   * reserva y componer la observacion del turno.
   *
   * No se reutiliza `reservationId`: un turno determinista no crea reserva
   * y tambien necesita identidad. Tampoco `conversationId`, que identifica
   * la conversacion y no el turno.
   */
  const turnId = crypto.randomUUID()
  let normalizedRequest = normalizeRequest(originalRequest, turnId, previousUserRequests, dominioPrevio)
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

  /**
   * EJECUCIONES DEL TURNO (F5F-3).
   *
   * Un turno puede llamar al proveedor mas de una vez -- hoy resolutor y
   * respuesta -- y cada llamada tiene coste propio. Hasta ahora el audit
   * del resolutor moria en el ambito de la funcion que lo producia: se
   * media en telemetria y desaparecia para todo lo demas. En produccion
   * eso dejo 0,3205 creditos reales sin registrar en el cierre del turno.
   *
   * La coleccion es LOCAL al turno: se crea en cada invocacion, no hay
   * estado de modulo, ni singleton, ni nada compartido entre usuarios.
   * Conserva el ORDEN de ejecucion, que es el unico dato que despues no
   * podria reconstruirse -- ordenar por marca temporal seria inferirlo.
   *
   * Guarda el `ExecutionAudit` completo, no una proyeccion reducida:
   * recortarlo aqui descartaria justo lo que F5F-2 acaba de incorporar
   * (`maxOutputTokens`, `truncated`, latencia). Quien liquide tomara lo
   * que necesite; acumular no es el momento de decidir que sobra.
   *
   * F5F-3 SOLO acumula. La liquidacion sigue exactamente como estaba.
   */
  const auditsDelTurno: ExecutionAudit[] = []

  /**
   * Lo que la reserva aparto: es el importe con el que se liquida mientras
   * el coste real del proveedor no pueda calcularse. Se lee aqui, junto a
   * la reserva que lo produjo, para que el cierre no dependa de haber
   * llegado hasta el final del turno.
   */
  const reservedCost = authorizationContext.estimatedCost ?? 0

  let anomaliaDeLiquidacion: SettlementAnomaly | null = null
  let resultadoDelCierre: ResultadoDelCierre | null = null

  /**
   * CIERRE DEL CIRCUITO ECONOMICO (P1.2) -- punto unico y obligatorio.
   *
   * Antes esto era un bloque suelto a mitad del turno. Si algo lanzaba
   * entre la reserva y ese punto -- una consulta de conocimiento, por
   * ejemplo --, la reserva quedaba `active` hasta expirar: con el plan
   * gratuito, una sola excepcion inmovilizaba el 75 % de la cuota durante
   * cinco minutos. El TTL lo resolvia despues; no lo impedia.
   *
   * Ahora hay un solo lugar que cierra, y el `finally` del turno garantiza
   * que se alcanza por los dos caminos. `circuitoEconomicoCerrado` hace que
   * ocurra EXACTAMENTE UNA VEZ: la doble liquidacion ya era imposible en la
   * operacion atomica (`WHERE status = 'active'`), pero depender de que la
   * base de datos rechace lo que no deberiamos ni intentar es apoyarse en
   * la ultima linea de defensa.
   *
   * QUE se hace lo sigue decidiendo F5F-4, sin un solo cambio: si hubo
   * ejecuciones reales se liquida su coste agregado -- el proveedor ya
   * cobro, liberar seria dejar de cobrarlo --; si no hubo ninguna, se
   * libera. Una excepcion no altera esa politica: solo obliga a aplicarla.
   *
   * DEVUELVE LO QUE OCURRIO, no `void`. Es la diferencia entre "se intento
   * cerrar" y "quedo cerrada": sin este resultado, quien llama no puede
   * distinguir una liquidacion de un fallo, y esa indistincion era el
   * defecto de la primera version de este bloque.
   *
   * NO absorbe el fallo en silencio. Lo captura -- relanzarlo aqui
   * sustituiria al error real que pudiera estar propagandose -- pero lo
   * DEJA REGISTRADO y lo devuelve al llamador, que decide si encadenarlo.
   *
   * El resultado se memoriza: una segunda invocacion devuelve lo mismo sin
   * volver a intentar nada. El cierre se intenta EXACTAMENTE UNA VEZ.
   */
  async function cerrarCircuitoEconomico(): Promise<ResultadoDelCierre> {
    if (resultadoDelCierre !== null) return resultadoDelCierre
    if (authorizationContext.reservationId === null) {
      resultadoDelCierre = { estado: 'sin_reserva' }
      return resultadoDelCierre
    }

    const reservationId = authorizationContext.reservationId
    // Que operacion corresponde se decide ANTES de intentarla, para poder
    // decir cual fallo. Un `settle` fallido y un `release` fallido no son
    // el mismo incidente: el primero deja consumo real sin registrar.
    const operacion: OperacionDeCierre = auditsDelTurno.length > 0 ? 'settle' : 'release'

    try {
      // F5F-4 -- lo que decide liquidar o liberar es si HUBO ejecuciones
      // reales en el turno, no como termino la ultima. Un turno cuyo
      // resolutor ejecuto y cuya respuesta fallo tiene coste real, y antes
      // se liberaba entero.
      if (operacion === 'settle') {
        // UN solo settlement por reserva: la coleccion es la fuente del
        // coste agregado, jamas una lista de liquidaciones.
        const costeLiquidado = resolveSettlementCost(auditsDelTurno, reservedCost)
        await settleReservation(reservationId, costeLiquidado)

        // El coste real NUNCA se capa: si supera lo reservado, lo que hay
        // que corregir es la estimacion, no el importe.
        anomaliaDeLiquidacion =
          costeLiquidado > reservedCost
            ? {
                reservationId,
                reservedCredits: reservedCost,
                settledCredits: costeLiquidado,
                providerIdentifier: auditsDelTurno[0].providerIdentifier,
                providerModel: auditsDelTurno[0].providerModel,
              }
            : null

        resultadoDelCierre = { estado: 'liquidada', creditos: costeLiquidado }
      } else {
        await releaseReservation(reservationId)
        resultadoDelCierre = { estado: 'liberada' }
      }
    } catch (causa) {
      /*
       * NUNCA se intenta la otra operacion como alternativa. Liberar
       * despues de un `settle` fallido convertiria una deuda no registrada
       * en una liberacion explicita: borraria justo la evidencia de que
       * hubo consumo real sin cobrar.
       *
       * Tampoco se afirma que la reserva quedara cerrada. Queda `active`
       * hasta expirar, y eso debe constar.
       */
      resultadoDelCierre = { estado: 'fallo_al_cerrar', operacion, reservationId, causa }

      /*
       * El registro ocurre AQUI y no en `recordTurnMetrics` porque en el
       * camino de excepcion las metricas del turno no llegan a ejecutarse:
       * el `finally` cierra y el error sale antes. Un incidente contable
       * que solo se observara cuando el turno va bien no serviria de nada.
       */
      console.error('[P1.2] fallo al cerrar la reserva economica', {
        reservationId,
        operacion,
        // `settle` es el grave: hubo consumo real de proveedor que no ha
        // llegado a registrarse, y el TTL no lo corrige nunca.
        consumoRealSinRegistrar: operacion === 'settle',
        ejecucionesDelTurno: auditsDelTurno.length,
        causa,
      })
    }

    return resultadoDelCierre
  }


  /**
   * PUNTO UNICO de ejecucion de proveedor en todo el turno.
   *
   * No es azucar sintactico: es la garantia estructural de que ninguna
   * ejecucion pueda quedar fuera del acumulador. Mientras este sea el
   * unico sitio del Orquestador que invoca al Gateway -- y hay una
   * invariante que lo comprueba --, "ejecutar" y "quedar registrado" son
   * el mismo acto, y no dependen de que alguien recuerde anadir una
   * linea despues de cada llamada.
   *
   * Solo entra lo EJECUTADO. Un audit vacio -- denegado, sin proveedor,
   * error de comunicacion -- no representa ninguna llamada real: existe
   * el objeto, no la ejecucion.
   */
  async function ejecutarOperacion(input: AIExecutionInput) {
    const salida = await executeAIRequest(input)
    acumularEjecucion(auditsDelTurno, salida)

    return salida
  }

  /**
   * TRAMO PROTEGIDO (P1.2). Desde aqui hasta el final del turno, toda
   * salida -- normal o por excepcion -- pasa por el cierre economico. El
   * `finally` no captura el error: solo garantiza que la reserva no quede
   * abierta antes de que ese error siga su camino hacia arriba.
   */
  try {

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
        const { result, audit } = await ejecutarOperacion({
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
        // Reinterpretar NO abre un turno nuevo: mismo `turnId`. Es el punto
        // exacto donde antes se acuñaba una segunda identidad y la
        // trazabilidad del turno se partia en dos.
        normalizedRequest = normalizeRequest(
          composeAugmentedRequest(originalRequest, resolvedTerms),
          turnId,
          previousUserRequests
        )
        knowledgeContext = await buildKnowledgeContext(normalizedRequest, ocupacionPrevia)
      }
    }

    const normalizedAIRequest: NormalizedAIRequest = {
      userPrompt: composePrompt(normalizedRequest, knowledgeContext, conversationHistory),
      operationKind: 'TEXT_STANDARD',
    }
    const { result, audit } = await ejecutarOperacion({ decisionContext, authorizationContext, normalizedAIRequest })
    const directContent = buildDirectContent(knowledgeContext)
    const responseContext = composeResponse(decisionContext, authorizationContext, result, directContent)

    await cerrarCircuitoEconomico()

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
  } catch (errorDelTurno) {
    /*
     * El turno fallo. Antes de dejar salir el error hay que cerrar la
     * reserva -- si no, queda `active` hasta expirar.
     *
     * Si ademas el cierre falla, se conservan LAS DOS causas. La original
     * manda: es la raiz de lo ocurrido, y sustituirla por un fallo de
     * contabilidad haria imposible diagnosticar el turno.
     */
    const cierre = await cerrarCircuitoEconomico()

    /*
     * P1-C -- rastro propio del turno fallido.
     *
     * ORDEN, y no es indiferente: DESPUES del cierre y ANTES de propagar.
     *
     *   - Despues del cierre porque liquidar o liberar es el unico acto
     *     irreversible que queda pendiente, y no puede esperar a que se
     *     observe nada. Ademas, observado despues, el registro puede decir
     *     COMO quedo la reserva -- que es justo el dato que faltaba para
     *     reconstruir el incidente.
     *   - Antes de propagar porque una vez lanzado el error ya no hay
     *     ningun punto de este flujo que vuelva a ejecutarse.
     *
     * No altera el cierre: no lo invoca, no lo repite y no depende de su
     * resultado mas que para describirlo. Va protegido porque observar
     * jamas puede sustituir al error real que se esta propagando -- misma
     * propiedad que ya rige `recordTurnMetrics` en el camino normal.
     */
    try {
      await recordTurnFailure(professionalContext.identity.userId, {
        turnId,
        error: errorDelTurno,
        executionCount: auditsDelTurno.length,
        reservationId: authorizationContext.reservationId,
        closure: cierre.estado,
      })
    } catch {
      // Observar nunca puede impedir que el error llegue a quien lo espera.
    }

    if (cierre.estado === 'fallo_al_cerrar') {
      throw new AggregateError(
        [errorDelTurno, cierre.causa],
        `el turno fallo y ademas no se pudo ${cierre.operacion === 'settle' ? 'liquidar' : 'liberar'} la reserva ${cierre.reservationId}`
      )
    }

    throw errorDelTurno
  } finally {
    /*
     * Red de seguridad estructural: ninguna salida de la funcion puede
     * evitarla. Por los caminos normal y de excepcion el cierre ya ocurrio
     * y el resultado memorizado hace que esto no intente nada; existe para
     * que una futura salida temprana tampoco pueda dejar la reserva
     * abierta. No captura ni relanza: la excepcion se propaga sola.
     */
    await cerrarCircuitoEconomico()
  }
}
