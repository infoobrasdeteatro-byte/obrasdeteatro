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

/**
 * La llamada se hace en streaming y el texto se REENSAMBLA aqui: quien
 * invoca recibe exactamente lo que recibia antes, una respuesta completa.
 *
 * Lo unico que aporta el streaming en esta version es una medida que sin el
 * no existe: cuanto tarda el proveedor en emitir su primer fragmento. Es el
 * dato que decide si un streaming real compensa, y medirlo con la respuesta
 * completa es imposible -- ese instante no consta en ninguna parte.
 *
 * `include_usage` es obligatorio: sin el, un stream no publica `usage`, y
 * sin `usage` no hay `inputTokens` ni `outputTokens`. La liquidacion los
 * necesita -- sin ellos, `resolveSettlementCost` cobra lo reservado en vez
 * del coste real.
 */
async function execute(request: ProviderExecutionRequest): Promise<ProviderExecutionOutcome> {
  const model = resolveModel()
  const startedAt = Date.now()

  const fragmentos: string[] = []
  let firstTokenLatencyMs: number | null = null
  let finishReason: string | null = null
  let usage: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } | null = null

  try {
    const stream = await getClient().chat.completions.create({
      model,
      messages: [{ role: 'user', content: request.prompt }],
      // Techo de generacion recibido por contrato. Este archivo no elige
      // el valor, no lo amplia y no tiene uno propio por defecto: si
      // alguna vez apareciera aqui una cifra, seria una politica de coste
      // oculta dentro de la integracion de un proveedor concreto.
      max_completion_tokens: request.maxOutputTokens,
      stream: true,
      stream_options: { include_usage: true },
    })

    for await (const chunk of stream) {
      const texto = chunk.choices[0]?.delta?.content
      if (texto) {
        // El PRIMER fragmento con texto, no el primer mensaje del stream:
        // el proveedor abre con un fragmento de rol, sin contenido, y
        // medirlo diria que ya hay respuesta cuando todavia no hay ninguna.
        firstTokenLatencyMs ??= Date.now() - startedAt
        fragmentos.push(texto)
      }
      if (chunk.choices[0]?.finish_reason) finishReason = chunk.choices[0].finish_reason
      if (chunk.usage) usage = chunk.usage
    }
  } catch (error) {
    throw new ProviderAdapterError(
      error instanceof Error ? error.message : 'Error desconocido del proveedor OpenAI'
    )
  }

  return {
    content: fragmentos.join(''),
    model,
    latencyMs: Date.now() - startedAt,
    // Ni cero ni la latencia total cuando no hubo ningun fragmento con
    // texto: no se afirma un instante que no ocurrio.
    firstTokenLatencyMs,
    tokensConsumed: usage?.total_tokens ?? null,
    // El proveedor ya publicaba el desglose; hasta IA-006 se descartaba.
    inputTokens: usage?.prompt_tokens ?? null,
    outputTokens: usage?.completion_tokens ?? null,
    // UNICAMENTE 'length'. 'stop' es un final normal; 'content_filter',
    // 'tool_calls' o cualquier otro valor describen otra cosa, y llamarles
    // truncamiento haria que la metrica midiera una mezcla de causas y
    // dejara de servir para decidir un techo. Ausente o desconocido => no
    // truncado: no se afirma un corte que no consta.
    truncated: finishReason === 'length',
    // LIMITACION DOCUMENTADA: la respuesta de Chat Completions no devuelve
    // `max_completion_tokens`. La API no publica ningun campo equivalente,
    // de modo que la unica fuente veraz disponible es el valor que este
    // adaptador acaba de enviar en ESTA llamada -- que es exactamente el
    // que el proveedor aplico.
    //
    // Se declara aqui y no en el Gateway a proposito: el Gateway
    // reconstruiria el numero releyendo su politica, y entonces la
    // telemetria estaria repitiendo una inferencia en lugar de observar
    // una ejecucion. Lo que se registra es lo que se envio.
    maxOutputTokens: request.maxOutputTokens,
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
