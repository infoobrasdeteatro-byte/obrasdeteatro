import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const MODULE_SOURCE = ['templates.ts', 'compose-response.ts']
  .map((file) => readFileSync(join(__dirname, '..', file), 'utf-8'))
  .join('\n')

describe('Response Composer — invariantes de integración (SC-004.6)', () => {
  it('nunca accede a Supabase directamente', () => {
    expect(MODULE_SOURCE).not.toMatch(/supabase|createClient/i)
  })

  it('no invoca directamente a los constructores de PCE, SKM, Decision Engine, Credit Manager ni AI Gateway: solo consume sus tipos', () => {
    expect(MODULE_SOURCE).not.toMatch(
      /buildProfessionalContext|buildKnowledgeContext|buildDecisionContext|buildAuthorizationContext|executeAIRequest|normalizeRequest/
    )
  })

  it('no ejecuta IA ni consulta proveedores externos', () => {
    expect(MODULE_SOURCE).not.toMatch(/fetch\(|axios|openai|anthropic/i)
  })

  it('es puro y síncrono: sin async/await, sin I/O', () => {
    expect(MODULE_SOURCE).not.toMatch(/\basync\b|\bawait\b/)
  })
})
