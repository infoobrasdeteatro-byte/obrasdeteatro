import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const MODULE_FILES = [
  'identity-section.ts',
  'subscription-section.ts',
  'professional-profile-section.ts',
  'session-section.ts',
  'context-builder.ts',
]
const MODULE_SOURCE = MODULE_FILES.map((file) => readFileSync(join(__dirname, '..', file), 'utf-8')).join('\n')
const SUBSCRIPTION_SECTION_SOURCE = readFileSync(join(__dirname, '..', 'subscription-section.ts'), 'utf-8')
const PROFILE_SECTION_SOURCE = readFileSync(join(__dirname, '..', 'professional-profile-section.ts'), 'utf-8')

describe('Professional Context Engine — invariantes de integración (SC-004.1, ADR-001)', () => {
  it('nunca accede a Supabase directamente: toda persistencia pasa por Repository Layer', () => {
    expect(MODULE_SOURCE).not.toMatch(/supabase|createClient/i)
    expect(MODULE_SOURCE).toMatch(/from '@\/lib\/repository-layer'/)
  })

  it('no accede al conocimiento del ecosistema (ADR-001): sin import de Knowledge Assets ni del SKM', () => {
    expect(MODULE_SOURCE).not.toMatch(/from '@\/lib\/knowledge-assets'/)
    expect(MODULE_SOURCE).not.toMatch(/knowledge-model|\bskm\b/i)
  })

  it('no importa ningún otro componente del Núcleo ni Servicios de Plataforma ajenos a Repository Layer', () => {
    expect(MODULE_SOURCE).not.toMatch(
      /request-interpreter|decision-engine|credit-manager|ai-gateway|response-composer|accounting-engine/i
    )
  })

  it('la sección Subscription obtiene el dato exclusivamente vía Repository Layer (IA-001 resuelta), nunca accede a Supabase directamente', () => {
    expect(SUBSCRIPTION_SECTION_SOURCE).toMatch(/getSubscription/)
    expect(SUBSCRIPTION_SECTION_SOURCE).not.toMatch(/\.from\(|\.select\(|\.eq\(|\.rpc\(|supabase/i)
  })

  it('la sección Professional Profile nunca consulta tablas de perfil especializado (IA-002 diferida)', () => {
    expect(PROFILE_SECTION_SOURCE).not.toMatch(/perfil_actor|perfil_director|perfil_dramaturgo|getSpecializedProfile/)
  })
})
