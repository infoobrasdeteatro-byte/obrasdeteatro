import type { KnowledgeDomain, WorkSlotOccupancy } from '@/lib/knowledge-assets'

/**
 * CONVERSATION STATE — contexto acumulado de una conversacion (Fase 3,
 * Decision Arquitectonica de Direccion: `ConversationState != NormalizedRequest`).
 *
 * Lo que este contrato representa es lo que sigue VIGENTE despues de un
 * turno; lo que representa `NormalizedRequest` es lo que ocurrio EN un
 * turno. Son dos cosas distintas y por eso viven en contratos distintos:
 * mientras el contexto viajaba dentro de la peticion normalizada, el
 * unico modo de conservarlo era reinterpretar texto concatenado, y bastaba
 * con que la palabra que nombraba el dominio saliera de la ventana de tres
 * turnos para que el anclaje desapareciera sin que nada lo advirtiera.
 *
 * NINGUN componente del Nucleo recibe este contrato completo. El
 * Orquestador lo descompone y entrega a cada uno unicamente la pieza que
 * ese componente ya tiene derecho a conocer: al Request Interpreter, un
 * `KnowledgeDomain`; a Knowledge Assets, una ocupacion de ranuras. Ambos
 * son tipos que sus invariantes ya les autorizan.
 */

/**
 * Ocupacion de ranuras de un dominio concreto. Union discriminada, misma
 * forma prescrita por el ADR SCENAIA-002C.1 para `KnowledgeSearchCriteria`
 * y por el mismo motivo: sin campos base compartidos, cada dominio con su
 * propia forma real.
 *
 * Que los criterios vivan DENTRO de su dominio no es una convencion que
 * haya que respetar, es lo que hace imposible expresar la contaminacion
 * cruzada: no existe ningun sitio donde escribir un criterio de Obras que
 * una busqueda de Organizaciones pueda leer.
 *
 * Hoy solo Obras tiene modelo de ranuras (Fase 2). Organizaciones y
 * Personas heredan el DOMINIO pero todavia no sus criterios: anadirlos
 * aqui antes de que exista su modelo seria representar un estado que
 * ningun dominio real respalda (Principio de Madurez de la Abstraccion,
 * ADR SCENAIA-002C.1).
 */
export type DomainOccupancy = { readonly domain: 'Obras'; readonly slots: WorkSlotOccupancy }

/**
 * Lo que un cliente puede aportar. Deliberadamente NO incluye `stateVersion`
 * ni `updatedAt`: esos dos los fija el servidor y aceptarlos de fuera seria
 * concederles una autoridad que no tienen. La frontera de confianza queda
 * asi representada en el propio sistema de tipos, no en un comentario.
 */
export interface IncomingConversationState {
  readonly conversationId: string
  readonly activeDomain: KnowledgeDomain | null
  readonly occupancyByDomain: readonly DomainOccupancy[]
}

/**
 * Estado completo, tal como el servidor lo emite al cerrar un turno.
 *
 * `conversationId` es EXCLUSIVAMENTE una etiqueta de correlacion, util
 * para agrupar turnos en telemetria. No autentica, no autoriza y no
 * identifica: procede del cliente y el servidor no puede verificarlo.
 * Ningun componente debe consultarlo para decidir un acceso.
 *
 * `stateVersion` es versionado LOGICO, no un mecanismo de bloqueo.
 * Mientras el estado no tenga autoridad en servidor, dos peticiones
 * simultaneas que partan de la version N produciran ambas la N+1 y
 * prevalecera la ultima que el cliente procese. Esa carrera esta
 * documentada y aceptada; no esta resuelta.
 */
export interface ConversationState extends IncomingConversationState {
  readonly stateVersion: number
  readonly updatedAt: string
}
