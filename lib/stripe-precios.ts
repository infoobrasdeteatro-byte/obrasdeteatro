import { PLANES } from '@/lib/plans'

/**
 * Precios de Stripe de cada plan de pago, mensual y anual.
 *
 * Los identificadores price_… viven en variables de entorno (nunca en el
 * código). El pago anual solo se ofrece cuando los TRES precios anuales están
 * configurados: así no se puede mostrar un selector que luego falle en un
 * plan concreto.
 */

export type PlanDePago = 'premium' | 'destacado' | 'empresas'
export type Periodo = 'mensual' | 'anual'

export const PLANES_DE_PAGO: readonly PlanDePago[] = ['premium', 'destacado', 'empresas']
export const PERIODOS: readonly Periodo[] = ['mensual', 'anual']

type Entorno = Record<string, string | undefined>

const VARIABLES: Record<PlanDePago, Record<Periodo, string>> = {
  premium:   { mensual: 'STRIPE_PRICE_PREMIUM_ID',   anual: 'STRIPE_PRICE_PREMIUM_ANUAL_ID' },
  destacado: { mensual: 'STRIPE_PRICE_DESTACADO_ID', anual: 'STRIPE_PRICE_DESTACADO_ANUAL_ID' },
  empresas:  { mensual: 'STRIPE_PRICE_EMPRESAS_ID',  anual: 'STRIPE_PRICE_EMPRESAS_ANUAL_ID' },
}

export function esPlanDePago(plan: unknown): plan is PlanDePago {
  return typeof plan === 'string' && (PLANES_DE_PAGO as readonly string[]).includes(plan)
}

export function esPeriodo(periodo: unknown): periodo is Periodo {
  return typeof periodo === 'string' && (PERIODOS as readonly string[]).includes(periodo)
}

/** price_… de Stripe para ese plan y periodo, o undefined si no está configurado. */
export function priceIdDe(plan: PlanDePago, periodo: Periodo, env: Entorno = process.env): string | undefined {
  const valor = env[VARIABLES[plan][periodo]]?.trim()
  return valor ? valor : undefined
}

/** ¿Están configurados los precios anuales de los tres planes? */
export function anualDisponible(env: Entorno = process.env): boolean {
  return PLANES_DE_PAGO.every(plan => !!priceIdDe(plan, 'anual', env))
}

/** Plan y periodo a partir de un price_… de Stripe (webhook). null si no es ninguno conocido. */
export function planDePriceId(
  priceId: string | null | undefined,
  env: Entorno = process.env,
): { plan: PlanDePago; periodo: Periodo } | null {
  if (!priceId) return null
  for (const plan of PLANES_DE_PAGO) {
    for (const periodo of PERIODOS) {
      if (priceIdDe(plan, periodo, env) === priceId) return { plan, periodo }
    }
  }
  return null
}

/** Ahorro del pago anual frente a 12 cuotas mensuales, en euros con 2 decimales. */
export function ahorroAnual(precioMensual: number, precioAnual: number): number {
  return Math.round((precioMensual * 12 - precioAnual) * 100) / 100
}

/** Cuota mensual equivalente del pago anual, redondeada a céntimos. */
export function mensualEquivalente(precioAnual: number): number {
  return Math.round((precioAnual / 12) * 100) / 100
}

/** «29,90 €» */
export function euros(valor: number): string {
  return `${valor.toFixed(2).replace('.', ',')} €`
}

/** Precio anual de un plan según lib/plans.ts (fuente única de los importes). */
export function precioAnualDe(plan: PlanDePago): number | undefined {
  return PLANES.find(p => p.id === plan)?.precioAnual
}
