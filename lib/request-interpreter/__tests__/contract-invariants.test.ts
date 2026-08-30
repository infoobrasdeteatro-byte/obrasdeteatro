import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

// `types.ts` quedaba fuera de la frontera que este archivo declara vigilar:
// un import prohibido en el contrato habria pasado inadvertido. Incorporado
// por autorizacion expresa de Direccion (Fase 3) -- endurecimiento del
// invariante existente, sin ampliar ningun permiso.
const MODULE_SOURCE = ['normalize-text.ts', 'domain-rules.ts', 'request-type-rules.ts', 'interpreter.ts', 'types.ts']
  .map((file) => readFileSync(join(__dirname, '..', file), 'utf-8'))
  .join('\n')

describe('Request Interpreter — invariantes de integración (SC-004.4)', () => {
  it('nunca accede a Supabase, ni directa ni indirectamente a Repository Layer', () => {
    expect(MODULE_SOURCE).not.toMatch(/supabase|createClient/i)
    expect(MODULE_SOURCE).not.toMatch(/from '@\/lib\/repository-layer'/)
  })

  it('solo importa de Knowledge Assets el tipo KnowledgeDomain, nunca sus accesores', () => {
    expect(MODULE_SOURCE).toMatch(/import type \{ KnowledgeDomain \} from '@\/lib\/knowledge-assets'/)
    expect(MODULE_SOURCE).not.toMatch(/getWorkKnowledge|getOrganizationKnowledge|listStructuredKnowledge/)
  })

  it('no importa ningún componente del Núcleo (PCE, SKM, Decision Engine, Credit Manager, AI Gateway, Response Composer)', () => {
    expect(MODULE_SOURCE).not.toMatch(
      /professional-context-engine|skm|decision-engine|credit-manager|ai-gateway|response-composer|accounting-engine/i
    )
  })

  it('es una función pura y síncrona: sin async/await, sin I/O', () => {
    expect(MODULE_SOURCE).not.toMatch(/\basync\b|\bawait\b/)
  })

  it('no expone ningún dato del dominio Subscription', () => {
    expect(MODULE_SOURCE).not.toMatch(/is_premium|isPremium|subscriptions|stripe/i)
  })
})
