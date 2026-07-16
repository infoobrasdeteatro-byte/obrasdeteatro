import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const MODULE_SOURCE = readFileSync(join(__dirname, '..', 'execute-ai-request.ts'), 'utf-8')

describe('AI Gateway — invariantes de integración (SC-004.7)', () => {
  it('nunca accede a Supabase directamente', () => {
    expect(MODULE_SOURCE).not.toMatch(/supabase|createClient/i)
  })

  it('no invoca directamente a los constructores de PCE, SKM, Decision Engine ni Credit Manager: solo consume sus tipos', () => {
    expect(MODULE_SOURCE).not.toMatch(
      /buildProfessionalContext|buildKnowledgeContext|buildDecisionContext|buildAuthorizationContext|normalizeRequest/
    )
  })

  it('nunca importa Accounting Engine (IA-007: fuera de su responsabilidad)', () => {
    expect(MODULE_SOURCE).not.toMatch(/from '@\/lib\/accounting-engine'/)
  })

  it('no decide el proveedor por su cuenta: nunca contiene un catálogo ni una tabla de proveedores propia', () => {
    expect(MODULE_SOURCE).not.toMatch(/'claude'|'openai'|'gpt-|anthropic-ai|@anthropic-ai|openai\//i)
  })

  it('no ejecuta ninguna llamada de red real (sin SDK de IA, sin fetch/axios)', () => {
    expect(MODULE_SOURCE).not.toMatch(/fetch\(|axios|openai|anthropic/i)
  })
})
