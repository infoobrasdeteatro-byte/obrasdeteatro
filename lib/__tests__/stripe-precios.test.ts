import { describe, it, expect } from 'vitest'
import { PLANES } from '@/lib/plans'
import {
  ahorroAnual, anualDisponible, esPeriodo, esPlanDePago, euros,
  mensualEquivalente, planDePriceId, priceIdDe,
} from '@/lib/stripe-precios'

const ENV_COMPLETO = {
  STRIPE_PRICE_PREMIUM_ID: 'price_pm',
  STRIPE_PRICE_DESTACADO_ID: 'price_dm',
  STRIPE_PRICE_EMPRESAS_ID: 'price_em',
  STRIPE_PRICE_PREMIUM_ANUAL_ID: 'price_pa',
  STRIPE_PRICE_DESTACADO_ANUAL_ID: 'price_da',
  STRIPE_PRICE_EMPRESAS_ANUAL_ID: 'price_ea',
}

describe('lib/stripe-precios', () => {
  it('lee el price de cada plan y periodo', () => {
    expect(priceIdDe('premium', 'mensual', ENV_COMPLETO)).toBe('price_pm')
    expect(priceIdDe('empresas', 'anual', ENV_COMPLETO)).toBe('price_ea')
  })

  it('una variable vacía o con espacios cuenta como no configurada', () => {
    expect(priceIdDe('premium', 'anual', { STRIPE_PRICE_PREMIUM_ANUAL_ID: '  ' })).toBeUndefined()
  })

  it('el pago anual solo está disponible con los tres precios anuales', () => {
    expect(anualDisponible(ENV_COMPLETO)).toBe(true)
    const { STRIPE_PRICE_DESTACADO_ANUAL_ID: _, ...sinUno } = ENV_COMPLETO
    expect(anualDisponible(sinUno)).toBe(false)
    expect(anualDisponible({})).toBe(false)
  })

  it('reconoce el plan y el periodo de cualquier price conocido', () => {
    expect(planDePriceId('price_dm', ENV_COMPLETO)).toEqual({ plan: 'destacado', periodo: 'mensual' })
    expect(planDePriceId('price_pa', ENV_COMPLETO)).toEqual({ plan: 'premium', periodo: 'anual' })
    expect(planDePriceId('price_otro', ENV_COMPLETO)).toBeNull()
    expect(planDePriceId(null, ENV_COMPLETO)).toBeNull()
  })

  it('valida plan y periodo', () => {
    expect(esPlanDePago('premium')).toBe(true)
    expect(esPlanDePago('gratuito')).toBe(false)
    expect(esPeriodo('anual')).toBe(true)
    expect(esPeriodo('semanal')).toBe(false)
  })

  it('los precios anuales son «2 meses gratis» (10 cuotas) y cuadran con el ahorro mostrado', () => {
    const esperado: Record<string, { anual: number; ahorro: number; mes: number }> = {
      premium:   { anual: 29.9,  ahorro: 5.98,  mes: 2.49 },
      destacado: { anual: 69.9,  ahorro: 13.98, mes: 5.83 },
      empresas:  { anual: 149.9, ahorro: 29.98, mes: 12.49 },
    }
    for (const plan of PLANES.filter(p => p.precio > 0)) {
      expect(plan.precioAnual).toBe(esperado[plan.id].anual)
      expect(plan.precioAnual).toBeCloseTo(plan.precio * 10, 2)
      expect(ahorroAnual(plan.precio, plan.precioAnual!)).toBe(esperado[plan.id].ahorro)
      expect(mensualEquivalente(plan.precioAnual!)).toBe(esperado[plan.id].mes)
    }
    expect(PLANES.find(p => p.id === 'gratuito')?.precioAnual).toBeUndefined()
  })

  it('formatea euros con coma decimal', () => {
    expect(euros(29.9)).toBe('29,90 €')
    expect(euros(5.98)).toBe('5,98 €')
  })
})
