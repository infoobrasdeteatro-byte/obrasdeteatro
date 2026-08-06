import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const MODULE_FILES = ['types.ts', 'build-business-analytics.ts', 'index.ts']
const MODULE_SOURCE = MODULE_FILES.map((file) => readFileSync(join(__dirname, '..', file), 'utf-8')).join('\n')

const BUILD_ANALYTICS_SOURCE = readFileSync(join(__dirname, '..', 'build-business-analytics.ts'), 'utf-8')

const OTHER_MODULES = [
  'lib/supabase',
  'lib/telemetria',
  'lib/observabilidad',
  'lib/response-composer',
  'lib/ai-gateway',
  'lib/credit-manager',
  'lib/decision-engine',
  'lib/professional-context-engine',
  'lib/scenaia-knowledge-model',
  'lib/request-interpreter',
  'lib/procesos-asincronos',
]

describe('Analítica — invariantes de integración (Servicio de Plataforma, SC-005)', () => {
  it('depende exclusivamente de @/lib/repository-layer (listExecutionAudit), sin ningún otro componente', () => {
    for (const modulePath of OTHER_MODULES) {
      expect(MODULE_SOURCE).not.toMatch(new RegExp(`from '@/${modulePath.replace('lib/', 'lib\\/')}'`))
    }
    expect(MODULE_SOURCE).toMatch(/from '@\/lib\/repository-layer'/)
  })

  it('nunca accede a Supabase directamente', () => {
    expect(MODULE_SOURCE).not.toMatch(/supabase|createClient/i)
  })

  it('nunca consume Telemetría -- ExecutionAudit es su única fuente autorizada', () => {
    expect(MODULE_SOURCE).not.toMatch(/listMetrics|recordMetric/)
  })

  it('no consulta DecisionContext ni DecisionRationale (vacío diferido ya congelado)', () => {
    expect(MODULE_SOURCE).not.toMatch(/DecisionContext|DecisionRationale/)
  })

  it('build-business-analytics.ts lee sin acotar por perfil -- nunca recibe ni propaga un profileId', () => {
    expect(BUILD_ANALYTICS_SOURCE).toMatch(/listExecutionAudit\(\)/)
    expect(BUILD_ANALYTICS_SOURCE).not.toMatch(/profileId/)
  })
})
