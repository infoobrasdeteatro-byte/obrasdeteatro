import OpenAI from 'openai'
import type { ProviderAdapter, ProviderExecutionOutcome, ProviderExecutionRequest } from './provider-adapter'
import { ProviderAdapterError } from './provider-adapter'

const DEFAULT_MODEL = 'gpt-4o-mini'

/**
 * Cliente unico reutilizable del SDK oficial (Directriz 4) -- se crea una
 * sola vez, no por peticion. Lee `OPENAI_API_KEY` del entorno de forma
 * automatica (comportamiento estandar del SDK).
 */
let client: OpenAI | null = null

function getClient(): OpenAI {
  if (client === null) {
    if (!process.env.OPENAI_API_KEY?.trim()) {
      throw new ProviderAdapterError(
        'OPENAI_API_KEY no esta configurada o esta vacia -- no se puede construir el cliente de OpenAI'
      )
    }
    client = new OpenAI()
  }
  return client
}

/**
 * Modelo configurable (Directriz 3): nunca codificado en la logica de
 * ejecucion -- se obtiene de `OPENAI_MODEL`, con un valor por defecto
 * documentado si la variable no esta definida.
 */
function resolveModel(): string {
  return process.env.OPENAI_MODEL?.trim() || DEFAULT_MODEL
}

async function execute(request: ProviderExecutionRequest): Promise<ProviderExecutionOutcome> {
  const model = resolveModel()
  const startedAt = Date.now()

  let completion
  try {
    completion = await getClient().chat.completions.create({
      model,
      messages: [{ role: 'user', content: request.prompt }],
      // Techo de generacion recibido por contrato. Este archivo no elige
      // el valor, no lo amplia y no tiene uno propio por defecto: si
      // alguna vez apareciera aqui una cifra, seria una politica de coste
      // oculta dentro de la integracion de un proveedor concreto.
      max_completion_tokens: request.maxOutputTokens,
    })
  } catch (error) {
    throw new ProviderAdapterError(
      error instanceof Error ? error.message : 'Error desconocido del proveedor OpenAI'
    )
  }

  return {
    content: completion.choices[0]?.message?.content ?? '',
    model,
    latencyMs: Date.now() - startedAt,
    tokensConsumed: completion.usage?.total_tokens ?? null,
    // El proveedor ya publicaba el desglose; hasta IA-006 se descartaba.
    inputTokens: completion.usage?.prompt_tokens ?? null,
    outputTokens: completion.usage?.completion_tokens ?? null,
    // UNICAMENTE 'length'. 'stop' es un final normal; 'content_filter',
    // 'tool_calls' o cualquier otro valor describen otra cosa, y llamarles
    // truncamiento haria que la metrica midiera una mezcla de causas y
    // dejara de servir para decidir un techo. Ausente o desconocido => no
    // truncado: no se afirma un corte que no consta.
    truncated: completion.choices[0]?.finish_reason === 'length',
  }
}

/**
 * Adaptador de OpenAI (IA-OPENAI-001/002). Unico archivo del repositorio
 * que conoce el SDK de OpenAI -- ningun otro modulo lo importa.
 */
export const openaiAdapter: ProviderAdapter = {
  providerId: 'openai',
  execute,
}
