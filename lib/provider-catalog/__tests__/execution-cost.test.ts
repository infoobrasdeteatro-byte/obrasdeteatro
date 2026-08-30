import { describe, it, expect } from 'vitest'
import { calculateExecutionCost, findModelRate } from '../execution-cost'
import { AI_PROVIDER_CATALOG } from '../catalog'
import type { ProviderCatalogEntry } from '../types'

/**
 * Tarifas de PRUEBA. No son precios de ningun proveedor real: son cifras
 * redondas elegidas para que la aritmetica sea comprobable a simple vista.
 * Los precios reales son contenido del catalogo oficial y competencia de
 * Direccion -- aqui no se copian ni se aproximan.
 */
const CATALOGO_DE_PRUEBA: readonly ProviderCatalogEntry[] = [
  {
    id: 'proveedor-a',
    name: 'Proveedor A',
    rates: [
      { model: 'modelo-rapido', inputPricePerMillionTokens: 100, outputPricePerMillionTokens: 400, currency: 'USD', pricingUnit: 'PER_MILLION_TOKENS' as const },
      { model: 'modelo-grande', inputPricePerMillionTokens: 1000, outputPricePerMillionTokens: 4000, currency: 'USD', pricingUnit: 'PER_MILLION_TOKENS' as const },
    ],
  },
  { id: 'proveedor-b', name: 'Proveedor B' },
]

const USO = { providerId: 'proveedor-a', model: 'modelo-rapido', inputTokens: 1_000_000, outputTokens: 1_000_000 }

describe('calculateExecutionCost — coste real a partir de tokens y tarifa', () => {
  it('tarifa entrada y salida por separado: no son el mismo precio', () => {
    const coste = calculateExecutionCost(USO, CATALOGO_DE_PRUEBA)

    // 1M entrada a 100 + 1M salida a 400 = 500
    expect(coste).toEqual({ amount: 500, currency: 'USD' })
  })

  it('el coste escala con el consumo real, no con el numero de peticiones', () => {
    const pequena = calculateExecutionCost({ ...USO, inputTokens: 1_000, outputTokens: 500 }, CATALOGO_DE_PRUEBA)
    const grande = calculateExecutionCost({ ...USO, inputTokens: 100_000, outputTokens: 50_000 }, CATALOGO_DE_PRUEBA)

    // Dos peticiones, una cien veces mas cara que la otra.
    expect(pequena!.amount).toBeCloseTo(0.3, 10)
    expect(grande!.amount).toBeCloseTo(30, 10)
  })

  it('distingue modelos del mismo proveedor: el precio depende del modelo', () => {
    const rapido = calculateExecutionCost(USO, CATALOGO_DE_PRUEBA)
    const grande = calculateExecutionCost({ ...USO, model: 'modelo-grande' }, CATALOGO_DE_PRUEBA)

    expect(grande!.amount).toBe(rapido!.amount * 10)
  })

  it('SIN TARIFA declarada no hay coste: null, jamas cero', () => {
    const sinTarifa = calculateExecutionCost({ ...USO, providerId: 'proveedor-b' }, CATALOGO_DE_PRUEBA)
    const modeloDesconocido = calculateExecutionCost({ ...USO, model: 'modelo-que-no-existe' }, CATALOGO_DE_PRUEBA)

    expect(sinTarifa).toBeNull()
    expect(modeloDesconocido).toBeNull()
    // La diferencia importa: cero seria afirmar que la ejecucion fue gratis.
    expect(sinTarifa).not.toBe(0)
  })

  it('SIN DESGLOSE de tokens tampoco hay coste: repartir el total seria inventarlo', () => {
    expect(calculateExecutionCost({ ...USO, inputTokens: null }, CATALOGO_DE_PRUEBA)).toBeNull()
    expect(calculateExecutionCost({ ...USO, outputTokens: null }, CATALOGO_DE_PRUEBA)).toBeNull()
  })

  it('PRECISION: no redondea, y una division no destruye los decimales', () => {
    const coste = calculateExecutionCost({ ...USO, inputTokens: 1, outputTokens: 0 }, CATALOGO_DE_PRUEBA)

    // 1 token de entrada a 100 por millon = 0.0001 exacto, sin truncar.
    expect(coste!.amount).toBeCloseTo(0.0001, 12)
    expect(coste!.amount).toBeGreaterThan(0)
  })

  it('un consumo de cero tokens cuesta cero, que no es lo mismo que "no determinado"', () => {
    const coste = calculateExecutionCost({ ...USO, inputTokens: 0, outputTokens: 0 }, CATALOGO_DE_PRUEBA)

    expect(coste).toEqual({ amount: 0, currency: 'USD' })
  })

  it('la moneda la declara la tarifa, nunca el codigo', () => {
    const enEuros: readonly ProviderCatalogEntry[] = [
      {
        id: 'proveedor-a',
        name: 'A',
        rates: [{ model: 'modelo-rapido', inputPricePerMillionTokens: 100, outputPricePerMillionTokens: 400, currency: 'EUR', pricingUnit: 'PER_MILLION_TOKENS' as const }],
      },
    ]

    expect(calculateExecutionCost(USO, enEuros)!.currency).toBe('EUR')
  })

  it('es agnostico de proveedor: el mismo calculo sirve para cualquiera', () => {
    const otro: readonly ProviderCatalogEntry[] = [
      {
        id: 'otro-proveedor-futuro',
        name: 'Otro',
        rates: [{ model: 'su-modelo', inputPricePerMillionTokens: 100, outputPricePerMillionTokens: 400, currency: 'USD', pricingUnit: 'PER_MILLION_TOKENS' as const }],
      },
    ]

    const coste = calculateExecutionCost(
      { providerId: 'otro-proveedor-futuro', model: 'su-modelo', inputTokens: 1_000_000, outputTokens: 1_000_000 },
      otro
    )

    expect(coste).toEqual({ amount: 500, currency: 'USD' })
  })

  it('es pura y determinista', () => {
    expect(calculateExecutionCost(USO, CATALOGO_DE_PRUEBA)).toEqual(calculateExecutionCost(USO, CATALOGO_DE_PRUEBA))
  })
})

describe('findModelRate — el catalogo oficial sigue siendo competencia de Direccion', () => {
  it('el catalogo real todavia no declara ninguna tarifa: no se ha inventado ningun precio', () => {
    expect(findModelRate('openai', 'gpt-4o-mini', AI_PROVIDER_CATALOG)).toBeNull()
    expect(AI_PROVIDER_CATALOG.every((entry) => entry.rates === undefined)).toBe(true)
  })

  it('un proveedor ausente del catalogo no tiene tarifa', () => {
    expect(findModelRate('proveedor-inexistente', 'x', CATALOGO_DE_PRUEBA)).toBeNull()
  })
})
