import { markActivityProcessed as persistProcessed } from '@/lib/repository-layer'

/**
 * Idempotente: invocarla sobre un registro ya procesado no es un error --
 * la garantia post-condicion ("queda marcada como procesada") ya se
 * cumplia. Misma consideracion que listPendingActivity: puede lanzar ante
 * un fallo real, no protege ninguna ruta critica del Nucleo.
 */
export async function markActivityProcessed(id: string): Promise<void> {
  await persistProcessed(id)
}
