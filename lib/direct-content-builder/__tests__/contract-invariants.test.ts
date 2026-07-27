import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const MODULE_SOURCE = ['build-direct-content.ts', 'index.ts']
  .map((file) => readFileSync(join(__dirname, '..', file), 'utf-8'))
  .join('\n')

describe('Direct Content Builder — invariantes de integración (IA-008, Plan Técnico aprobado 2026-07-22)', () => {
  it('nunca depende de AI Gateway ni de ningun SDK de proveedor de IA', () => {
    expect(MODULE_SOURCE).not.toMatch(/from '@\/lib\/ai-gateway'/)
    expect(MODULE_SOURCE).not.toMatch(/fetch\(|axios|openai|anthropic/i)
  })

  it('nunca depende de Repository Layer ni de Knowledge Assets directamente', () => {
    expect(MODULE_SOURCE).not.toMatch(/from '@\/lib\/repository-layer'/)
    expect(MODULE_SOURCE).not.toMatch(/from '@\/lib\/knowledge-assets'/)
  })

  it('nunca depende de Response Composer (direccion unica: SKM -> componente -> Response Composer)', () => {
    expect(MODULE_SOURCE).not.toMatch(/from '@\/lib\/response-composer'/)
  })

  it('es puro y sincrono: sin async/await, sin I/O', () => {
    expect(MODULE_SOURCE).not.toMatch(/\basync\b|\bawait\b/)
  })

  it('nunca accede a Supabase directamente', () => {
    expect(MODULE_SOURCE).not.toMatch(/supabase|createClient/i)
  })
})
