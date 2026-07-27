import type { ProviderAdapter } from './provider-adapter'
import { openaiAdapter } from './openai-adapter'

/**
 * Registro de adaptadores (Continuidad de la implementacion OpenAI,
 * Aprobacion IA-OPENAI-002). Anadir un proveedor nuevo significa registrar
 * un adaptador mas aqui -- nunca ampliar una cadena condicional dentro de
 * `execute-ai-request.ts` (Directriz 1).
 */
const REGISTERED_ADAPTERS: readonly ProviderAdapter[] = [openaiAdapter]

export function findProviderAdapter(providerId: string): ProviderAdapter | null {
  return REGISTERED_ADAPTERS.find((adapter) => adapter.providerId === providerId) ?? null
}
