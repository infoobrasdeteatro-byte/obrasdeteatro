import type { BlockStatus } from '@/components/dashboard/BlockCard'
import { TIPOS_PERSONA } from './profesiones'

/** Bloque de Profesiones: solo cuenta para personas, no para organizaciones. */
export const BLOQUE_PROFESIONES = 3

export type BloqueCompletitud = { n: number; status: BlockStatus }

/**
 * Bloques que cuentan para el «perfil completo al X %» de una cuenta: fuera
 * los que aún no existen («próximamente»), los bloqueados por el plan (una
 * cuenta gratuita también puede llegar al 100 %) y Profesiones si no es una
 * persona.
 */
export function bloquesQueCuentan<T extends BloqueCompletitud>(bloques: T[], tipoPerfil: string): T[] {
  const esPersona = (TIPOS_PERSONA as readonly string[]).includes(tipoPerfil)
  return bloques.filter(b =>
    b.status !== 'soon' &&
    b.status !== 'locked' &&
    (esPersona || b.n !== BLOQUE_PROFESIONES),
  )
}

/** Porcentaje completado: completo o verificado suma 1; en progreso, medio. */
export function porcentajeCompleto(bloques: BloqueCompletitud[]): number {
  if (bloques.length === 0) return 0
  const puntos = bloques.reduce((acc, b) => {
    if (b.status === 'complete' || b.status === 'verified') return acc + 1
    if (b.status === 'partial') return acc + 0.5
    return acc
  }, 0)
  return Math.round((puntos / bloques.length) * 100)
}
