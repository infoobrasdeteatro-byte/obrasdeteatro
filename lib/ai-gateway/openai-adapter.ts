import OpenAI from 'openai'
import type { ProviderAdapter, ProviderExecutionOutcome } from './provider-adapter'
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

async function execute(prompt: string): Promise<ProviderExecutionOutcome> {
  const model = resolveModel()
  const startedAt = Date.now()

  let completion
  try {
    completion = await getClient().chat.completions.create({
      model,
      messages: [{ role: 'user', content: prompt }],
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
