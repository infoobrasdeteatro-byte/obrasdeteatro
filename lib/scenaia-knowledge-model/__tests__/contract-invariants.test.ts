import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

// Todos los archivos del modulo, sin excepcion. Antes quedaban fuera
// `types.ts`, `unfiltered-note.ts` e `index.ts`: un import prohibido en
// cualquiera de ellos habria pasado inadvertido. Ampliado por autorizacion
// expresa de Direccion (Fase 3).
const MODULE_FILES = [
  'domain-coverage.ts',
  'retrieve-knowledge.ts',
  'summary.ts',
  'knowledge-context-builder.ts',
  'types.ts',
  'unfiltered-note.ts',
  'index.ts',
]

/**
 * Contratos que este modulo puede importar. LISTA BLANCA, no lista negra.
 *
 * La comprobacion anterior enumeraba seis nombres prohibidos, de modo que
 * cualquier modulo cuyo nombre no figurase en esa lista -- incluido uno
 * creado despues -- entraba sin resistencia. El invariante declaraba una
 * frontera y comprobaba otra cosa. Sustituido por autorizacion expresa de
 * Direccion (Fase 3): endurecimiento del invariante existente, sin ampliar
 * ningun permiso.
 */
const AUTHORIZED_IMPORTS = [
  // Toda recuperacion de conocimiento pasa por aqui (Decision de Direccion, Punto 4).
  "from '@/lib/knowledge-assets'",
  // Entrada declarada del componente: solo TIPOS, nunca sus constructores.
  "from '@/lib/request-interpreter'",
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

  it('depende exclusivamente de los contratos autorizados: cualquier otro import falla, se llame como se llame', () => {
    const importLines = MODULE_SOURCE.match(/from '@\/lib\/[^']+'/g) ?? []

    expect(importLines.length).toBeGreaterThan(0)
    for (const importLine of importLines) {
      expect(AUTHORIZED_IMPORTS, importLine).toContain(importLine)
    }
  })

  it('la frontera rechaza un modulo NO autorizado aunque ningun nombre prohibido lo mencione', () => {
    // Demostracion de que la lista blanca cumple lo que la lista negra
    // anterior no podia: `conversation-state` no figuraba en ningun nombre
    // prohibido y habria entrado sin que ninguna prueba fallara.
    const importsFicticios = [
      "from '@/lib/conversation-state'",
      "from '@/lib/repository-layer'",
      "from '@/lib/telemetria'",
    ]

    for (const importLine of importsFicticios) {
      expect(AUTHORIZED_IMPORTS, importLine).not.toContain(importLine)
    }
  })

  it('sigue sin importar ningun componente del Nucleo (comprobacion nominal, ahora redundante y deliberadamente conservada)', () => {
    expect(MODULE_SOURCE).not.toMatch(
      /professional-context-engine|decision-engine|credit-manager|ai-gateway|response-composer|accounting-engine/i
    )
  })

  it('no expone identidad, autenticación, ni estado de suscripción (restricciones recíprocas con ADR-001)', () => {
    expect(MODULE_SOURCE).not.toMatch(/authenticationStatus|profileType|is_premium|isPremium|stripe/i)
  })
})
