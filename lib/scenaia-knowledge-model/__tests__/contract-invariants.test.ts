import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const MODULE_FILES = [
  'domain-coverage.ts',
  'retrieve-knowledge.ts',
  'summary.ts',
  'knowledge-context-builder.ts',
]
const MODULE_SOURCE = MODULE_FILES.map((file) => readFileSync(join(__dirname, '..', file), 'utf-8')).join('\n')

describe('ScenaIA Knowledge Model — invariantes de integración (SC-002, SC-004.3)', () => {
  it('nunca accede a Supabase directamente', () => {
    expect(MODULE_SOURCE).not.toMatch(/supabase|createClient/i)
  })

  it('nunca es consumidor directo de Repository Layer: todo su acceso pasa por Knowledge Assets', () => {
    expect(MODULE_SOURCE).not.toMatch(/from '@\/lib\/repository-layer'/)
    expect(MODULE_SOURCE).toMatch(/from '@\/lib\/knowledge-assets'/)
  })

  it('no importa ningún otro componente del Núcleo (solo tipos de Request Interpreter como entrada declarada)', () => {
    expect(MODULE_SOURCE).not.toMatch(
      /professional-context-engine|decision-engine|credit-manager|ai-gateway|response-composer|accounting-engine/i
    )
  })

  it('no expone identidad, autenticación, ni estado de suscripción (restricciones recíprocas con ADR-001)', () => {
    expect(MODULE_SOURCE).not.toMatch(/authenticationStatus|profileType|is_premium|isPremium|stripe/i)
  })
})
