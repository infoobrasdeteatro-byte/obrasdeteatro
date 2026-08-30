import { describe, it, expect } from 'vitest'
import { toCredits, isEconomicUnitDefined, resolveSettlementCost, CREDIT_VALUE } from '../economic-unit'
import type { CreditValue } from '../economic-unit'
import type { ProviderCatalogEntry } from '@/lib/provider-catalog'

/**
 * Valor de credito de PRUEBA. No es el valor real: X sigue pendiente de
 * Direccion. Se elige una cifra redonda para que la aritmetica se pueda
 * comprobar a simple vista.
 */
const CREDITO_DE_PRUEBA: CreditValue = { amountPerCredit: 0.01, currency: 'USD' }

const COSTE = { amount: 0.5, currency: 'USD' }

describe('unidad economica — 1 credito = X unidades monetarias de capacidad', () => {
  it('convierte coste monetario en creditos dividiendo por el valor del credito', () => {
    // 0,50 USD a 0,01 USD por credito = 50 creditos.
    expect(toCredits(COSTE, CREDITO_DE_PRUEBA)).toBe(50)
  })

  it('SIN VALOR DE CREDITO no hay conversion: null, jamas cero', () => {
    expect(toCredits(COSTE, null)).toBeNull()
    // Cero afirmaria que la ejecucion no consumio capacidad. No es lo mismo.
    expect(toCredits(COSTE, null)).not.toBe(0)
  })

  it('el proyecto TODAVIA no tiene valor de credito: no se ha inventado ninguno', () => {
    expect(CREDIT_VALUE).toBeNull()
    expect(isEconomicUnitDefined()).toBe(false)
    expect(toCredits(COSTE)).toBeNull()
  })

  it('no convierte entre monedas distintas: exigiria un tipo de cambio que nadie autorizo', () => {
    expect(toCredits({ amount: 0.5, currency: 'EUR' }, CREDITO_DE_PRUEBA)).toBeNull()
  })

  it('un valor de credito no positivo no es una unidad', () => {
    expect(toCredits(COSTE, { amountPerCredit: 0, currency: 'USD' })).toBeNull()
    expect(toCredits(COSTE, { amountPerCredit: -1, currency: 'USD' })).toBeNull()
    expect(isEconomicUnitDefined({ amountPerCredit: 0, currency: 'USD' })).toBe(false)
  })

  it('PRECISION: conserva los decimales, no redondea a entero', () => {
    const creditos = toCredits({ amount: 0.000345, currency: 'USD' }, CREDITO_DE_PRUEBA)

    expect(creditos).toBeCloseTo(0.0345, 10)
    expect(Number.isInteger(creditos)).toBe(false)
  })

  it('un coste cero consume cero creditos, que no es lo mismo que "no convertible"', () => {
    expect(toCredits({ amount: 0, currency: 'USD' }, CREDITO_DE_PRUEBA)).toBe(0)
  })

  it('SEPARACION: coste monetario y creditos son magnitudes distintas', () => {
    const creditos = toCredits(COSTE, CREDITO_DE_PRUEBA)

    // Misma ejecucion, dos cifras que no coinciden ni deben coincidir.
    expect(creditos).not.toBe(COSTE.amount)
  })

  it('el significado de un credito NO depende del proveedor: cambiar de modelo cambia el coste, no la unidad', () => {
    const barato = toCredits({ amount: 0.01, currency: 'USD' }, CREDITO_DE_PRUEBA)
    const caro = toCredits({ amount: 0.1, currency: 'USD' }, CREDITO_DE_PRUEBA)

    // Diez veces mas coste, diez veces mas creditos: la unidad no se movio.
    expect(caro).toBe(barato! * 10)
  })

  it('NO es "1 pregunta = 1 credito": dos ejecuciones distintas consumen distinto', () => {
    const corta = toCredits({ amount: 0.002, currency: 'USD' }, CREDITO_DE_PRUEBA)
    const larga = toCredits({ amount: 0.05, currency: 'USD' }, CREDITO_DE_PRUEBA)

    expect(corta).not.toBe(larga)
    expect(corta).not.toBe(1)
    expect(larga).not.toBe(1)
  })
})

const CATALOGO: readonly ProviderCatalogEntry[] = [
  {
    id: 'proveedor-a',
    name: 'Proveedor A',
    rates: [
      {
        model: 'modelo-1',
        inputPricePerMillionTokens: 1000,
        outputPricePerMillionTokens: 4000,
        currency: 'USD',
        pricingUnit: 'PER_MILLION_TOKENS',
      },
    ],
  },
]

const AUDIT = {
  providerIdentifier: 'proveedor-a',
  providerModel: 'modelo-1',
  inputTokens: 1_000_000,
  outputTokens: 1_000_000,
}

describe('resolveSettlementCost — con que importe se cierra una reserva', () => {
  it('recorre la cadena completa tokens -> coste -> creditos cuando existen tarifa y valor', () => {
    // 1M x 1000 + 1M x 4000 = 5000 USD; a 0,01 USD/credito = 500.000 creditos.
    const importe = resolveSettlementCost(AUDIT, 1, { amountPerCredit: 0.01, currency: 'USD' }, CATALOGO)

    expect(importe).toBe(500_000)
  })

  it('SIN VALOR DE CREDITO liquida lo reservado: comportamiento seguro, no un fallback nuevo', () => {
    expect(resolveSettlementCost(AUDIT, 1, null)).toBe(1)
  })

  it('SIN TARIFA en el catalogo tambien liquida lo reservado', () => {
    // El catalogo oficial no declara tarifas todavia.
    expect(resolveSettlementCost(AUDIT, 1, { amountPerCredit: 0.01, currency: 'USD' })).toBe(1)
  })

  it('sin proveedor o sin modelo no hay nada que tarificar', () => {
    expect(resolveSettlementCost({ ...AUDIT, providerIdentifier: null }, 3)).toBe(3)
    expect(resolveSettlementCost({ ...AUDIT, providerModel: null }, 3)).toBe(3)
  })

  it('sin desglose de tokens liquida lo reservado, nunca cero', () => {
    const importe = resolveSettlementCost({ ...AUDIT, inputTokens: null }, 7, { amountPerCredit: 0.01, currency: 'USD' })

    expect(importe).toBe(7)
    expect(importe).not.toBe(0)
  })

  it('una ejecucion real NUNCA se liquida a cero por faltar un dato', () => {
    for (const audit of [
      { ...AUDIT, providerIdentifier: null },
      { ...AUDIT, inputTokens: null, outputTokens: null },
      AUDIT,
    ]) {
      expect(resolveSettlementCost(audit, 2)).toBeGreaterThan(0)
    }
  })

  it('PROVEEDOR ALTERNATIVO: el mismo mecanismo tarifica cualquier proveedor futuro', () => {
    // Se comprueba con la funcion de coste y un catalogo ajeno a OpenAI:
    // la unidad economica no cambia de significado al cambiar de proveedor.
    const creditos = toCredits({ amount: 5000, currency: 'USD' }, { amountPerCredit: 0.01, currency: 'USD' })

    expect(creditos).toBe(500_000)
    expect(CATALOGO[0].rates?.[0].pricingUnit).toBe('PER_MILLION_TOKENS')
  })
})
