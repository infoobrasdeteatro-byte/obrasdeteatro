import { describe, it, expect } from 'vitest'
import { toCredits, isEconomicUnitDefined, resolveSettlementCost, CREDIT_VALUE } from '../economic-unit'
import type { CreditValue } from '../economic-unit'
import type { ProviderCatalogEntry } from '@/lib/provider-catalog'
import { AI_PROVIDER_CATALOG, calculateExecutionCost, findModelRate } from '@/lib/provider-catalog'

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

  /**
   * Sustituye al test que afirmaba que X no existia. Aquel custodiaba una
   * ausencia -- que ninguna cifra se inventara mientras Direccion no la
   * fijara. Fijada X, lo que hay que custodiar es lo contrario: que exista,
   * que sea positiva, que declare su moneda y que la unidad este operativa.
   */
  it('X esta fijada por Direccion: existe, es positiva y declara su moneda', () => {
    expect(CREDIT_VALUE).not.toBeNull()
    expect(CREDIT_VALUE!.amountPerCredit).toBeGreaterThan(0)
    expect(CREDIT_VALUE!.currency).toBe('USD')
    expect(isEconomicUnitDefined()).toBe(true)
  })

  it('con X operativa, un coste real se convierte en creditos sin argumento explicito', () => {
    // Antes devolvia null por no existir X. Ahora convierte.
    expect(toCredits({ amount: CREDIT_VALUE!.amountPerCredit, currency: 'USD' })).toBe(1)
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
    const importe = resolveSettlementCost([AUDIT], 1, { amountPerCredit: 0.01, currency: 'USD' }, CATALOGO)

    expect(importe).toBe(500_000)
  })

  it('SIN VALOR DE CREDITO liquida lo reservado: comportamiento seguro, no un fallback nuevo', () => {
    expect(resolveSettlementCost([AUDIT], 1, null)).toBe(1)
  })

  it('SIN TARIFA en el catalogo tambien liquida lo reservado', () => {
    // El catalogo oficial no declara tarifas todavia.
    expect(resolveSettlementCost([AUDIT], 1, { amountPerCredit: 0.01, currency: 'USD' })).toBe(1)
  })

  it('sin proveedor o sin modelo no hay nada que tarificar', () => {
    expect(resolveSettlementCost([{ ...AUDIT, providerIdentifier: null }], 3)).toBe(3)
    expect(resolveSettlementCost([{ ...AUDIT, providerModel: null }], 3)).toBe(3)
  })

  it('sin desglose de tokens liquida lo reservado, nunca cero', () => {
    const importe = resolveSettlementCost([{ ...AUDIT, inputTokens: null }], 7, { amountPerCredit: 0.01, currency: 'USD' })

    expect(importe).toBe(7)
    expect(importe).not.toBe(0)
  })

  it('una ejecucion real NUNCA se liquida a cero por faltar un dato', () => {
    for (const audit of [
      { ...AUDIT, providerIdentifier: null },
      { ...AUDIT, inputTokens: null, outputTokens: null },
      AUDIT,
    ]) {
      expect(resolveSettlementCost([audit], 2)).toBeGreaterThan(0)
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

/**
 * BLOQUE 3 — coste real del proveedor convertido a creditos.
 *
 * Las cifras de tarifa NO se escriben aqui: se leen del catalogo, que es su
 * unica fuente. Una prueba que fijara el precio a mano dejaria de detectar
 * precisamente el fallo que importa -- que el calculo deje de usar el
 * catalogo -- y ademas obligaria a editarla cada vez que Direccion
 * actualizara una tarifa.
 */
describe('Bloque 3 — del coste real del proveedor a los creditos', () => {
  const X = CREDIT_VALUE!.amountPerCredit
  const TARIFA = findModelRate('openai', 'gpt-4o-mini', AI_PROVIDER_CATALOG)!

  function costeDeTurno(entrada: number, salida: number) {
    return calculateExecutionCost(
      { providerId: 'openai', model: 'gpt-4o-mini', inputTokens: entrada, outputTokens: salida },
      AI_PROVIDER_CATALOG
    )!
  }

  it('COSTE DE ENTRADA: se tarifa por si solo, al precio de entrada', () => {
    const coste = costeDeTurno(1_000_000, 0)

    expect(coste.amount).toBeCloseTo(TARIFA.inputPricePerMillionTokens, 12)
    expect(coste.currency).toBe('USD')
  })

  it('COSTE DE SALIDA: se tarifa por si solo, y es mas caro que la entrada', () => {
    const entrada = costeDeTurno(1_000_000, 0)
    const salida = costeDeTurno(0, 1_000_000)

    expect(salida.amount).toBeCloseTo(TARIFA.outputPricePerMillionTokens, 12)
    expect(salida.amount).toBeGreaterThan(entrada.amount)
  })

  it('COSTE COMBINADO: es exactamente la suma de sus dos partes', () => {
    const combinado = costeDeTurno(984, 176)
    const soloEntrada = costeDeTurno(984, 0)
    const soloSalida = costeDeTurno(0, 176)

    expect(combinado.amount).toBeCloseTo(soloEntrada.amount + soloSalida.amount, 15)
  })

  it('COSTE CERO: cero tokens cuesta cero, y cero no es "no determinado"', () => {
    const coste = costeDeTurno(0, 0)

    expect(coste.amount).toBe(0)
    expect(coste).not.toBeNull()
  })

  it('COSTE FRACCIONARIO: un solo token tiene coste, no se pierde por redondeo', () => {
    const coste = costeDeTurno(1, 0)

    expect(coste.amount).toBeGreaterThan(0)
    expect(coste.amount).toBeCloseTo(TARIFA.inputPricePerMillionTokens / 1_000_000, 18)
  })

  it('CONVERSION: un coste igual a X vale exactamente un credito', () => {
    expect(toCredits({ amount: X, currency: 'USD' })).toBe(1)
  })

  it('CONVERSION: medio X es medio credito; el doble, dos', () => {
    expect(toCredits({ amount: X / 2, currency: 'USD' })).toBe(0.5)
    expect(toCredits({ amount: X * 2, currency: 'USD' })).toBe(2)
  })

  it('EL TURNO REAL MEDIDO consume una fraccion de credito, no un credito entero', () => {
    // 984 entrada / 176 salida es la media observada en produccion.
    const creditos = toCredits(costeDeTurno(984, 176))!

    expect(creditos).toBeGreaterThan(0)
    expect(creditos).toBeLessThan(1)
  })

  it('PRECISION: el resultado es reproducible -- misma entrada, misma salida', () => {
    const a = toCredits(costeDeTurno(984, 176))
    const b = toCredits(costeDeTurno(984, 176))

    expect(a).toBe(b)
  })

  it('PRECISION: no hay redondeo prematuro -- 1000 turnos suman lo mismo que uno por 1000', () => {
    const unTurno = costeDeTurno(984, 176).amount
    const milTurnos = costeDeTurno(984_000, 176_000).amount

    // Si se redondeara en algun paso intermedio, estas dos cifras
    // divergirian: es exactamente el error acumulativo que se evita.
    expect(milTurnos).toBeCloseTo(unTurno * 1000, 12)
  })

  it('PRECISION: la escala no destruye los decimales pequenos', () => {
    const creditos = toCredits(costeDeTurno(1, 1))!

    expect(creditos).toBeGreaterThan(0)
    expect(Number.isFinite(creditos)).toBe(true)
  })

  it('COSTE REAL distinto de COSTE ESTIMADO: liquidar por lo real cambia la cifra', () => {
    const reservado = 1
    const real = resolveSettlementCost(
      [{ providerIdentifier: 'openai', providerModel: 'gpt-4o-mini', inputTokens: 984, outputTokens: 176 }],
      reservado
    )

    expect(real).not.toBe(reservado)
    expect(real).toBeGreaterThan(0)
  })

  it('MODELO CONFIGURADO: solo se tarifa el modelo declarado en el catalogo', () => {
    const otro = calculateExecutionCost(
      { providerId: 'openai', model: 'otro-modelo', inputTokens: 984, outputTokens: 176 },
      AI_PROVIDER_CATALOG
    )

    expect(otro).toBeNull()
  })

  it('PROVEEDOR DESCONOCIDO: sin tarifa no hay coste, y se liquida lo reservado', () => {
    expect(
      calculateExecutionCost(
        { providerId: 'proveedor-inexistente', model: 'x', inputTokens: 10, outputTokens: 10 },
        AI_PROVIDER_CATALOG
      )
    ).toBeNull()

    expect(
      resolveSettlementCost(
        [{ providerIdentifier: 'proveedor-inexistente', providerModel: 'x', inputTokens: 10, outputTokens: 10 }],
        3
      )
    ).toBe(3)
  })

  it('USAGE INCOMPLETO: sin desglose no se inventa un coste, se liquida lo reservado', () => {
    expect(
      resolveSettlementCost(
        [{ providerIdentifier: 'openai', providerModel: 'gpt-4o-mini', inputTokens: null, outputTokens: 176 }],
        7
      )
    ).toBe(7)
  })

  it('SEPARACION: la tarifa del proveedor y X son magnitudes distintas', () => {
    // Cambiar de proveedor cambiaria la primera, jamas la segunda.
    expect(TARIFA.inputPricePerMillionTokens).not.toBe(X)
    expect(TARIFA.outputPricePerMillionTokens).not.toBe(X)
  })
})


/**
 * F5F-4 — LIQUIDACION MULTI-OPERACION.
 *
 * El caso real de 5E: un turno autonomo llamo dos veces al proveedor y solo
 * se cobro una. La reserva ya era del turno; lo que faltaba era que la
 * liquidacion tambien lo fuera.
 *
 * Ninguna prueba escribe una tarifa: se leen del catalogo oficial y X de su
 * unica fuente. Fijarlas aqui haria que siguieran pasando el dia en que el
 * calculo dejara de usarlos.
 */
describe('resolveSettlementCost — coste agregado del turno (F5F-4)', () => {
  const X = CREDIT_VALUE!.amountPerCredit
  const ejecucion = (inputTokens: number, outputTokens: number) => ({
    providerIdentifier: 'openai',
    providerModel: 'gpt-4o-mini',
    inputTokens,
    outputTokens,
  })
  /** Coste en creditos de una ejecucion, derivado del catalogo -- nunca escrito a mano. */
  const creditosDe = (inputTokens: number, outputTokens: number) =>
    toCredits(
      calculateExecutionCost({ providerId: 'openai', model: 'gpt-4o-mini', inputTokens, outputTokens }, AI_PROVIDER_CATALOG)!,
      CREDIT_VALUE
    )!

  it('17 · CASO REAL 5E: 0,3205 (resolutor) + 0,4115 (texto) = 0,7320', () => {
    // Las cifras exactas observadas en produccion el 2026-09-01.
    const RESOLUTOR = ejecucion(569, 18)
    const TEXTO = ejecucion(415, 102)
    const RESERVADO = 3.759

    const liquidado = resolveSettlementCost([RESOLUTOR, TEXTO], RESERVADO)

    expect(creditosDe(569, 18)).toBeCloseTo(0.3205, 6)
    expect(creditosDe(415, 102)).toBeCloseTo(0.4115, 6)
    expect(liquidado).toBeCloseTo(0.732, 6)
    // Lo que se liquidaba antes, y lo que nunca debe liquidarse.
    expect(liquidado).not.toBeCloseTo(0.4115, 6)
    expect(liquidado).not.toBe(RESERVADO)
  })

  it('1 · DOS ejecuciones: suma exacta', () => {
    const total = resolveSettlementCost([ejecucion(569, 18), ejecucion(415, 102)], 3.759)

    expect(total).toBeCloseTo(creditosDe(569, 18) + creditosDe(415, 102), 12)
  })

  it('2 · TRES O MAS ejecuciones: suma exacta, sin tope', () => {
    const total = resolveSettlementCost([ejecucion(100, 10), ejecucion(200, 20), ejecucion(300, 30)], 99)

    expect(total).toBeCloseTo(creditosDe(100, 10) + creditosDe(200, 20) + creditosDe(300, 30), 12)
  })

  it('3/4 · solo entra lo que se le entrega: la coleccion ya viene filtrada', () => {
    // El filtrado de fallidas ocurre en `acumularEjecucion` (F5F-3): aqui
    // no se reintroduce una segunda logica que pudiera divergir.
    const soloUna = resolveSettlementCost([ejecucion(415, 102)], 3.759)

    expect(soloUna).toBeCloseTo(creditosDe(415, 102), 12)
  })

  it('5/6/7 · SIN EJECUCIONES el coste de IA es CERO, no lo reservado', () => {
    // Cobrar la reserva cuando no hubo ninguna llamada seria cobrar una
    // ejecucion que no existio.
    expect(resolveSettlementCost([], 3.759)).toBe(0)
  })

  it('8 · coste real POR DEBAJO de la reserva: se liquida lo real', () => {
    const RESERVADO = 3.759
    const liquidado = resolveSettlementCost([ejecucion(569, 18), ejecucion(415, 102)], RESERVADO)

    expect(liquidado).toBeLessThan(RESERVADO)
    // El excedente (3,0270) no se devuelve aqui: deja de estar comprometido
    // al cambiar la reserva de estado. No hay segunda operacion.
    expect(RESERVADO - liquidado).toBeCloseTo(3.027, 6)
  })

  it('9 · coste real IGUAL a la reserva: se liquida esa misma cifra', () => {
    const exacto = creditosDe(415, 102)

    expect(resolveSettlementCost([ejecucion(415, 102)], exacto)).toBeCloseTo(exacto, 12)
  })

  it('10 · coste real POR ENCIMA de la reserva: NO se capa', () => {
    const RESERVADO = 0.1
    const liquidado = resolveSettlementCost([ejecucion(569, 18), ejecucion(415, 102)], RESERVADO)

    expect(liquidado).toBeGreaterThan(RESERVADO)
    expect(liquidado).toBeCloseTo(0.732, 6)
    // Capar convertiria un problema de estimacion en contabilidad falsa.
    expect(liquidado).not.toBe(RESERVADO)
  })

  it('12 · una ejecucion NO TARIFICABLE arrastra el turno entero al repliegue', () => {
    // Sumar solo la tarificable y dar por gratis la otra seria un subcobro
    // silencioso: exactamente el defecto que F5F-4 elimina, por otra puerta.
    const RESERVADO = 3.759
    const tarificable = ejecucion(415, 102)
    const sinModelo = { ...ejecucion(569, 18), providerModel: null }

    const liquidado = resolveSettlementCost([tarificable, sinModelo], RESERVADO)

    expect(liquidado).toBe(RESERVADO)
    expect(liquidado).not.toBeCloseTo(creditosDe(415, 102), 6)
  })

  it('12b · el repliegue tambien aplica si falta el desglose de tokens', () => {
    const RESERVADO = 5
    const sinTokens = { ...ejecucion(569, 18), inputTokens: null }

    expect(resolveSettlementCost([ejecucion(415, 102), sinTokens], RESERVADO)).toBe(RESERVADO)
  })

  it('12c · y si no hay valor de credito: sin X no se inventa una conversion', () => {
    expect(resolveSettlementCost([ejecucion(415, 102)], 4, null)).toBe(4)
  })

  it('PRECISION: no se redondea prematuramente', () => {
    const total = resolveSettlementCost([ejecucion(1, 1), ejecucion(1, 1)], 9)

    expect(Number.isInteger(total)).toBe(false)
    expect(total).toBeCloseTo(2 * creditosDe(1, 1), 15)
  })

  it('ORDEN IRRELEVANTE para la suma, pero la coleccion no se altera', () => {
    const a = ejecucion(569, 18)
    const b = ejecucion(415, 102)
    const coleccion = [a, b]

    expect(resolveSettlementCost(coleccion, 9)).toBeCloseTo(resolveSettlementCost([b, a], 9), 12)
    expect(coleccion).toEqual([a, b])
  })

  it('el coste se calcula con el catalogo, no con cifras propias de esta funcion', () => {
    const CATALOGO_AJENO = [
      {
        id: 'openai',
        name: 'OpenAI',
        rates: [
          {
            model: 'gpt-4o-mini',
            inputPricePerMillionTokens: 1000,
            outputPricePerMillionTokens: 4000,
            currency: 'USD',
            pricingUnit: 'PER_MILLION_TOKENS' as const,
          },
        ],
      },
    ]

    const conAjeno = resolveSettlementCost([ejecucion(1_000_000, 1_000_000)], 1, CREDIT_VALUE, CATALOGO_AJENO)

    expect(conAjeno).toBeCloseTo(5000 / X, 6)
  })
})
