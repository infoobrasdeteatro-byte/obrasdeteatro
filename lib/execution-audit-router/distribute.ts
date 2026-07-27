import { REGISTERED_CONSUMERS } from './registry'
import type { ExecutionAudit } from '@/lib/ai-gateway'

/**
 * Unico punto publico de distribucion de ExecutionAudit (IA-007, Decision
 * de Direccion y Plan Tecnico aprobados 2026-07-22). Desacoplado tanto del
 * productor (AI Gateway, que no lo conoce ni lo importa) como de cada
 * consumidor (cuya logica vive exclusivamente en su propio `deliver()`).
 * Degrada de forma segura: un fallo de un consumidor nunca impide la
 * entrega a los demas ni afecta a la respuesta ya construida (propiedad
 * 12 del mecanismo, ya validada).
 */
export async function distributeExecutionAudit(userId: string, audit: ExecutionAudit): Promise<void> {
  await Promise.allSettled(REGISTERED_CONSUMERS.map((consumer) => consumer.deliver(userId, audit)))
}
