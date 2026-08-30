import { KNOWLEDGE_DOMAINS, isWorkConcept, isWorkSlot } from '@/lib/knowledge-assets'
import type { KnowledgeDomain, WorkSlotOccupancy } from '@/lib/knowledge-assets'
import type { DomainOccupancy, IncomingConversationState } from './types'

/**
 * Longitud maxima de `conversationId`. No es una medida de seguridad --
 * el identificador no autoriza nada -- sino de higiene: evita que una
 * etiqueta de correlacion arbitrariamente larga acabe en telemetria.
 */
const MAX_CONVERSATION_ID_LENGTH = 64

/** Solo caracteres de identificador: ni espacios, ni control, ni texto libre. */
const CONVERSATION_ID_SHAPE = /^[A-Za-z0-9_-]+$/

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseConversationId(value: unknown): string | null {
  if (typeof value !== 'string') return null
  if (value.length === 0 || value.length > MAX_CONVERSATION_ID_LENGTH) return null
  if (!CONVERSATION_ID_SHAPE.test(value)) return null

  return value
}

function parseActiveDomain(value: unknown): KnowledgeDomain | null | undefined {
  if (value === null) return null
  if (typeof value !== 'string') return undefined

  return (KNOWLEDGE_DOMAINS as readonly string[]).includes(value) ? (value as KnowledgeDomain) : undefined
}

/**
 * Ranuras de Obras. Cada clave debe ser una dimension real y cada valor un
 * concepto canonico real -- ambos comprobados contra el vocabulario que
 * posee Knowledge Assets, nunca contra una copia local.
 *
 * Es aqui donde se materializa la regla de seguridad de la Fase 2: el
 * estado transporta CONCEPTOS, jamas valores resueltos. Un cliente no
 * puede enviar `maxDurationMinutes: 999999` porque no existe ningun campo
 * donde escribirlo; solo puede elegir entre `CORTA` y `LARGA`, que es
 * exactamente lo que podria haber pedido escribiendolo.
 */
function parseWorkSlots(value: unknown): WorkSlotOccupancy | null {
  if (!isRecord(value)) return null

  const slots: Record<string, string> = {}

  for (const [slot, concepto] of Object.entries(value)) {
    if (!isWorkSlot(slot)) return null
    if (!isWorkConcept(concepto)) return null

    slots[slot] = concepto
  }

  return slots as WorkSlotOccupancy
}

function parseOccupancy(value: unknown): readonly DomainOccupancy[] | null {
  if (!Array.isArray(value)) return null

  const ocupaciones: DomainOccupancy[] = []
  const dominiosVistos = new Set<string>()

  for (const entrada of value) {
    if (!isRecord(entrada)) return null
    if (entrada.domain !== 'Obras') return null
    // Un dominio repetido no tiene lectura unica: cual de las dos
    // ocupaciones esta vigente seria una convencion implicita.
    if (dominiosVistos.has(entrada.domain)) return null

    const slots = parseWorkSlots(entrada.slots)
    if (slots === null) return null

    dominiosVistos.add(entrada.domain)
    ocupaciones.push({ domain: 'Obras', slots })
  }

  return ocupaciones
}

/**
 * Valida un estado recibido del cliente. **Validacion total o descarte
 * total**: si cualquier parte no cumple el contrato se devuelve `null` y
 * el turno continua exactamente como lo haria hoy sin estado. Nunca se
 * repara ni se acepta a medias -- un estado parcialmente corrupto es un
 * estado en el que no se puede confiar, y un criterio fantasma es peor
 * que ningun criterio.
 *
 * Nunca lanza: mismo criterio defensivo que `parseHistory` ya aplica en la
 * ruta HTTP sobre el historial conversacional.
 *
 * `unknown` en la ENTRADA de un validador no es un contenedor opaco: es
 * lo contrario, el punto donde un dato sin forma conocida adquiere una
 * forma verificada. Lo que PRD-001 proscribe es un contrato que transporte
 * estructuras genericas; aqui ninguna sale de esta funcion.
 *
 * `stateVersion` y `updatedAt` se ignoran deliberadamente aunque vengan:
 * los fija el servidor.
 */
export function parseConversationState(value: unknown): IncomingConversationState | null {
  if (!isRecord(value)) return null

  const conversationId = parseConversationId(value.conversationId)
  if (conversationId === null) return null

  const activeDomain = parseActiveDomain(value.activeDomain)
  if (activeDomain === undefined) return null

  const occupancyByDomain = parseOccupancy(value.occupancyByDomain)
  if (occupancyByDomain === null) return null

  return { conversationId, activeDomain, occupancyByDomain }
}
