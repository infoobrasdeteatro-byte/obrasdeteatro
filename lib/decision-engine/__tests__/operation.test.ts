import { describe, it, expect } from 'vitest'
import { estimateOperation } from '../operation'
import { estimateCost } from '../estimated-cost'
import { AI_PROVIDER_CATALOG } from '@/lib/provider-catalog'
import { CREDIT_VALUE } from '@/lib/accounting-engine'

/**
 * BLOQUE 4 — estimacion por operacion.
 *
 * Ninguna prueba escribe una tarifa ni el valor de X: ambos se leen de su
 * unica fuente. Fijarlos a mano aqui haria que estas pruebas siguieran
 * pasando el dia en que el calculo dejara de usar el catalogo, que es
 * exactamente el fallo que deben detectar.
 */
const TECHO = 1024

describe('estimateOperation — coste maximo plausible', () => {
  it('TEXT_STANDARD: estima entrada desde el prompt real y salida al techo autorizado', () => {
    const estimate = estimateOperation(
      { kind: 'TEXT_STANDARD', promptCharacters: 3000, maxOutputTokens: TECHO },
      'openai',
      CREDIT_VALUE
    )

    expect(estimate.kind).toBe('TEXT_STANDARD')
    expect(estimate.estimatedInputTokens).toBe(1000)
    expect(estimate.estimatedOutputTokens).toBe(TECHO)
  })

  it('RESOLVER: se estima igual, con su propio prompt, mucho mas corto', () => {
    const texto = estimateOperation({ kind: 'TEXT_STANDARD', promptCharacters: 3000, maxOutputTokens: TECHO }, 'openai', CREDIT_VALUE)
    const resolver = estimateOperation({ kind: 'RESOLVER', promptCharacters: 300, maxOutputTokens: TECHO }, 'openai', CREDIT_VALUE)

    expect(resolver.kind).toBe('RESOLVER')
    expect(resolver.estimatedInputTokens).toBeLessThan(texto.estimatedInputTokens)
    expect(resolver.estimatedCredits!).toBeLessThan(texto.estimatedCredits!)
  })

  it('USA EL PROMPT REAL: mas texto, mas coste estimado', () => {
    const corto = estimateOperation({ kind: 'TEXT_STANDARD', promptCharacters: 300, maxOutputTokens: TECHO }, 'openai', CREDIT_VALUE)
    const largo = estimateOperation({ kind: 'TEXT_STANDARD', promptCharacters: 30_000, maxOutputTokens: TECHO }, 'openai', CREDIT_VALUE)

    expect(largo.estimatedProviderCostUsd!).toBeGreaterThan(corto.estimatedProviderCostUsd!)
  })

  it('USA EL TECHO DE SALIDA del Bloque 1: no estima menos proteccion de la necesaria', () => {
    const conTecho = estimateOperation({ kind: 'TEXT_STANDARD', promptCharacters: 3000, maxOutputTokens: TECHO }, 'openai', CREDIT_VALUE)
    const conMenos = estimateOperation({ kind: 'TEXT_STANDARD', promptCharacters: 3000, maxOutputTokens: 128 }, 'openai', CREDIT_VALUE)

    expect(conTecho.estimatedOutputTokens).toBe(TECHO)
    expect(conTecho.estimatedProviderCostUsd!).toBeGreaterThan(conMenos.estimatedProviderCostUsd!)
  })

  it('COTA SUPERIOR: la estimacion de entrada cuenta de mas, nunca de menos', () => {
    // 4 caracteres por token es lo habitual en castellano; se estima a 3.
    const estimate = estimateOperation({ kind: 'TEXT_STANDARD', promptCharacters: 4000, maxOutputTokens: TECHO }, 'openai', CREDIT_VALUE)

    expect(estimate.estimatedInputTokens).toBeGreaterThan(4000 / 4)
  })

  it('COSTE DE ENTRADA y COSTE DE SALIDA se suman: el combinado es la suma de ambos', () => {
    const soloEntrada = estimateOperation({ kind: 'TEXT_STANDARD', promptCharacters: 3000, maxOutputTokens: 0 }, 'openai', CREDIT_VALUE)
    const soloSalida = estimateOperation({ kind: 'TEXT_STANDARD', promptCharacters: 0, maxOutputTokens: TECHO }, 'openai', CREDIT_VALUE)
    const combinado = estimateOperation({ kind: 'TEXT_STANDARD', promptCharacters: 3000, maxOutputTokens: TECHO }, 'openai', CREDIT_VALUE)

    expect(soloEntrada.estimatedProviderCostUsd!).toBeGreaterThan(0)
    expect(soloSalida.estimatedProviderCostUsd!).toBeGreaterThan(0)
    expect(combinado.estimatedProviderCostUsd!).toBeCloseTo(
      soloEntrada.estimatedProviderCostUsd! + soloSalida.estimatedProviderCostUsd!,
      15
    )
  })

  it('TARIFA DEL CATALOGO: sin proveedor no hay coste, y no se inventa cero', () => {
    const sinProveedor = estimateOperation({ kind: 'TEXT_STANDARD', promptCharacters: 3000, maxOutputTokens: TECHO }, null, CREDIT_VALUE)

    expect(sinProveedor.estimatedProviderCostUsd).toBeNull()
    expect(sinProveedor.estimatedCredits).toBeNull()
    // Los tokens si se conocen aunque no haya con que tarificarlos.
    expect(sinProveedor.estimatedInputTokens).toBeGreaterThan(0)
  })

  it('PROVEEDOR DESCONOCIDO: sin tarifa declarada tampoco hay coste', () => {
    const estimate = estimateOperation(
      { kind: 'TEXT_STANDARD', promptCharacters: 3000, maxOutputTokens: TECHO },
      'proveedor-que-no-existe',
      CREDIT_VALUE
    )

    expect(estimate.estimatedProviderCostUsd).toBeNull()
  })

  it('SIN X no hay creditos, aunque si haya coste en dolares', () => {
    const estimate = estimateOperation({ kind: 'TEXT_STANDARD', promptCharacters: 3000, maxOutputTokens: TECHO }, 'openai', null)

    expect(estimate.estimatedProviderCostUsd).not.toBeNull()
    expect(estimate.estimatedCredits).toBeNull()
  })

  it('MONEDAS DISTINTAS: no se convierte, se declara imposible', () => {
    const estimate = estimateOperation(
      { kind: 'TEXT_STANDARD', promptCharacters: 3000, maxOutputTokens: TECHO },
      'openai',
      { amountPerCredit: 0.01, currency: 'EUR' }
    )

    expect(estimate.estimatedCredits).toBeNull()
  })

  it('MAXIMO PLAUSIBLE: con varias tarifas se estima contra la mas cara', () => {
    const catalogo = [
      {
        id: 'multi',
        name: 'Multi',
        rates: [
          { model: 'barato', inputPricePerMillionTokens: 1, outputPricePerMillionTokens: 2, currency: 'USD', pricingUnit: 'PER_MILLION_TOKENS' as const },
          { model: 'caro', inputPricePerMillionTokens: 10, outputPricePerMillionTokens: 20, currency: 'USD', pricingUnit: 'PER_MILLION_TOKENS' as const },
        ],
      },
    ]

    const estimate = estimateOperation(
      { kind: 'TEXT_STANDARD', promptCharacters: 3000, maxOutputTokens: 1000 },
      'multi',
      { amountPerCredit: 0.0003, currency: 'USD' },
      catalogo
    )

    // 1000 x 10 + 1000 x 20 = 30.000 / 1M = 0,03 USD, la tarifa cara.
    expect(estimate.estimatedProviderCostUsd).toBeCloseTo(0.03, 12)
  })

  it('es pura y determinista', () => {
    const entrada = { kind: 'TEXT_STANDARD' as const, promptCharacters: 3000, maxOutputTokens: TECHO }

    expect(estimateOperation(entrada, 'openai', CREDIT_VALUE)).toEqual(estimateOperation(entrada, 'openai', CREDIT_VALUE))
  })

  it('SIN NUMEROS MAGICOS: la tarifa procede del catalogo, no de esta prueba', () => {
    const rate = AI_PROVIDER_CATALOG.find((entry) => entry.id === 'openai')!.rates![0]
    const estimate = estimateOperation({ kind: 'TEXT_STANDARD', promptCharacters: 3, maxOutputTokens: 1 }, 'openai', CREDIT_VALUE)

    expect(estimate.estimatedProviderCostUsd).toBeCloseTo(
      (1 * rate.inputPricePerMillionTokens + 1 * rate.outputPricePerMillionTokens) / 1_000_000,
      18
    )
  })
})

describe('estimateCost — coste maximo del turno', () => {
  const texto = estimateOperation({ kind: 'TEXT_STANDARD', promptCharacters: 3000, maxOutputTokens: TECHO }, 'openai', CREDIT_VALUE)
  const resolver = estimateOperation({ kind: 'RESOLVER', promptCharacters: 300, maxOutputTokens: TECHO }, 'openai', CREDIT_VALUE)

  it('sin IA no hay coste que estimar', () => {
    expect(estimateCost(false, [texto])).toBeNull()
  })

  it('DEJA DE SER 1 FIJO: un turno estimable reserva su coste especifico', () => {
    const coste = estimateCost(true, [texto])!

    expect(coste).not.toBe(1)
    expect(coste).toBeCloseTo(texto.estimatedCredits!, 12)
  })

  it('SUMA LAS OPERACIONES POSIBLES: un turno que puede invocar al resolutor reserva las dos', () => {
    const soloTexto = estimateCost(true, [texto])!
    const conResolver = estimateCost(true, [texto, resolver])!

    // Es el turno que en produccion ejecuto DOS veces al proveedor y se
    // cobro como uno solo.
    expect(conResolver).toBeGreaterThan(soloTexto)
    expect(conResolver).toBeCloseTo(texto.estimatedCredits! + resolver.estimatedCredits!, 12)
  })

  it('SIN ESTIMACIONES cae a la reserva de ultimo recurso, no a cero', () => {
    expect(estimateCost(true, [])).toBe(1)
  })

  it('SI UNA OPERACION NO ES ESTIMABLE, cae entera: sumar las conocidas seria insuficiente', () => {
    const noEstimable = estimateOperation({ kind: 'RESOLVER', promptCharacters: 300, maxOutputTokens: TECHO }, null, CREDIT_VALUE)

    expect(estimateCost(true, [texto, noEstimable])).toBe(1)
  })

  it('nunca devuelve cero: una reserva de cero no es una reserva', () => {
    const vacia = estimateOperation({ kind: 'TEXT_STANDARD', promptCharacters: 0, maxOutputTokens: 0 }, 'openai', CREDIT_VALUE)

    expect(estimateCost(true, [vacia])).toBe(1)
  })

  it('PRECISION: no redondea el resultado a entero', () => {
    const coste = estimateCost(true, [texto])!

    expect(Number.isInteger(coste)).toBe(false)
  })
})
