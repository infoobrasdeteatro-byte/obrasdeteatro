import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const MODULE_FILES = [
  'needs-ai.ts',
  'priority.ts',
  'confidence.ts',
  'estimated-cost.ts',
  'recommended-provider.ts',
  'rationale.ts',
  'decision-context-builder.ts',
]
const MODULE_SOURCE = MODULE_FILES.map((file) => readFileSync(join(__dirname, '..', file), 'utf-8')).join('\n')
const RECOMMENDED_PROVIDER_SOURCE = readFileSync(join(__dirname, '..', 'recommended-provider.ts'), 'utf-8')

describe('Decision Engine — invariantes de integración (SC-004.2)', () => {
  it('nunca accede a Supabase directamente', () => {
    expect(MODULE_SOURCE).not.toMatch(/supabase|createClient/i)
  })

  it('no accede directamente al PCE, al SKM ni a Request Interpreter: solo consume sus tipos, nunca invoca sus constructores', () => {
    expect(MODULE_SOURCE).not.toMatch(/buildProfessionalContext|buildKnowledgeContext|normalizeRequest/)
  })

  it('no importa ningún otro componente del Núcleo todavía no construido', () => {
    expect(MODULE_SOURCE).not.toMatch(/credit-manager|ai-gateway|response-composer|accounting-engine/i)
  })

  it('es puro y síncrono: sin async/await, sin I/O', () => {
    expect(MODULE_SOURCE).not.toMatch(/\basync\b|\bawait\b/)
  })

  it('no ejecuta IA: sin SDK de proveedores ni llamadas de red', () => {
    expect(MODULE_SOURCE).not.toMatch(/openai|anthropic|fetch\(|axios/i)
  })

  it('selecciona recommendedProvider exclusivamente desde el catalogo oficial (IA-006), sin proveedor hardcodeado', () => {
    expect(RECOMMENDED_PROVIDER_SOURCE).toMatch(/from '@\/lib\/provider-catalog'/)
    expect(RECOMMENDED_PROVIDER_SOURCE).not.toMatch(/'claude'|'openai'|'gpt-|anthropic-ai|@anthropic-ai|openai\//i)
  })
})
