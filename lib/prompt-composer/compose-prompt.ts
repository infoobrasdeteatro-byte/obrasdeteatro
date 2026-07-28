import type { NormalizedRequest } from '@/lib/request-interpreter'
import type { KnowledgeContext } from '@/lib/scenaia-knowledge-model'

const SYSTEM_INSTRUCTIONS =
  'Eres el asistente de ScenaIA dentro del ecosistema ObrasDeTeatro. Responde de forma util y concreta a la peticion del usuario. Si se te proporciona una lista de obras u organizaciones reales del ecosistema, basate en ellas; si no se te proporciona ninguna, responde con tu conocimiento general, sin afirmar que procede del ecosistema.'

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
 * Unico punto de entrada del Prompt Composer (SCENAIA-002A, Plan Tecnico
 * aprobado). Funcion pura y determinista: misma entrada, misma salida,
 * siempre -- sin I/O, sin acceso a persistencia, sin variables de entorno,
 * sin conocer proveedor ni modelo. Transforma exclusivamente datos ya calculados por
 * Request Interpreter y ScenaIA Knowledge Model, ambos ya disponibles en
 * el ambito del Orquestador antes de esta llamada.
 *
 * Degradacion elegante (regla explicita del expediente): si no hay ninguna
 * entidad real recuperada para ningun dominio, la seccion de conocimiento
 * se omite por completo -- nunca se rellena con datos inventados.
 */
export function composePrompt(normalizedRequest: NormalizedRequest, knowledgeContext: KnowledgeContext): string {
  const knowledgeSection = formatKnowledgeSection(knowledgeContext)

  const parts = [SYSTEM_INSTRUCTIONS]

  if (knowledgeSection !== null) {
    parts.push(`Conocimiento real disponible del ecosistema:\n${knowledgeSection}`)
  }

  parts.push(`Peticion del usuario: ${normalizedRequest.originalRequest}`)

  return parts.join('\n\n')
}
