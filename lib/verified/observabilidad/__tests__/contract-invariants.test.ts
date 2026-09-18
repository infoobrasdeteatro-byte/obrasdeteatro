import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

// types.ts es el único punto de importación de un tipo del Núcleo (ExecutionAudit,
// vía @/lib/ai-gateway) -- mismo patrón ya usado en procesos-asincronos/types.ts
// para ResponseType. Excluido deliberadamente del barrido "sin Núcleo".
const MODULE_FILES = ['record-execution-trace.ts', 'interpret-metrics.ts', 'build-technical-trace.ts', 'index.ts']
const MODULE_SOURCE = MODULE_FILES.map((file) => readFileSync(join(__dirname, '..', file), 'utf-8')).join('\n')

const RECORD_EXECUTION_TRACE_SOURCE = readFileSync(join(__dirname, '..', 'record-execution-trace.ts'), 'utf-8')

const NUCLEO_MODULES = [
  'lib/response-composer',
  'lib/ai-gateway',
  'lib/credit-manager',
  'lib/decision-engine',
  'lib/professional-context-engine',
  'lib/scenaia-knowledge-model',
  'lib/request-interpreter',
]

describe('Observabilidad (lib/verified) — invariantes de integración (Servicio de Plataforma, SC-005)', () => {
  it('nunca accede a Supabase ni a Repository Layer directamente: toda persistencia pasa por Telemetría', () => {
    expect(MODULE_SOURCE).not.toMatch(/supabase|createClient/i)
    expect(MODULE_SOURCE).not.toMatch(/from '@\/lib\/repository-layer'/)
    expect(MODULE_SOURCE).toMatch(/from '@\/lib\/telemetria'/)
  })

  it('no importa ningún componente del Núcleo fuera de types.ts', () => {
    for (const modulePath of NUCLEO_MODULES) {
      expect(MODULE_SOURCE).not.toMatch(new RegExp(`from '@/${modulePath.replace('lib/', 'lib\\/')}'`))
    }
  })

  it('no conoce ni depende de Analítica ni de Sistemas de Caché (la dirección de dependencia es siempre al revés)', () => {
    expect(MODULE_SOURCE).not.toMatch(/from '@\/lib\/analitica'|from '@\/lib\/sistemas-cache'/)
  })

  it('nunca consulta DecisionContext ni DecisionRationale', () => {
    expect(MODULE_SOURCE).not.toMatch(/decisioncontext|decisionrationale/i)
  })
})

describe('Observabilidad — record-execution-trace.ts (invariante propio: nunca interrumpe el flujo que la invoca)', () => {
  it('nunca lanza (recordMetric de Telemetría ya nunca lanza; aquí no se relanza nada)', () => {
    expect(RECORD_EXECUTION_TRACE_SOURCE).not.toMatch(/throw /)
  })

  it('no traduce technicalMetadata a ninguna métrica (solo se menciona en comentarios explicativos, nunca como acceso a la propiedad)', () => {
    expect(RECORD_EXECUTION_TRACE_SOURCE).not.toMatch(/audit\.technicalMetadata/)
  })
})


/**
 * BLOQUE 5D-1 — familias de metricas.
 *
 * `ai_gateway.*` describe UNA ejecucion concreta del proveedor.
 * `scenaia.*` describe el turno. Un turno puede contener dos ejecuciones
 * -- resolutor y respuesta -- y truncarse solo una: si el truncamiento
 * viviera en la familia del turno, seria imposible saber cual.
 */
describe('Observabilidad — familia de la metrica de truncamiento (Bloque 5D)', () => {
  const TRACE = readFileSync(join(__dirname, '..', 'record-execution-trace.ts'), 'utf-8')
  const TURN = readFileSync(join(__dirname, '..', 'record-turn-metrics.ts'), 'utf-8')

  it('la metrica es exactamente `ai_gateway.truncated`', () => {
    expect(TRACE).toMatch(/name: 'ai_gateway\.truncated'/)
  })

  it('NO existe `scenaia.ai.truncated`: no se mantienen las dos', () => {
    expect(TRACE).not.toMatch(/scenaia\.ai\.truncated/)
    expect(TURN).not.toMatch(/scenaia\.ai\.truncated/)
  })

  it('el truncamiento NO se emite como metrica de turno: no es un hecho del turno', () => {
    expect(TURN).not.toMatch(/truncated/)
  })

  it('cada familia se emite desde su propio traductor, sin mezclarse', () => {
    // Ninguna metrica `scenaia.*` sale del traductor de ejecuciones.
    expect(TRACE).not.toMatch(/name: 'scenaia\./)
    // Ninguna metrica `ai_gateway.*` sale del traductor de turnos.
    expect(TURN).not.toMatch(/name: 'ai_gateway\./)
  })
})


/**
 * F5F-2 — la metrica del techo pertenece al audit de SU ejecucion.
 */
describe('Observabilidad — techo aplicado (F5F-2)', () => {
  const TRACE = readFileSync(join(__dirname, '..', 'record-execution-trace.ts'), 'utf-8')

  it('`ai_gateway.max_output_tokens` se emite desde el audit de la ejecucion', () => {
    expect(TRACE).toMatch(/name: 'ai_gateway\.max_output_tokens'/)
    expect(TRACE).toMatch(/key: 'maxOutputTokens'/)
  })

  it('entra por el mecanismo numerico existente: sin rama propia', () => {
    // Debe estar en NUMERIC_FIELDS, que ya filtra los `null` y ya aplica
    // las etiquetas comunes. Una rama aparte duplicaria ese criterio.
    const bloque = TRACE.slice(TRACE.indexOf('const NUMERIC_FIELDS'), TRACE.indexOf(']', TRACE.indexOf('const NUMERIC_FIELDS')))
    expect(bloque).toMatch(/ai_gateway\.max_output_tokens/)
  })

  it('NO reconstruye el valor desde la politica del Gateway', () => {
    expect(TRACE).not.toMatch(/MAX_OUTPUT_TOKENS_BY_OPERATION|maxOutputTokensFor/)
  })

  it('NO introduce dimension nueva: ninguna etiqueta propia', () => {
    // Las etiquetas se construyen una sola vez para todas las metricas.
    const etiquetasPropias = TRACE.match(/tags: \{[^}]*max_output/g) ?? []
    expect(etiquetasPropias).toHaveLength(0)
  })
})
