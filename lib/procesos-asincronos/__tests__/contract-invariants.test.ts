import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const RECORD_ACTIVITY_SOURCE = readFileSync(join(__dirname, '..', 'record-activity.ts'), 'utf-8')
const MODULE_FILES = [
  'record-activity.ts',
  'list-pending-activity.ts',
  'list-activity-history.ts',
  'mark-activity-processed.ts',
  'narrow-entry.ts',
]
const MODULE_SOURCE = MODULE_FILES.map((file) => readFileSync(join(__dirname, '..', file), 'utf-8')).join('\n')

const NUCLEO_MODULES = [
  'lib/response-composer',
  'lib/ai-gateway',
  'lib/credit-manager',
  'lib/decision-engine',
  'lib/professional-context-engine',
  'lib/scenaia-knowledge-model',
  'lib/request-interpreter',
]

describe('Procesos Asíncronos — invariantes de integración (Servicio de Plataforma, SC-005)', () => {
  it('nunca accede a Supabase directamente: toda persistencia pasa por Repository Layer', () => {
    expect(MODULE_SOURCE).not.toMatch(/supabase|createClient/i)
    expect(MODULE_SOURCE).toMatch(/from '@\/lib\/repository-layer'/)
  })

  it('no importa ningún componente del Núcleo como dependencia funcional (solo tipos, vía ./types)', () => {
    for (const modulePath of NUCLEO_MODULES) {
      expect(MODULE_SOURCE).not.toMatch(new RegExp(`from '@/${modulePath.replace('lib/', 'lib\\/')}'`))
    }
  })

  it('no expone ExecutionAudit ni ningún dato de Accounting Engine (fuera de su alcance autorizado)', () => {
    expect(MODULE_SOURCE).not.toMatch(/executionaudit|accounting-engine/i)
  })
})

describe('Procesos Asíncronos — record-activity.ts (invariante propio: nunca interrumpe el flujo síncrono)', () => {
  it('cualquier fallo de persistencia se degrada a false, nunca se relanza', () => {
    expect(RECORD_ACTIVITY_SOURCE).toMatch(/catch/)
    expect(RECORD_ACTIVITY_SOURCE).not.toMatch(/throw /)
  })
})
