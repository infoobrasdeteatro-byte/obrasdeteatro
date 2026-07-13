import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const MODULE_SOURCE = ['works-knowledge.ts', 'organizations-knowledge.ts', 'structured-knowledge.ts']
  .map((file) => readFileSync(join(__dirname, '..', file), 'utf-8'))
  .join('\n')

describe('Knowledge Assets — invariantes de integración (SC-005.2)', () => {
  it('nunca accede a Supabase directamente: toda persistencia pasa por Repository Layer', () => {
    expect(MODULE_SOURCE).not.toMatch(/supabase|createClient/i)
    expect(MODULE_SOURCE).toMatch(/from '@\/lib\/repository-layer'/)
  })

  it('es exclusivamente de lectura: no contiene ninguna operación de escritura', () => {
    expect(MODULE_SOURCE).not.toMatch(/\.insert\(|\.update\(|\.upsert\(|\.delete\(|\.rpc\(/)
  })

  it('no importa ningún componente del Núcleo', () => {
    expect(MODULE_SOURCE).not.toMatch(
      /decision-engine|credit-manager|ai-gateway|response-composer|request-interpreter/i
    )
  })
})
