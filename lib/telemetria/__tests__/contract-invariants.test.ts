import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const MODULE_FILES = ['types.ts', 'record-metric.ts', 'list-metrics.ts', 'index.ts']
const MODULE_SOURCE = MODULE_FILES.map((file) => readFileSync(join(__dirname, '..', file), 'utf-8')).join('\n')

const RECORD_METRIC_SOURCE = readFileSync(join(__dirname, '..', 'record-metric.ts'), 'utf-8')

const NUCLEO_MODULES = [
  'lib/response-composer',
  'lib/ai-gateway',
  'lib/credit-manager',
  'lib/decision-engine',
  'lib/professional-context-engine',
  'lib/scenaia-knowledge-model',
  'lib/request-interpreter',
]

describe('Telemetría — invariantes de integración (Servicio de Plataforma, SC-005)', () => {
  it('nunca accede a Supabase directamente: toda persistencia pasa por Repository Layer', () => {
    expect(MODULE_SOURCE).not.toMatch(/supabase|createClient/i)
    expect(MODULE_SOURCE).toMatch(/from '@\/lib\/repository-layer'/)
  })

  it('no importa ningún componente del Núcleo como dependencia funcional', () => {
    for (const modulePath of NUCLEO_MODULES) {
      expect(MODULE_SOURCE).not.toMatch(new RegExp(`from '@/${modulePath.replace('lib/', 'lib\\/')}'`))
    }
  })

  it('no conoce ni depende de Observabilidad ni de Analítica (la dirección de dependencia es siempre al revés)', () => {
    expect(MODULE_SOURCE).not.toMatch(/from '@\/lib\/observabilidad'|from '@\/lib\/analitica'/)
  })

  it('no consume ExecutionAudit directamente (frontera ya congelada: esa responsabilidad es de Observabilidad/Analítica)', () => {
    expect(MODULE_SOURCE).not.toMatch(/executionaudit/i)
  })
})

describe('Telemetría — record-metric.ts (invariante propio: nunca interrumpe el flujo que la invoca)', () => {
  it('cualquier fallo de persistencia se degrada a false, nunca se relanza', () => {
    expect(RECORD_METRIC_SOURCE).toMatch(/catch/)
    expect(RECORD_METRIC_SOURCE).not.toMatch(/throw /)
  })
})
