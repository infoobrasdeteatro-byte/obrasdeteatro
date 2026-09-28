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
  // SCENAIA-004: el listado puro tambien queda bajo la frontera vigilada.
  'plain-listing.ts',
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

describe('Decision Engine — continuación del listado (SCENAIA-004B §4.5, PR 2)', () => {
  const NEEDS_AI = readFileSync(join(__dirname, '..', 'needs-ai.ts'), 'utf-8')
  const PLAIN_LISTING = readFileSync(join(__dirname, '..', 'plain-listing.ts'), 'utf-8')

  it('la continuación se comprueba ANTES que cualquier señal del conocimiento: ninguna puede convertirla en IA', () => {
    const cuerpo = NEEDS_AI.slice(NEEDS_AI.indexOf('export function needsAI'))
    const continuacion = cuerpo.indexOf('if (listingContinuation) return false')
    expect(continuacion).toBeGreaterThan(-1)
    expect(continuacion).toBeLessThan(cuerpo.indexOf("if (knowledgeCompleteness !== 'completo')"))
    expect(continuacion).toBeLessThan(cuerpo.indexOf('if (plainListing)'))
  })

  it('la continuación se lee solo de worksPage.offset, sin interpretar texto', () => {
    const regla = PLAIN_LISTING.slice(PLAIN_LISTING.indexOf('export function isListingContinuation'))
    expect(regla).toMatch(/worksPage\?\.offset/)
    expect(regla).not.toMatch(/normalizedRequest|originalRequest|retrievalQuery/)
  })
})
