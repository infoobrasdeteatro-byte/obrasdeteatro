import { describe, it, expect, vi, beforeEach } from 'vitest'
import { recordMetrics } from '@/lib/telemetria'
import { recordTurnMetrics } from '../record-turn-metrics'
import type { TurnObservation } from '../types'

vi.mock('@/lib/telemetria', () => ({ recordMetrics: vi.fn() }))

const OBSERVACION: TurnObservation = {
  requestId: 'req-1',
  domains: ['Obras'],
  isContinuation: false,
  resolvedTerms: ['obra', 'corta'],
  retrievedEntityCount: 3,
  coveredDomainCount: 1,
  knowledgeConfidence: 1,
  isEmptyResult: false,
  responseType: 'RESPONSE_SUCCESS',
  durationMs: 1234,
}

/** Todas las metricas emitidas en una invocacion, para inspeccionarlas juntas. */
function metricasEmitidas() {
  return vi.mocked(recordMetrics).mock.calls.flatMap(([, metrics]) => metrics)
}

beforeEach(() => {
  vi.mocked(recordMetrics).mockReset().mockResolvedValue(true)
})

describe('recordTurnMetrics — que se observa de un turno', () => {
  it('emite las metricas del turno sobre el mecanismo de telemetria ya existente', async () => {
    await recordTurnMetrics('profile-1', OBSERVACION)

    expect(metricasEmitidas().map((m) => m.name).sort()).toEqual([
      'scenaia.interpreter.domains_count',
      'scenaia.knowledge.completeness',
      'scenaia.request.duration_ms',
      'scenaia.resolver.terms_count',
      'scenaia.response.empty',
      'scenaia.response.status',
      'scenaia.retrieval.entities_count',
      'scenaia.state.domain_source',
    ])
    expect(vi.mocked(recordMetrics).mock.calls.every(([profileId]) => profileId === 'profile-1')).toBe(true)
  })

  it('CORRELACION: toda metrica del turno lleva el mismo requestId', async () => {
    await recordTurnMetrics('profile-1', OBSERVACION)

    for (const metrica of metricasEmitidas()) {
      expect(metrica.tags?.requestId, metrica.name).toBe('req-1')
    }
  })

  it('mide lo que hay que medir: dominios, terminos, entidades y duracion', async () => {
    await recordTurnMetrics('profile-1', OBSERVACION)

    const valor = (name: string) => metricasEmitidas().find((m) => m.name === name)?.value

    expect(valor('scenaia.interpreter.domains_count')).toBe(1)
    expect(valor('scenaia.resolver.terms_count')).toBe(2)
    expect(valor('scenaia.retrieval.entities_count')).toBe(3)
    expect(valor('scenaia.request.duration_ms')).toBe(1234)
    expect(valor('scenaia.knowledge.completeness')).toBe(1)
  })

  it('response.empty es la metrica de la Fase 1: 0 cuando hubo resultados, 1 cuando no', async () => {
    await recordTurnMetrics('profile-1', OBSERVACION)
    expect(metricasEmitidas().find((m) => m.name === 'scenaia.response.empty')?.value).toBe(0)

    vi.mocked(recordMetrics).mockReset().mockResolvedValue(true)
    await recordTurnMetrics('profile-1', { ...OBSERVACION, retrievedEntityCount: 0, isEmptyResult: true })
    expect(metricasEmitidas().find((m) => m.name === 'scenaia.response.empty')?.value).toBe(1)
  })

  it('PRIVACIDAD: ningun tag contiene texto de la peticion ni de la respuesta del modelo', async () => {
    await recordTurnMetrics('profile-1', OBSERVACION)

    const todo = JSON.stringify(metricasEmitidas())

    // Lo que el usuario escribio y lo que el modelo contesto jamas salen de
    // sus capas: aqui solo viaja vocabulario cerrado del propio sistema.
    expect(todo).not.toContain('¿Qué obras')
    expect(todo).not.toContain('Casa con dos puertas')
    for (const metrica of metricasEmitidas()) {
      for (const valor of Object.values(metrica.tags ?? {})) {
        expect(typeof valor).toBe('string')
        expect(valor.length, `tag demasiado largo en ${metrica.name}: ${valor}`).toBeLessThan(200)
      }
    }
  })

  it('PRIVACIDAD: solo viaja el RECUENTO de entidades, nunca su identidad', async () => {
    await recordTurnMetrics('profile-1', OBSERVACION)

    const recuperacion = metricasEmitidas().find((m) => m.name === 'scenaia.retrieval.entities_count')

    expect(recuperacion?.value).toBe(3)
    expect(Object.keys(recuperacion?.tags ?? {})).not.toContain('entities')
    expect(Object.keys(recuperacion?.tags ?? {})).not.toContain('ids')
  })

  it('los tags de vocabulario usan un marcador explicito cuando no hay nada, nunca cadena vacia', async () => {
    await recordTurnMetrics('profile-1', { ...OBSERVACION, domains: [], resolvedTerms: [] })

    const dominios = metricasEmitidas().find((m) => m.name === 'scenaia.interpreter.domains_count')
    const terminos = metricasEmitidas().find((m) => m.name === 'scenaia.resolver.terms_count')

    expect(dominios?.tags?.domains).toBe('ninguno')
    expect(terminos?.tags?.terms).toBe('ninguno')
  })

  it('nunca lanza: un fallo de registro no puede propagarse al flujo', async () => {
    vi.mocked(recordMetrics).mockResolvedValue(false)

    await expect(recordTurnMetrics('profile-1', OBSERVACION)).resolves.toBe(false)
  })

  it('RENDIMIENTO: todas las metricas viajan en UNA sola escritura, no una por metrica', async () => {
    await recordTurnMetrics('profile-1', OBSERVACION)

    expect(recordMetrics).toHaveBeenCalledTimes(1)
    expect(vi.mocked(recordMetrics).mock.calls[0][1]).toHaveLength(8)
  })

  it('las metricas de la Fase 1 no cuestan una escritura adicional', async () => {
    await recordTurnMetrics('profile-1', { ...OBSERVACION, retrievedEntityCount: 0, isEmptyResult: true })

    // Nueve metricas -- las ocho anteriores mas empty_reason -- en un solo viaje.
    expect(recordMetrics).toHaveBeenCalledTimes(1)
    expect(vi.mocked(recordMetrics).mock.calls[0][1]).toHaveLength(9)
  })
})

/**
 * FASE 1 -- las dos senales que faltaban para poder auditar la continuidad
 * conversacional sin leer el texto de nadie.
 */
describe('domain_source — de donde salio el dominio del turno', () => {
  const fuente = () => metricasEmitidas().find((m) => m.name === 'scenaia.state.domain_source')?.tags?.domainSource

  it('PROPIO: la peticion nombraba su dominio y se interpreto sola', async () => {
    await recordTurnMetrics('profile-1', { ...OBSERVACION, domains: ['Obras'], isContinuation: false })

    expect(fuente()).toBe('propio')
  })

  it('HEREDADO: no lo nombraba y lo tomo de la conversacion anterior', async () => {
    await recordTurnMetrics('profile-1', { ...OBSERVACION, domains: ['Obras'], isContinuation: true })

    expect(fuente()).toBe('heredado')
  })

  it('NINGUNO: no se resolvio ningun dominio, con o sin continuacion', async () => {
    await recordTurnMetrics('profile-1', { ...OBSERVACION, domains: [], isContinuation: true })
    expect(fuente()).toBe('ninguno')

    vi.mocked(recordMetrics).mockReset().mockResolvedValue(true)
    await recordTurnMetrics('profile-1', { ...OBSERVACION, domains: [], isContinuation: false })
    expect(fuente()).toBe('ninguno')
  })

  it('DISTINGUE lo que antes era indistinguible: un turno propio y uno heredado ya no producen la misma telemetria', async () => {
    await recordTurnMetrics('profile-1', { ...OBSERVACION, isContinuation: false })
    const propio = fuente()

    vi.mocked(recordMetrics).mockReset().mockResolvedValue(true)
    await recordTurnMetrics('profile-1', { ...OBSERVACION, isContinuation: true })

    expect(fuente()).not.toBe(propio)
  })

  it('VOCABULARIO CERRADO: solo tres valores posibles, nunca texto', async () => {
    for (const observacion of [
      { ...OBSERVACION, domains: ['Obras'], isContinuation: false },
      { ...OBSERVACION, domains: ['Obras', 'Personas'], isContinuation: true },
      { ...OBSERVACION, domains: [], isContinuation: false },
    ]) {
      vi.mocked(recordMetrics).mockReset().mockResolvedValue(true)
      await recordTurnMetrics('profile-1', observacion)

      expect(['propio', 'heredado', 'ninguno']).toContain(fuente())
    }
  })

  it('se emite SIEMPRE, tambien cuando el turno fue normal: sin la metrica no hay linea base', async () => {
    await recordTurnMetrics('profile-1', OBSERVACION)

    expect(fuente()).toBeDefined()
  })
})

describe('empty_reason — por que un turno se quedo sin entidades', () => {
  const motivo = () => metricasEmitidas().find((m) => m.name === 'scenaia.retrieval.empty_reason')?.tags?.reason

  it('SIN_DOMINIO: no habia ningun dominio cubierto que consultar', async () => {
    await recordTurnMetrics('profile-1', { ...OBSERVACION, retrievedEntityCount: 0, coveredDomainCount: 0 })

    expect(motivo()).toBe('sin_dominio')
  })

  it('SIN_RESULTADOS: se consulto el catalogo y no contenia nada', async () => {
    await recordTurnMetrics('profile-1', { ...OBSERVACION, retrievedEntityCount: 0, coveredDomainCount: 1 })

    expect(motivo()).toBe('sin_resultados')
  })

  it('SEPARA las dos causas que antes compartian entities_count = 0', async () => {
    await recordTurnMetrics('profile-1', { ...OBSERVACION, retrievedEntityCount: 0, coveredDomainCount: 0 })
    const sinDominio = motivo()

    vi.mocked(recordMetrics).mockReset().mockResolvedValue(true)
    await recordTurnMetrics('profile-1', { ...OBSERVACION, retrievedEntityCount: 0, coveredDomainCount: 1 })

    // Mismo recuento de entidades -- cero -- y sin embargo causas opuestas.
    expect(motivo()).not.toBe(sinDominio)
  })

  it('NO se emite cuando hubo entidades: su ausencia afirma que no hubo vacio', async () => {
    await recordTurnMetrics('profile-1', OBSERVACION)

    expect(metricasEmitidas().some((m) => m.name === 'scenaia.retrieval.empty_reason')).toBe(false)
  })

  it('VOCABULARIO CERRADO: dos valores, ninguno mas', async () => {
    for (const cubiertos of [0, 1, 3]) {
      vi.mocked(recordMetrics).mockReset().mockResolvedValue(true)
      await recordTurnMetrics('profile-1', { ...OBSERVACION, retrievedEntityCount: 0, coveredDomainCount: cubiertos })

      expect(['sin_dominio', 'sin_resultados']).toContain(motivo())
    }
  })

  it('CORRELACION: tambien lleva el requestId del turno', async () => {
    await recordTurnMetrics('profile-1', { ...OBSERVACION, retrievedEntityCount: 0, coveredDomainCount: 0 })

    expect(metricasEmitidas().find((m) => m.name === 'scenaia.retrieval.empty_reason')?.tags?.requestId).toBe('req-1')
  })
})
