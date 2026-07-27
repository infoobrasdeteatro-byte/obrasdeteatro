import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const READ_ONLY_MODULES = [
  'identity.ts',
  'professional-profile.ts',
  'works.ts',
  'organizations.ts',
  'individual-profile.ts',
  'organizational-profile.ts',
]
const READ_ONLY_SOURCE = READ_ONLY_MODULES.map((file) => readFileSync(join(__dirname, '..', file), 'utf-8')).join(
  '\n'
)

const ACCOUNTING_SOURCE = readFileSync(join(__dirname, '..', 'accounting.ts'), 'utf-8')
const ACTIVITY_LOG_SOURCE = readFileSync(join(__dirname, '..', 'activity-log.ts'), 'utf-8')
const TELEMETRY_SOURCE = readFileSync(join(__dirname, '..', 'telemetry.ts'), 'utf-8')
const SUBSCRIPTION_SOURCE = readFileSync(join(__dirname, '..', 'subscription.ts'), 'utf-8')
const INDIVIDUAL_PROFILE_SOURCE = readFileSync(join(__dirname, '..', 'individual-profile.ts'), 'utf-8')
const ORGANIZATIONAL_PROFILE_SOURCE = readFileSync(join(__dirname, '..', 'organizational-profile.ts'), 'utf-8')

const MODULE_SOURCE = [READ_ONLY_SOURCE, ACCOUNTING_SOURCE, ACTIVITY_LOG_SOURCE, TELEMETRY_SOURCE].join('\n')

describe('Repository Layer — invariantes de integración (SC-005.1)', () => {
  it('usa exclusivamente el cliente ya existente de lib/supabase/server, sin instanciar otro', () => {
    expect(MODULE_SOURCE).toMatch(/from '@\/lib\/supabase\/server'/)
    expect(MODULE_SOURCE).not.toMatch(/createServerClient|createBrowserClient|@supabase\/ssr|@supabase\/supabase-js/)
  })

  it('no crea ningún cliente privilegiado (service role)', () => {
    expect(MODULE_SOURCE).not.toMatch(/service[_-]?role/i)
  })

  it('no expone ningún dato del dominio Subscription (Incidencia A)', () => {
    expect(MODULE_SOURCE).not.toMatch(/is_premium|isPremium|subscriptions|stripe/i)
  })
})

describe('Repository Layer — módulos de solo lectura (identity, professional-profile, works, organizations)', () => {
  it('no contienen ninguna operación de escritura ni de RPC', () => {
    expect(READ_ONLY_SOURCE).not.toMatch(/\.insert\(|\.update\(|\.upsert\(|\.delete\(|\.rpc\(/)
  })
})

describe('Repository Layer — accounting.ts (invariante de componente, aprobado 2026-07-16)', () => {
  it('nunca realiza una mutación directa y genérica sobre la tabla (solo operaciones nombradas vía RPC)', () => {
    expect(ACCOUNTING_SOURCE).not.toMatch(/\.insert\(|\.update\(|\.upsert\(|\.delete\(/)
  })

  it('toda escritura pasa por una función RPC nombrada y con contrato propio', () => {
    expect(ACCOUNTING_SOURCE).toMatch(
      /\.rpc\('accounting_verify_and_reserve'|\.rpc\('accounting_settle_reservation'|\.rpc\('accounting_release_reservation'|\.rpc\('accounting_expire_stale_reservations'/
    )
  })
})

describe('Repository Layer — activity-log.ts (invariante de componente, ampliado 2026-07-17)', () => {
  it('expone exactamente una operación de escritura y una de actualización, nombradas y no genéricas -- nunca UPSERT/DELETE/RPC', () => {
    expect(ACTIVITY_LOG_SOURCE).not.toMatch(/\.upsert\(|\.delete\(|\.rpc\(/)
    const insertMatches = ACTIVITY_LOG_SOURCE.match(/\.insert\(/g) ?? []
    const updateMatches = ACTIVITY_LOG_SOURCE.match(/\.update\(/g) ?? []
    expect(insertMatches).toHaveLength(1)
    expect(updateMatches).toHaveLength(1)
  })

  it('toda operación está acotada a nucleo_activity_log', () => {
    const fromMatches = ACTIVITY_LOG_SOURCE.match(/\.from\('([^']+)'\)/g) ?? []
    expect(fromMatches.length).toBeGreaterThan(0)
    for (const match of fromMatches) {
      expect(match).toBe(".from('nucleo_activity_log')")
    }
  })
})

describe('Repository Layer — telemetry.ts (invariante de componente, 2026-07-18)', () => {
  it('expone exactamente una operación de escritura, nombrada y no genérica -- nunca UPDATE/UPSERT/DELETE/RPC (hechos inmutables, sin semántica de cola)', () => {
    expect(TELEMETRY_SOURCE).not.toMatch(/\.update\(|\.upsert\(|\.delete\(|\.rpc\(/)
    const insertMatches = TELEMETRY_SOURCE.match(/\.insert\(/g) ?? []
    expect(insertMatches).toHaveLength(1)
  })

  it('toda operación está acotada a telemetry_metrics', () => {
    const fromMatches = TELEMETRY_SOURCE.match(/\.from\('([^']+)'\)/g) ?? []
    expect(fromMatches.length).toBeGreaterThan(0)
    for (const match of fromMatches) {
      expect(match).toBe(".from('telemetry_metrics')")
    }
  })
})

describe('Repository Layer — subscription.ts (invariante de componente, IA-001 resuelta 2026-07-21)', () => {
  it('es de solo lectura -- nunca insert/update/upsert/delete/rpc', () => {
    expect(SUBSCRIPTION_SOURCE).not.toMatch(/\.insert\(|\.update\(|\.upsert\(|\.delete\(|\.rpc\(/)
  })

  it('toda operación está acotada a subscriptions', () => {
    const fromMatches = SUBSCRIPTION_SOURCE.match(/\.from\('([^']+)'\)/g) ?? []
    expect(fromMatches.length).toBeGreaterThan(0)
    for (const match of fromMatches) {
      expect(match).toBe(".from('subscriptions')")
    }
  })

  it('es el único módulo autorizado a exponer datos del dominio Subscription', () => {
    expect(READ_ONLY_SOURCE).not.toMatch(/subscriptions|stripe/i)
  })
})

describe('Repository Layer — individual-profile.ts y organizational-profile.ts (invariante de componente, IA-002 resuelta 2026-07-22)', () => {
  it('ambos son de solo lectura -- nunca insert/update/upsert/delete/rpc', () => {
    expect(INDIVIDUAL_PROFILE_SOURCE).not.toMatch(/\.insert\(|\.update\(|\.upsert\(|\.delete\(|\.rpc\(/)
    expect(ORGANIZATIONAL_PROFILE_SOURCE).not.toMatch(/\.insert\(|\.update\(|\.upsert\(|\.delete\(|\.rpc\(/)
  })

  it('nunca usan select(\'*\'): mismo defecto que origino RA-001/IA-002, no debe reintroducirse', () => {
    expect(INDIVIDUAL_PROFILE_SOURCE).not.toMatch(/\.select\('\*'\)/)
    expect(ORGANIZATIONAL_PROFILE_SOURCE).not.toMatch(/\.select\('\*'\)/)
  })

  it('individual-profile.ts solo consulta las tablas perfil_actor/perfil_director/perfil_dramaturgo', () => {
    expect(INDIVIDUAL_PROFILE_SOURCE).toMatch(/\.from\(TABLE_BY_TYPE\[profileType\]\)/)
    expect(INDIVIDUAL_PROFILE_SOURCE).toMatch(/perfil_actor/)
    expect(INDIVIDUAL_PROFILE_SOURCE).toMatch(/perfil_director/)
    expect(INDIVIDUAL_PROFILE_SOURCE).toMatch(/perfil_dramaturgo/)
    expect(INDIVIDUAL_PROFILE_SOURCE).not.toMatch(/perfil_compania|perfil_productora|perfil_teatro|perfil_festival|perfil_escuela/)
  })

  it('organizational-profile.ts solo consulta las 5 tablas organizacionales', () => {
    expect(ORGANIZATIONAL_PROFILE_SOURCE).toMatch(/perfil_compania/)
    expect(ORGANIZATIONAL_PROFILE_SOURCE).toMatch(/perfil_productora/)
    expect(ORGANIZATIONAL_PROFILE_SOURCE).toMatch(/perfil_teatro/)
    expect(ORGANIZATIONAL_PROFILE_SOURCE).toMatch(/perfil_festival/)
    expect(ORGANIZATIONAL_PROFILE_SOURCE).toMatch(/perfil_escuela/)
    expect(ORGANIZATIONAL_PROFILE_SOURCE).not.toMatch(/perfil_actor|perfil_director|perfil_dramaturgo/)
  })

  it('nunca exponen nif_cif (identificador administrativo/fiscal excluido por la Decisión de Dirección)', () => {
    expect(INDIVIDUAL_PROFILE_SOURCE).not.toMatch(/nif_cif/)
    expect(ORGANIZATIONAL_PROFILE_SOURCE).not.toMatch(/nif_cif/)
  })

  it('ningún dato de contacto se expone sin comprobar antes su mostrar_* correspondiente', () => {
    expect(INDIVIDUAL_PROFILE_SOURCE).toMatch(/mostrar_email/)
    expect(INDIVIDUAL_PROFILE_SOURCE).toMatch(/mostrar_telefono/)
    expect(INDIVIDUAL_PROFILE_SOURCE).toMatch(/mostrar_redes/)
    expect(ORGANIZATIONAL_PROFILE_SOURCE).toMatch(/mostrar_contacto/)
  })
})
