import type { NormalizedRequest } from '@/lib/request-interpreter'
import type { KnowledgeContext } from '@/lib/scenaia-knowledge-model'

/**
 * UX-001A (Sprint aprobado): un turno ya cerrado de la conversacion --
 * `content` es siempre el texto final ya mostrado al usuario (la pregunta
 * tal cual la escribio, o el `responseContent` ya resuelto de ScenaIA).
 * Vive en Prompt Composer porque es su unico consumidor real; el
 * Orquestador y la ruta HTTP solo lo transportan, sin interpretarlo.
 */
export interface ConversationTurn {
  readonly role: 'user' | 'assistant'
  readonly content: string
}

/**
 * Ultima frase anadida en la revision funcional post-cierre de SCENAIA-002
 * (Caso 1): cuando el motor de interpretacion (SCENAIA-002C) no reconoce
 * ningun criterio en la peticion -- p.ej. un autor mencionado que no existe
 * en el catalogo real -- Repository Layer degrada, por diseno, a devolver
 * el catalogo sin filtrar (WorkSearchCriteria vacio nunca se sustituye por
 * una aproximacion, ADR SCENAIA-002C.1). Sin esta frase, esa lista sin
 * filtrar podia presentarse como si respondiera al criterio pedido. La
 * correccion es exclusivamente de instruccion al modelo -- no toca
 * interpretacion, Repository Layer ni ningun contrato.
 */
const SYSTEM_INSTRUCTIONS =
  'Eres el asistente de ScenaIA dentro del ecosistema ObrasDeTeatro. Responde de forma util y concreta a la peticion del usuario. Si se te proporciona una lista de obras u organizaciones reales del ecosistema, basate en ellas; si no se te proporciona ninguna, responde con tu conocimiento general, sin afirmar que procede del ecosistema. Si la peticion del usuario menciona un criterio especifico (por ejemplo, un autor, un genero o una duracion concreta) y la lista proporcionada no contiene ninguna obra que lo cumpla claramente, indicalo explicitamente en tu respuesta -- nunca presentes la lista general como si respondiera a ese criterio sin aclararlo.'

/**
 * Formatea unicamente las etiquetas ya sintetizadas por KnowledgeSummary
 * (titulo/nombre real de cada entidad) -- nunca compone texto nuevo a
 * partir de datos crudos, nunca inventa una etiqueta que no exista ya en
 * knowledgeSummary.entryLabelsByDomain (SCENAIA-002A).
 */
function formatKnowledgeSection(knowledgeContext: KnowledgeContext): string | null {
  const { entryLabelsByDomain } = knowledgeContext.knowledgeSummary
  const lines: string[] = []

  for (const domain of Object.keys(entryLabelsByDomain) as (keyof typeof entryLabelsByDomain)[]) {
    const labels = entryLabelsByDomain[domain]
    if (labels && labels.length > 0) {
      lines.push(`${domain}: ${labels.join(', ')}`)
    }
  }

  return lines.length > 0 ? lines.join('\n') : null
}

/**
 * Formatea el historial ya cerrado de la conversacion (UX-001A) -- cada
 * turno tal cual se muestra al usuario, nunca reinterpretado. Ausencia de
 * historial (array vacio, primera pregunta de la sesion) se trata igual
 * que ausencia de conocimiento: la seccion se omite por completo.
 */
function formatHistory(conversationHistory: readonly ConversationTurn[]): string | null {
  if (conversationHistory.length === 0) return null

  return conversationHistory.map((turn) => `${turn.role === 'user' ? 'Usuario' : 'ScenaIA'}: ${turn.content}`).join('\n')
}

/**
 * Unico punto de entrada del Prompt Composer (SCENAIA-002A, Plan Tecnico
 * aprobado; tercer parametro anadido en UX-001A, Sprint aprobado --
 * reapertura minima, mismo patron ya usado antes en composeResponse()
 * (IA-008) y en el contrato de entrada de AI Gateway (IA de integracion
 * del proveedor, 002). Funcion pura y determinista: misma
 * entrada, misma salida, siempre -- sin I/O, sin acceso a persistencia,
 * sin variables de entorno, sin conocer proveedor ni modelo. Transforma
 * exclusivamente datos ya calculados por Request Interpreter y ScenaIA
 * Knowledge Model, mas el historial ya construido por el cliente y
 * transportado sin interpretar por el Orquestador -- ninguno de los 7
 * componentes del Nucleo conoce ni necesita conocer este historial.
 *
 * Degradacion elegante (regla explicita del expediente, extendida a
 * historial): si no hay ninguna entidad real recuperada para ningun
 * dominio, o no hay historial previo (primera pregunta), la seccion
 * correspondiente se omite por completo -- nunca se rellena con datos
 * inventados.
 */
export function composePrompt(
  normalizedRequest: NormalizedRequest,
  knowledgeContext: KnowledgeContext,
  conversationHistory: readonly ConversationTurn[] = []
): string {
  const knowledgeSection = formatKnowledgeSection(knowledgeContext)
  const historySection = formatHistory(conversationHistory)

  const parts = [SYSTEM_INSTRUCTIONS]

  if (knowledgeSection !== null) {
    parts.push(`Conocimiento real disponible del ecosistema:\n${knowledgeSection}`)
  }

  if (historySection !== null) {
    parts.push(`Historial de la conversacion (turnos anteriores, para mantener continuidad):\n${historySection}`)
  }

  parts.push(`Peticion del usuario: ${normalizedRequest.originalRequest}`)

  return parts.join('\n\n')
}
