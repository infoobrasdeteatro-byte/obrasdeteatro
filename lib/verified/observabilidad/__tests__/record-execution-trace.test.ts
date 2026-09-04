import { describe, it, expect, vi, beforeEach } from 'vitest'
import { recordMetric } from '@/lib/telemetria'
import { recordExecutionTrace } from '../record-execution-trace'
import type { ExecutionAudit } from '../types'

vi.mock('@/lib/telemetria', () => ({
  recordMetric: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(recordMetric).mockReset()
})

const EMPTY_AUDIT: ExecutionAudit = {
  providerIdentifier: null,
  providerModel: null,
  executionLatencyMs: null,
  tokensConsumed: null,
  inputTokens: null,
  outputTokens: null,
  realExecutionCost: null,
  truncated: null, maxOutputTokens: null, technicalMetadata: null,
}

describe('recordExecutionTrace', () => {
  it('traduce los tres campos numéricos a metricas de Telemetria, con providerIdentifier/providerModel como tags', async () => {
    vi.mocked(recordMetric).mockResolvedValue(true)

    const audit: ExecutionAudit = {
      providerIdentifier: 'anthropic',
      providerModel: 'claude-sonnet-5',
      executionLatencyMs: 340,
      tokensConsumed: 1200,
      inputTokens: 900,
      outputTokens: 300,
      realExecutionCost: 0.05,
      truncated: null, maxOutputTokens: null, technicalMetadata: 'algo sin destino autorizado',
    }

    const result = await recordExecutionTrace('profile-1', audit)

    expect(recordMetric).toHaveBeenCalledWith('profile-1', {
      name: 'ai_gateway.execution_latency_ms',
      value: 340,
      unit: 'ms',
      tags: { providerIdentifier: 'anthropic', providerModel: 'claude-sonnet-5' },
    })
    expect(recordMetric).toHaveBeenCalledWith('profile-1', {
      name: 'ai_gateway.tokens_consumed',
      value: 1200,
      unit: 'tokens',
      tags: { providerIdentifier: 'anthropic', providerModel: 'claude-sonnet-5' },
    })
    expect(recordMetric).toHaveBeenCalledWith('profile-1', {
      name: 'ai_gateway.real_execution_cost',
      value: 0.05,
      unit: 'currency',
      tags: { providerIdentifier: 'anthropic', providerModel: 'claude-sonnet-5' },
    })
    // IA-006 anadio el desglose de tokens: cinco metricas donde antes habia
    // tres. El titulo de este test conserva "los tres campos numericos"
    // porque sigue verificando exactamente esos tres; los otros dos son
    // input/output tokens, cubiertos en su propio test.
    expect(recordMetric).toHaveBeenCalledTimes(5)
    expect(result).toBe(true)
  })

  it('no traduce technicalMetadata (sin destino arquitectónico autorizado)', async () => {
    vi.mocked(recordMetric).mockResolvedValue(true)

    await recordExecutionTrace('profile-1', {
      ...EMPTY_AUDIT,
      executionLatencyMs: 100,
      truncated: null, maxOutputTokens: null, technicalMetadata: 'texto libre',
    })

    for (const call of vi.mocked(recordMetric).mock.calls) {
      expect(call[1].name).not.toMatch(/technicalMetadata/i)
      expect(JSON.stringify(call[1])).not.toContain('texto libre')
    }
  })

  it('no registra nada y devuelve true cuando el audit está completamente vacío', async () => {
    const result = await recordExecutionTrace('profile-1', EMPTY_AUDIT)

    expect(recordMetric).not.toHaveBeenCalled()
    expect(result).toBe(true)
  })

  it('devuelve false si alguna escritura de Telemetría falla', async () => {
    vi.mocked(recordMetric).mockResolvedValueOnce(true).mockResolvedValueOnce(false)

    const result = await recordExecutionTrace('profile-1', {
      ...EMPTY_AUDIT,
      executionLatencyMs: 100,
      tokensConsumed: 50,
    })

    expect(result).toBe(false)
  })
})

describe('recordExecutionTrace — contexto de ejecucion (Fase 0)', () => {
  it('sin contexto se comporta exactamente como antes', async () => {
    vi.mocked(recordMetric).mockReset().mockResolvedValue(true)

    await recordExecutionTrace('profile-1', { ...EMPTY_AUDIT, executionLatencyMs: 120 })

    const [, metrica] = vi.mocked(recordMetric).mock.calls[0]
    expect(metrica.tags?.requestId).toBeUndefined()
    expect(metrica.tags?.stage).toBeUndefined()
  })

  it('con contexto, correlaciona el turno y distingue la etapa', async () => {
    vi.mocked(recordMetric).mockReset().mockResolvedValue(true)

    await recordExecutionTrace(
      'profile-1',
      { ...EMPTY_AUDIT, executionLatencyMs: 120, tokensConsumed: 50 },
      { requestId: 'req-1', stage: 'resolver' }
    )

    for (const [, metrica] of vi.mocked(recordMetric).mock.calls) {
      expect(metrica.tags?.requestId).toBe('req-1')
      expect(metrica.tags?.stage).toBe('resolver')
    }
  })

  it('las dos etapas de un mismo turno quedan separadas', async () => {
    vi.mocked(recordMetric).mockReset().mockResolvedValue(true)

    await recordExecutionTrace('p', { ...EMPTY_AUDIT, executionLatencyMs: 10 }, { requestId: 'req-1', stage: 'resolver' })
    await recordExecutionTrace('p', { ...EMPTY_AUDIT, executionLatencyMs: 90 }, { requestId: 'req-1', stage: 'response' })

    const etapas = vi.mocked(recordMetric).mock.calls.map(([, m]) => m.tags?.stage)
    expect(etapas).toEqual(['resolver', 'response'])
  })
})

/**
 * IA-006: la tarificacion ocurre aqui, no en AI Gateway. La razon es de
 * gobernanza: "AI Gateway nunca lo importa: invoca, nunca selecciona"
 * (invariante de Direccion, cierre de IA-006).
 */
describe('recordExecutionTrace — tarificacion de la ejecucion (IA-006)', () => {
  const AUDIT_EJECUTADO: ExecutionAudit = {
    providerIdentifier: 'proveedor-a',
    providerModel: 'modelo-rapido',
    executionLatencyMs: 900,
    tokensConsumed: 1500,
    inputTokens: 1000,
    outputTokens: 500,
    realExecutionCost: null,
    truncated: null, maxOutputTokens: null, technicalMetadata: null,
  }

  it('registra el desglose de tokens que el proveedor publica', async () => {
    vi.mocked(recordMetric).mockReset().mockResolvedValue(true)

    await recordExecutionTrace('profile-1', AUDIT_EJECUTADO)

    const nombres = vi.mocked(recordMetric).mock.calls.map(([, m]) => m.name)
    expect(nombres).toContain('ai_gateway.input_tokens')
    expect(nombres).toContain('ai_gateway.output_tokens')
    expect(nombres).toContain('ai_gateway.tokens_consumed')
  })

  it('SIN TARIFA en el catalogo no se registra coste: no se inventa una cifra', async () => {
    vi.mocked(recordMetric).mockReset().mockResolvedValue(true)

    // El catalogo oficial no declara tarifas todavia.
    await recordExecutionTrace('profile-1', AUDIT_EJECUTADO)

    const nombres = vi.mocked(recordMetric).mock.calls.map(([, m]) => m.name)
    expect(nombres).not.toContain('ai_gateway.real_execution_cost')
  })

  it('cuando el propio proveedor comunica el coste, se registra tal cual', async () => {
    vi.mocked(recordMetric).mockReset().mockResolvedValue(true)

    await recordExecutionTrace('profile-1', { ...AUDIT_EJECUTADO, realExecutionCost: 0.02 })

    const coste = vi.mocked(recordMetric).mock.calls.map(([, m]) => m).find((m) => m.name === 'ai_gateway.real_execution_cost')
    expect(coste?.value).toBe(0.02)
    // Sin tarifa declarada, tampoco se le atribuye una moneda inventada.
    expect(coste?.tags?.currency).toBeUndefined()
  })

  it('sin proveedor ni modelo no hay nada que tarifar', async () => {
    vi.mocked(recordMetric).mockReset().mockResolvedValue(true)

    await recordExecutionTrace('profile-1', { ...AUDIT_EJECUTADO, providerIdentifier: null, providerModel: null })

    const nombres = vi.mocked(recordMetric).mock.calls.map(([, m]) => m.name)
    expect(nombres).not.toContain('ai_gateway.real_execution_cost')
  })
})


/**
 * BLOQUE 5C — telemetria de truncamiento.
 *
 * La pregunta que esta metrica existe para responder no es "cuantas veces
 * se trunco", sino "que PROPORCION de ejecuciones se trunca". Sin
 * denominador no sirve para decidir un techo, que es justo para lo que se
 * pide. De ahi que se emita como bandera 0/1 siempre que hubo ejecucion,
 * igual que `scenaia.response.empty`.
 */
describe('recordExecutionTrace — truncamiento (Bloque 5C)', () => {
  function auditCon(truncated: boolean | null): ExecutionAudit {
    return {
      providerIdentifier: 'openai',
      providerModel: 'gpt-4o-mini',
      executionLatencyMs: 120,
      tokensConsumed: 1000,
      inputTokens: 900,
      outputTokens: 100,
      realExecutionCost: null,
      truncated,
      maxOutputTokens: null,
      technicalMetadata: null,
    }
  }

  function metrica(nombre: string) {
    return vi.mocked(recordMetric).mock.calls.map((llamada) => llamada[1]).find((m) => m.name === nombre)
  }

  it('TRUNCADO: emite la metrica con valor 1', async () => {
    vi.mocked(recordMetric).mockResolvedValue(true)

    await recordExecutionTrace('profile-1', auditCon(true), { requestId: 'req-1', stage: 'response' })

    expect(metrica('ai_gateway.truncated')?.value).toBe(1)
  })

  it('NO TRUNCADO: emite igualmente, con valor 0 -- sin denominador no hay proporcion', async () => {
    vi.mocked(recordMetric).mockResolvedValue(true)

    await recordExecutionTrace('profile-1', auditCon(false), { requestId: 'req-1', stage: 'response' })

    expect(metrica('ai_gateway.truncated')?.value).toBe(0)
  })

  it('SIN EJECUCION no emite nada: `null` no es un cero, es una pregunta sin sujeto', async () => {
    vi.mocked(recordMetric).mockResolvedValue(true)

    await recordExecutionTrace('profile-1', auditCon(null), { requestId: 'req-1', stage: 'response' })

    expect(metrica('ai_gateway.truncated')).toBeUndefined()
  })

  it('DISTINGUE operacion, proveedor y modelo, sin anadir ningun campo nuevo', async () => {
    vi.mocked(recordMetric).mockResolvedValue(true)

    await recordExecutionTrace('profile-1', auditCon(true), { requestId: 'req-1', stage: 'resolver' })

    const emitida = metrica('ai_gateway.truncated')
    expect(emitida?.unit).toBe('flag')
    // `stage` ES la operacion: resolver o response.
    expect(emitida?.tags).toMatchObject({
      stage: 'resolver',
      providerIdentifier: 'openai',
      providerModel: 'gpt-4o-mini',
    })
  })

  it('no altera las metricas ya establecidas: se suma, no sustituye', async () => {
    vi.mocked(recordMetric).mockResolvedValue(true)

    await recordExecutionTrace('profile-1', auditCon(true), { requestId: 'req-1', stage: 'response' })

    expect(metrica('ai_gateway.input_tokens')?.value).toBe(900)
    expect(metrica('ai_gateway.output_tokens')?.value).toBe(100)
  })
})


/**
 * F5F-2 — telemetria del techo aplicado.
 *
 * Entra por el mecanismo numerico ya existente: sin rama propia, sin tabla
 * nueva, sin etiquetas nuevas. Lo que aporta es la escala que a `truncated`
 * le faltaba -- el par (techo, salida) da el margen que quedaba.
 */
describe('recordExecutionTrace — techo aplicado (F5F-2)', () => {
  function auditConTecho(maxOutputTokens: number | null): ExecutionAudit {
    return {
      providerIdentifier: 'openai',
      providerModel: 'gpt-4o-mini',
      executionLatencyMs: 120,
      tokensConsumed: 1000,
      inputTokens: 900,
      outputTokens: 100,
      realExecutionCost: null,
      truncated: false,
      maxOutputTokens,
      technicalMetadata: null,
    }
  }

  function metrica(nombre: string) {
    return vi.mocked(recordMetric).mock.calls.map((llamada) => llamada[1]).find((m) => m.name === nombre)
  }

  it('registra `ai_gateway.max_output_tokens` en tokens', async () => {
    vi.mocked(recordMetric).mockResolvedValue(true)

    await recordExecutionTrace('profile-1', auditConTecho(512), { requestId: 'turno-1', stage: 'response' })

    expect(metrica('ai_gateway.max_output_tokens')?.value).toBe(512)
    expect(metrica('ai_gateway.max_output_tokens')?.unit).toBe('tokens')
  })

  it('RESOLUTOR y RESPUESTA registran techos distintos, distinguibles por operacion', async () => {
    vi.mocked(recordMetric).mockResolvedValue(true)

    await recordExecutionTrace('profile-1', auditConTecho(1024), { requestId: 'turno-1', stage: 'resolver' })
    const delResolutor = metrica('ai_gateway.max_output_tokens')
    vi.mocked(recordMetric).mockClear()
    await recordExecutionTrace('profile-1', auditConTecho(512), { requestId: 'turno-1', stage: 'response' })
    const deLaRespuesta = metrica('ai_gateway.max_output_tokens')

    expect(delResolutor?.value).toBe(1024)
    expect(deLaRespuesta?.value).toBe(512)
    // La operacion la aporta `stage`: ninguna dimension nueva.
    expect(delResolutor?.tags).toMatchObject({ stage: 'resolver' })
    expect(deLaRespuesta?.tags).toMatchObject({ stage: 'response' })
  })

  it('`null` NO emite metrica: un techo desconocido no es cero', async () => {
    vi.mocked(recordMetric).mockResolvedValue(true)

    await recordExecutionTrace('profile-1', auditConTecho(null), { requestId: 'turno-1', stage: 'response' })

    expect(metrica('ai_gateway.max_output_tokens')).toBeUndefined()
  })

  it('NO anade etiquetas nuevas: usa exactamente las mismas que el resto', async () => {
    vi.mocked(recordMetric).mockResolvedValue(true)

    await recordExecutionTrace('profile-1', auditConTecho(512), { requestId: 'turno-1', stage: 'response' })

    expect(Object.keys(metrica('ai_gateway.max_output_tokens')?.tags ?? {}).sort()).toEqual(
      Object.keys(metrica('ai_gateway.output_tokens')?.tags ?? {}).sort()
    )
  })

  it('acompaña a la salida real: el par permite calcular el margen restante', async () => {
    vi.mocked(recordMetric).mockResolvedValue(true)

    await recordExecutionTrace('profile-1', auditConTecho(512), { requestId: 'turno-1', stage: 'response' })

    expect(metrica('ai_gateway.output_tokens')?.value).toBe(100)
    expect(metrica('ai_gateway.max_output_tokens')?.value).toBe(512)
  })

  it('IDENTIDAD F5F-1 INTACTA: todas las metricas de la ejecucion comparten requestId', async () => {
    vi.mocked(recordMetric).mockResolvedValue(true)

    await recordExecutionTrace('profile-1', auditConTecho(512), { requestId: 'turno-1', stage: 'response' })

    const identidades = vi.mocked(recordMetric).mock.calls.map((llamada) => llamada[1].tags?.requestId)
    expect(new Set(identidades).size).toBe(1)
    expect(identidades[0]).toBe('turno-1')
  })
})
