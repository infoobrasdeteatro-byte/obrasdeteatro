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
