import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const MODULE_FILES = ['types.ts', 'build-trace.ts', 'index.ts']
const MODULE_SOURCE = MODULE_FILES.map((file) => readFileSync(join(__dirname, '..', file), 'utf-8')).join('\n')

const BUILD_TRACE_SOURCE = readFileSync(join(__dirname, '..', 'build-trace.ts'), 'utf-8')

const OTHER_MODULES = [
  'lib/supabase',
  'lib/repository-layer',
  'lib/response-composer',
  'lib/ai-gateway',
  'lib/credit-manager',
  'lib/decision-engine',
  'lib/professional-context-engine',
  'lib/scenaia-knowledge-model',
  'lib/request-interpreter',
  'lib/procesos-asincronos',
]

describe('Observabilidad — invariantes de integración (Servicio de Plataforma, SC-005)', () => {
  it('depende exclusivamente de @/lib/telemetria, sin ningún otro componente', () => {
    for (const modulePath of OTHER_MODULES) {
      expect(MODULE_SOURCE).not.toMatch(new RegExp(`from '@/${modulePath.replace('lib/', 'lib\\/')}'`))
    }
    expect(MODULE_SOURCE).toMatch(/from '@\/lib\/telemetria'/)
  })

  it('nunca accede a Supabase directamente', () => {
    expect(MODULE_SOURCE).not.toMatch(/supabase|createClient/i)
  })

  it('no conoce ni depende de Analítica (la dirección de dependencia es siempre al revés)', () => {
    expect(MODULE_SOURCE).not.toMatch(/from '@\/lib\/analitica'/)
  })

  it('no consulta DecisionContext ni DecisionRationale (vacío diferido ya congelado)', () => {
    expect(MODULE_SOURCE).not.toMatch(/DecisionContext|DecisionRationale/)
  })

  it('build-trace.ts lee la telemetría del perfil sin ningún filtro adicional (toda la actividad disponible)', () => {
    expect(BUILD_TRACE_SOURCE).toMatch(/listMetrics\(profileId\)/)
  })
})
