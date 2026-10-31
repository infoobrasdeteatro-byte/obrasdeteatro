import { PLANES } from '@/lib/plans'
import { planDePriceId, type Periodo } from '@/lib/stripe-precios'

/**
 * Origen del plan de un referido para el panel del Elenco:
 * - «pago»: suscripción de Stripe en estado active o trialing (nunca se
 *   deduce de profiles.plan);
 * - «cortesía»: sin pago, con un plan regalado (Embajadores o Elenco);
 * - «gratuito»: ninguna de las dos.
 */
export type Suscripcion = { plan: string; status: string; stripe_price_id: string | null; created_at: string | null }

export type OrigenPlan =
  | { origen: 'pago'; plan: string; periodo: Periodo | null; desde: string | null; mensualEur: number }
  | { origen: 'cortesia'; plan: string }
  | { origen: 'gratuito' }
  | { origen: 'sin_pago_activo'; plan: string }

export const ESTADOS_DE_PAGO = ['active', 'trialing'] as const

/** Ingreso mensual de una suscripción, en euros de tarifa: los anuales, divididos entre 12. */
export function ingresoMensual(plan: string, periodo: Periodo | null): number {
  const p = PLANES.find(x => x.id === plan)
  if (!p) return 0
  if (periodo === 'anual' && p.precioAnual) return Math.round((p.precioAnual / 12) * 100) / 100
  return p.precio
}

/**
 * `cortesia`: plan de una membresía regalada vigente (Embajadores o Elenco),
 * o null. Un plan de pago sin suscripción activa (p. ej. en mora) no cuenta
 * como pago ni como cortesía.
 */
export function origenPlan(
  perfilPlan: string,
  sub: Suscripcion | null | undefined,
  cortesia: string | null,
  env: Record<string, string | undefined> = process.env,
): OrigenPlan {
  if (sub && (ESTADOS_DE_PAGO as readonly string[]).includes(sub.status)) {
    const periodo = planDePriceId(sub.stripe_price_id, env)?.periodo ?? null
    return { origen: 'pago', plan: sub.plan, periodo, desde: sub.created_at, mensualEur: ingresoMensual(sub.plan, periodo) }
  }
  if (cortesia) return { origen: 'cortesia', plan: perfilPlan !== 'gratuito' ? perfilPlan : cortesia }
  if (perfilPlan && perfilPlan !== 'gratuito') return { origen: 'sin_pago_activo', plan: perfilPlan }
  return { origen: 'gratuito' }
}

export function etiquetaOrigen(o: OrigenPlan): string {
  if (o.origen === 'pago') return `Pago · ${o.plan}${o.periodo ? ` ${o.periodo}` : ''}`
  if (o.origen === 'cortesia') return `Cortesía · ${o.plan}`
  if (o.origen === 'sin_pago_activo') return `${o.plan} sin pago activo`
  return 'Gratuito'
}

/** Una fila CSV (separador «;», comillas cuando hace falta). */
export function filaCsv(valores: (string | number | null | undefined)[]): string {
  return valores.map(v => {
    const t = v === null || v === undefined ? '' : String(v)
    return /[";\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t
  }).join(';')
}
