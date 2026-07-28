import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const MODULE_SOURCE = ['compose-prompt.ts', 'index.ts']
  .map((file) => readFileSync(join(__dirname, '..', file), 'utf-8'))
  .join('\n')

describe('Prompt Composer — invariantes de integración (SCENAIA-002A)', () => {
  it('nunca depende de AI Gateway ni de ningún SDK/proveedor de IA', () => {
    expect(MODULE_SOURCE).not.toMatch(/from '@\/lib\/ai-gateway'/)
    expect(MODULE_SOURCE).not.toMatch(/openai|anthropic|gemini|mistral|deepseek/i)
  })

  it('nunca depende de Repository Layer ni accede a Supabase', () => {
    expect(MODULE_SOURCE).not.toMatch(/from '@\/lib\/repository-layer'/)
    expect(MODULE_SOURCE).not.toMatch(/supabase|createClient/i)
  })

  it('nunca depende de Credit Manager ni de Accounting Engine', () => {
    expect(MODULE_SOURCE).not.toMatch(/from '@\/lib\/credit-manager'/)
    expect(MODULE_SOURCE).not.toMatch(/from '@\/lib\/accounting-engine'/)
  })

  it('nunca depende de Decision Engine ni de Response Composer', () => {
    expect(MODULE_SOURCE).not.toMatch(/from '@\/lib\/decision-engine'/)
    expect(MODULE_SOURCE).not.toMatch(/from '@\/lib\/response-composer'/)
  })

  it('nunca accede a variables de entorno', () => {
    expect(MODULE_SOURCE).not.toMatch(/process\.env/)
  })

  it('es puro y síncrono: sin async/await, sin I/O, sin fetch', () => {
    expect(MODULE_SOURCE).not.toMatch(/\basync\b|\bawait\b|fetch\(/)
  })

  it('nunca registra actividad ni telemetría', () => {
    expect(MODULE_SOURCE).not.toMatch(/recordActivity|recordMetric|recordExecutionAudit/)
  })
})
