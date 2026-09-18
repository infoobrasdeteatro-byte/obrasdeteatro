/**
 * UX-002 — QUE SE LE DICE AL USUARIO SOBRE LO QUE ACABA DE PASAR.
 *
 * El Nucleo ya distingue con precision entre "has agotado tu cuota de IA",
 * "no he podido determinar tu plan", "la respuesta quedo cortada" y "algo
 * fallo". Esas cuatro cosas llegaban al cliente y se mostraban igual: una
 * frase generica indistinguible de una averia. Tres bloques cerrados --
 * el 5 creo `denialCode`, el 5C creo `RESPONSE_PARTIAL` -- producian
 * señales que nadie leia.
 *
 * Esta funcion NO decide nada de negocio: traduce a lenguaje del usuario
 * un estado que el backend ya clasifico. No calcula creditos, no consulta
 * planes, no detecta truncamiento, no reintenta. Si el contrato no trae
 * una señal, aqui no se inventa.
 *
 * Es pura y sincrona a proposito: el entorno de pruebas es Node sin DOM,
 * de modo que separar la DECISION de su PINTADO es lo unico que permite
 * cubrir los seis casos con pruebas reales sin tocar la infraestructura.
 */

/** Lo que la ruta devuelve, en la forma en que el cliente lo recibe. */
export interface ScenaiaTurnResponse {
  readonly responseType?: string
  readonly responseContent?: string | null
  readonly responseMetadata?: Record<string, string>
  readonly responseWarnings?: string[]
}

/**
 * Naturaleza del aviso. Separa lo ECONOMICO -- el usuario no ha hecho nada
 * mal y puede actuar -- de lo INCOMPLETO y de lo AVERIADO, porque exigen
 * reacciones distintas: revisar el plan, volver a preguntar con menos
 * alcance, o reintentar.
 */
export type TurnNoticeKind = 'cuota' | 'incompleta' | 'error'

export interface TurnNotice {
  readonly kind: TurnNoticeKind
  readonly text: string
}

/**
 * Textos autorizados por Direccion. Se declaran juntos para que cambiarlos
 * sea una sola decision y no una busqueda por el codigo.
 */
const TEXTOS = {
  insufficient_ai_credits: 'Has alcanzado tu cuota de IA disponible.',
  plan_quota_unknown: 'No hemos podido determinar tu plan de IA en este momento. Inténtalo de nuevo.',
  estimated_cost_unknown: 'No hemos podido calcular el coste de esta solicitud en este momento. Inténtalo de nuevo.',
  incompleta: 'Esta respuesta ha quedado incompleta.',
  error: 'No ha sido posible completar esta solicitud. Inténtalo de nuevo.',
} as const

/**
 * Mensaje de error generico, compartido con la frontera HTTP (P1-A).
 *
 * Se exporta -- en vez de repetir el literal en la ruta -- para que exista
 * UN solo texto: un error interno debe verse igual lo haya clasificado el
 * Nucleo dentro del turno o haya roto la peticion entera. Dos copias
 * acabarian divergiendo y el usuario veria dos averias distintas donde solo
 * hay una.
 */
export const TEXTO_ERROR_GENERICO = TEXTOS.error

/**
 * P1-B — LA UNICA NAVEGACION AUTORIZADA.
 *
 * El endpoint ya enviaba la causa (`reason`, contrato P1.3) y el cliente la
 * descartaba entera. P1-B corrige ESA perdida, y nada mas.
 *
 * SOLO `no_verificado` navega, porque UX-003 construyo expresamente una
 * pantalla para ese caso y dejarlo en un aviso generico era precisamente el
 * defecto. Los demas motivos conservan EXACTAMENTE lo que hacian antes de
 * P1-ERRORES: el aviso, sin moverse de la conversacion.
 *
 * No es una tabla de destinos por una razon: una tabla invita a rellenarla,
 * y cada fila nueva seria una navegacion que nadie autorizo. Con una sola
 * condicion, anadir un destino es una decision visible en la revision, no un
 * renglon mas.
 *
 * NO DECIDE NADA. No comprueba verificacion, ni plan, ni cuota, ni consulta
 * ninguna fuente: el veredicto ya lo emitio el servidor y aqui solo se
 * reconoce uno de sus valores.
 */
const DESTINO_DE_VERIFICACION = '/verificacion'

export function resolveAccessDestination(reason: unknown): string | null {
  return reason === 'no_verificado' ? DESTINO_DE_VERIFICACION : null
}

/** Causas de denegacion que el contrato declara hoy (Bloque 5). */
const CAUSAS_DE_DENEGACION: Record<string, { kind: TurnNoticeKind; text: string }> = {
  insufficient_ai_credits: { kind: 'cuota', text: TEXTOS.insufficient_ai_credits },
  plan_quota_unknown: { kind: 'error', text: TEXTOS.plan_quota_unknown },
  estimated_cost_unknown: { kind: 'error', text: TEXTOS.estimated_cost_unknown },
}

/**
 * Aviso que acompaña al turno, o `null` si no hay nada que advertir.
 *
 * PRECEDENCIA -- se deriva del contrato, no se inventa. En
 * `composeResponse` la rama de denegacion RETORNA antes de llegar a la de
 * ejecucion, de modo que `denialCode` y `RESPONSE_PARTIAL` no pueden
 * coexistir: no hay ninguna combinacion contradictoria que resolver.
 *
 *   1. `denialCode` presente -> aviso economico. Puede venir junto a
 *      contenido real (`RESPONSE_DIRECT`): el conocimiento ya recuperado
 *      se entrega igual, y el aviso explica por que no intervino la IA.
 *   2. `RESPONSE_PARTIAL`    -> la respuesta llego, pero cortada.
 *   3. `RESPONSE_ERROR`      -> no hubo respuesta.
 *   4. resto                 -> sin aviso.
 *
 * Un `denialCode` desconocido -- si algun dia se añadiera uno al backend --
 * cae al aviso de error generico en vez de mostrarse crudo: preferimos un
 * mensaje impreciso a filtrar vocabulario interno.
 */
export function resolveTurnNotice(response: ScenaiaTurnResponse): TurnNotice | null {
  const denialCode = response.responseMetadata?.denialCode

  if (typeof denialCode === 'string' && denialCode.length > 0) {
    return CAUSAS_DE_DENEGACION[denialCode] ?? { kind: 'error', text: TEXTOS.error }
  }

  if (response.responseType === 'RESPONSE_PARTIAL') {
    return { kind: 'incompleta', text: TEXTOS.incompleta }
  }

  if (response.responseType === 'RESPONSE_ERROR') {
    return { kind: 'error', text: TEXTOS.error }
  }

  return null
}
