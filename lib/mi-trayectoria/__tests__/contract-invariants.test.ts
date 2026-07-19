import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const MODULE_FILES = ['types.ts', 'interpret-activity.ts', 'build-trajectory.ts', 'index.ts']
const MODULE_SOURCE = MODULE_FILES.map((file) => readFileSync(join(__dirname, '..', file), 'utf-8')).join('\n')

const BUILD_TRAJECTORY_SOURCE = readFileSync(join(__dirname, '..', 'build-trajectory.ts'), 'utf-8')
const INTERPRET_ACTIVITY_SOURCE = readFileSync(join(__dirname, '..', 'interpret-activity.ts'), 'utf-8')

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
]

describe('Mi Trayectoria® — invariantes de integración (Dominio Funcional, SC-005/DT-003)', () => {
  it('depende exclusivamente de @/lib/procesos-asincronos, sin ningún otro componente', () => {
    for (const modulePath of OTHER_MODULES) {
      expect(MODULE_SOURCE).not.toMatch(new RegExp(`from '@/${modulePath.replace('lib/', 'lib\\/')}'`))
    }
    expect(MODULE_SOURCE).toMatch(/from '@\/lib\/procesos-asincronos'/)
  })

  it('nunca accede a Supabase directamente', () => {
    expect(MODULE_SOURCE).not.toMatch(/supabase|createClient/i)
  })

  it('build-trajectory.ts observa de forma exclusivamente pasiva: solo listActivityHistory, nunca recordActivity/listPendingActivity/markActivityProcessed', () => {
    expect(BUILD_TRAJECTORY_SOURCE).toMatch(/listActivityHistory/)
    expect(BUILD_TRAJECTORY_SOURCE).not.toMatch(/recordActivity|listPendingActivity|markActivityProcessed/)
  })

  it('interpret-activity.ts es una función pura: sin async/await, sin llamadas a Procesos Asíncronos', () => {
    expect(INTERPRET_ACTIVITY_SOURCE).not.toMatch(/\basync\b|\bawait\b/)
    expect(INTERPRET_ACTIVITY_SOURCE).not.toMatch(/listActivityHistory\(|listPendingActivity\(|recordActivity\(|markActivityProcessed\(/)
  })
})
